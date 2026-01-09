import { Injectable, NotFoundException, BadRequestException, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { Parcel, ParcelStatus } from '../entities/parcel.entity';
import { CustomAddress, AddressStatus } from '../entities/custom-address.entity';
import { ParcelStatusHistory } from '../entities/parcel-status-history.entity';
import { ParcelCategory } from '../entities/parcel-category.entity';
import { CreateParcelDto } from './dto/create-parcel.dto';
import { UpdateParcelStatusDto } from './dto/update-parcel-status.dto';
import { AuditLogService } from '../audit/audit-log.service';
import { NotificationService } from '../notification/notification.service';
import { BillingService } from '../billing/billing.service';

/**
 * Service de gestion des colis
 * Gère la création, le suivi et les changements de statut
 */
@Injectable()
export class ParcelService {
    private readonly logger = new Logger(ParcelService.name);

    // Workflow des statuts autorisés
    private readonly STATUS_TRANSITIONS: Record<ParcelStatus, ParcelStatus[]> = {
        [ParcelStatus.PENDING]: [ParcelStatus.RECEIVED, ParcelStatus.CANCELLED],
        [ParcelStatus.RECEIVED]: [ParcelStatus.PROCESSING, ParcelStatus.CANCELLED],
        [ParcelStatus.PROCESSING]: [ParcelStatus.READY, ParcelStatus.EXCEPTION],
        [ParcelStatus.READY]: [ParcelStatus.SHIPPED, ParcelStatus.EXCEPTION],
        [ParcelStatus.SHIPPED]: [ParcelStatus.IN_TRANSIT, ParcelStatus.EXCEPTION],
        [ParcelStatus.IN_TRANSIT]: [ParcelStatus.CUSTOMS, ParcelStatus.OUT_FOR_DELIVERY, ParcelStatus.EXCEPTION],
        [ParcelStatus.CUSTOMS]: [ParcelStatus.OUT_FOR_DELIVERY, ParcelStatus.EXCEPTION],
        [ParcelStatus.OUT_FOR_DELIVERY]: [ParcelStatus.DELIVERED, ParcelStatus.EXCEPTION],
        [ParcelStatus.DELIVERED]: [],
        [ParcelStatus.EXCEPTION]: [ParcelStatus.PROCESSING, ParcelStatus.RETURNED, ParcelStatus.CANCELLED],
        [ParcelStatus.RETURNED]: [],
        [ParcelStatus.CANCELLED]: [],
    };

    constructor(
        @InjectRepository(Parcel)
        private parcelRepository: Repository<Parcel>,

        @InjectRepository(CustomAddress)
        private addressRepository: Repository<CustomAddress>,

        @InjectRepository(ParcelCategory)
        private categoryRepository: Repository<ParcelCategory>,

        @InjectRepository(ParcelStatusHistory)
        private statusHistoryRepository: Repository<ParcelStatusHistory>,

        private dataSource: DataSource,
        private auditLogService: AuditLogService,
        private notificationService: NotificationService,
        private billingService: BillingService,
    ) { }

    /**
     * Crée un nouveau colis
     * - Identifie automatiquement le client via le code d'adresse
     * - Génère un numéro de tracking unique
     * - Enregistre dans l'historique
     */
    async createParcel(dto: CreateParcelDto, createdBy: string): Promise<Parcel> {
        this.logger.log(`Creating parcel for address: ${dto.addressCode}`);

        return await this.dataSource.transaction(async (manager) => {
            // 1. Identifier le client via le code d'adresse
            const address = await manager.findOne(CustomAddress, {
                where: { addressCode: dto.addressCode, status: AddressStatus.ACTIVE },
                relations: ['user'],
            });

            if (!address) {
                throw new NotFoundException(
                    `Address ${dto.addressCode} not found or inactive`
                );
            }

            // 2. Vérifier la catégorie
            let category = null;
            if (dto.categoryId) {
                category = await manager.findOne(ParcelCategory, {
                    where: { id: dto.categoryId, isActive: true },
                });

                if (!category) {
                    throw new NotFoundException(`Category ${dto.categoryId} not found`);
                }
            }

            // 3. Générer le numéro de tracking
            const trackingNumber = await this.generateTrackingNumber();

            // 4. Créer le colis
            const parcel = manager.create(Parcel, {
                trackingNumber,
                userId: address.userId,
                customAddressId: address.id,
                categoryId: dto.categoryId,
                carrier: dto.carrier,
                carrierTrackingNumber: dto.carrierTrackingNumber,
                description: dto.description,
                weight: dto.weight,
                length: dto.length,
                width: dto.width,
                height: dto.height,
                declaredValue: dto.declaredValue,
                status: ParcelStatus.RECEIVED,
                warehouse: dto.warehouse || 'MIA',
                currentLocation: 'Miami Warehouse',
                receivedAt: new Date(),
                notes: dto.notes,
                internalNotes: dto.internalNotes,
            });

            const savedParcel = await manager.save(Parcel, parcel);

            // 5. Créer l'entrée d'historique
            await manager.save(ParcelStatusHistory, {
                parcelId: savedParcel.id,
                oldStatus: null,
                newStatus: ParcelStatus.RECEIVED,
                location: 'Miami Warehouse',
                description: 'Colis reçu à l\'entrepôt USA',
                changedBy: createdBy,
                source: 'INTERNAL',
            });

            // 6. Logger l'action
            await this.auditLogService.log({
                userId: createdBy,
                action: 'CREATE',
                resource: 'parcels',
                resourceId: savedParcel.id,
                description: `Created parcel ${trackingNumber} for ${address.addressCode}`,
            });

            // 7. Notifier le client
            await this.notificationService.notifyParcelReceived(
                address.userId,
                savedParcel
            );

            this.logger.log(`Parcel created: ${trackingNumber}`);

            return savedParcel;
        });
    }

    /**
     * Génère un numéro de tracking unique
     * Format: PKG-YYYY-XXXXXX
     */
    private async generateTrackingNumber(): Promise<string> {
        const year = new Date().getFullYear();
        const prefix = `PKG-${year}-`;

        // Trouver le dernier numéro
        const lastParcel = await this.parcelRepository
            .createQueryBuilder('parcel')
            .where('parcel.tracking_number LIKE :prefix', { prefix: `${prefix}%` })
            .orderBy('parcel.created_at', 'DESC')
            .getOne();

        let sequence = 1;
        if (lastParcel) {
            const lastNumber = lastParcel.trackingNumber.split('-')[2];
            sequence = parseInt(lastNumber, 10) + 1;
        }

        return `${prefix}${sequence.toString().padStart(6, '0')}`;
    }

    /**
     * Met à jour le statut d'un colis
     * Valide les transitions autorisées
     */
    async updateStatus(
        parcelId: string,
        dto: UpdateParcelStatusDto,
        changedBy: string
    ): Promise<Parcel> {
        this.logger.log(`Updating parcel ${parcelId} status to ${dto.newStatus}`);

        return await this.dataSource.transaction(async (manager) => {
            // 1. Récupérer le colis
            const parcel = await manager.findOne(Parcel, {
                where: { id: parcelId },
                relations: ['user', 'customAddress'],
            });

            if (!parcel) {
                throw new NotFoundException(`Parcel ${parcelId} not found`);
            }

            // 2. Valider la transition
            this.validateStatusTransition(parcel.status, dto.newStatus);

            const oldStatus = parcel.status;

            // 3. Mettre à jour le colis
            parcel.status = dto.newStatus;
            parcel.currentLocation = dto.location || parcel.currentLocation;

            if (dto.newStatus === ParcelStatus.SHIPPED && !parcel.shippedAt) {
                parcel.shippedAt = new Date();
            }

            if (dto.newStatus === ParcelStatus.DELIVERED && !parcel.deliveredAt) {
                parcel.deliveredAt = new Date();
            }

            const updatedParcel = await manager.save(Parcel, parcel);

            // 4. Créer l'entrée d'historique
            await manager.save(ParcelStatusHistory, {
                parcelId: parcel.id,
                oldStatus,
                newStatus: dto.newStatus,
                location: dto.location,
                description: dto.description,
                changedBy,
                source: 'INTERNAL',
                metadata: dto.metadata,
            });

            // 5. Logger l'action
            await this.auditLogService.log({
                userId: changedBy,
                action: 'STATUS_CHANGE',
                resource: 'parcels',
                resourceId: parcel.id,
                description: `Changed status from ${oldStatus} to ${dto.newStatus}`,
                changes: { oldStatus, newStatus: dto.newStatus },
            });

            // 6. Notifier le client
            await this.notificationService.notifyStatusChange(
                parcel.userId,
                updatedParcel,
                oldStatus,
                dto.newStatus
            );

            // 7. Générer automatiquement une facture dès que le colis est RECEIVED
            if (dto.newStatus === ParcelStatus.RECEIVED && oldStatus !== ParcelStatus.RECEIVED) {
                try {
                    this.logger.log(`Auto-generating invoice for parcel ${parcel.trackingNumber}`);
                    await this.billingService.generateInvoiceForParcels(
                        parcel.userId,
                        [parcel.id]
                    );
                    this.logger.log(`Invoice auto-generated for parcel ${parcel.trackingNumber}`);
                } catch (error) {
                    this.logger.error(`Failed to auto-generate invoice for parcel ${parcel.trackingNumber}:`, error);
                    // Ne pas bloquer le changement de statut si la facturation échoue
                }
            }

            this.logger.log(`Parcel ${parcel.trackingNumber} status updated`);

            return updatedParcel;
        });
    }

    /**
     * Valide qu'une transition de statut est autorisée
     */
    private validateStatusTransition(
        currentStatus: ParcelStatus,
        newStatus: ParcelStatus
    ): void {
        const allowedTransitions = this.STATUS_TRANSITIONS[currentStatus];

        if (!allowedTransitions.includes(newStatus)) {
            throw new BadRequestException(
                `Invalid status transition from ${currentStatus} to ${newStatus}. ` +
                `Allowed transitions: ${allowedTransitions.join(', ')}`
            );
        }
    }

    /**
     * Recherche un colis par numéro de tracking
     */
    async findByTrackingNumber(trackingNumber: string): Promise<Parcel> {
        const parcel = await this.parcelRepository.findOne({
            where: { trackingNumber },
            relations: ['user', 'customAddress', 'category', 'statusHistory'],
        });

        if (!parcel) {
            throw new NotFoundException(
                `Parcel with tracking number ${trackingNumber} not found`
            );
        }

        return parcel;
    }

    /**
     * Recherche un colis par ID
     */
    async findById(id: string): Promise<Parcel> {
        const parcel = await this.parcelRepository.findOne({
            where: { id },
            relations: ['user', 'customAddress', 'category'],
        });

        if (!parcel) {
            throw new NotFoundException(`Parcel with ID ${id} not found`);
        }

        return parcel;
    }

    /**
     * Récupère tous les colis d'un client
     */
    async findByUser(userId: string): Promise<Parcel[]> {
        return await this.parcelRepository.find({
            where: { userId },
            relations: ['customAddress', 'category'],
            order: { createdAt: 'DESC' },
        });
    }

    /**
     * Récupère l'historique complet d'un colis
     */
    async getStatusHistory(parcelId: string): Promise<ParcelStatusHistory[]> {
        return await this.statusHistoryRepository.find({
            where: { parcelId },
            relations: ['changedByUser'],
            order: { createdAt: 'ASC' },
        });
    }

    /**
     * Récupère les colis par statut
     */
    async findByStatus(status: ParcelStatus): Promise<Parcel[]> {
        return await this.parcelRepository.find({
            where: { status },
            relations: ['user', 'customAddress', 'category'],
            order: { createdAt: 'DESC' },
        });
    }

    /**
     * Recherche de colis avec filtres
     */
    async search(filters: {
        status?: ParcelStatus;
        warehouse?: string;
        userId?: string;
        addressCode?: string;
        startDate?: Date;
        endDate?: Date;
    }): Promise<Parcel[]> {
        const query = this.parcelRepository
            .createQueryBuilder('parcel')
            .leftJoinAndSelect('parcel.user', 'user')
            .leftJoinAndSelect('parcel.customAddress', 'address')
            .leftJoinAndSelect('parcel.category', 'category');

        if (filters.status) {
            query.andWhere('parcel.status = :status', { status: filters.status });
        }

        if (filters.warehouse) {
            query.andWhere('parcel.warehouse = :warehouse', {
                warehouse: filters.warehouse,
            });
        }

        if (filters.userId) {
            query.andWhere('parcel.userId = :userId', { userId: filters.userId });
        }

        if (filters.addressCode) {
            query.andWhere('address.addressCode = :addressCode', {
                addressCode: filters.addressCode,
            });
        }

        if (filters.startDate) {
            query.andWhere('parcel.createdAt >= :startDate', {
                startDate: filters.startDate,
            });
        }

        if (filters.endDate) {
            query.andWhere('parcel.createdAt <= :endDate', {
                endDate: filters.endDate,
            });
        }

        return await query.orderBy('parcel.createdAt', 'DESC').getMany();
    }

    /**
     * Met à jour les informations d'un colis
     */
    async update(parcelId: string, updates: Partial<Parcel>): Promise<Parcel> {
        const parcel = await this.parcelRepository.findOne({
            where: { id: parcelId },
        });

        if (!parcel) {
            throw new NotFoundException(`Parcel ${parcelId} not found`);
        }

        // Ne pas permettre la modification du statut via cette méthode
        delete updates.status;
        delete updates.trackingNumber;
        delete updates.userId;

        Object.assign(parcel, updates);

        return await this.parcelRepository.save(parcel);
    }

    /**
     * Vérifie si un colis est prêt pour retrait
     */
    async checkReadyForPickup(trackingNumber: string): Promise<any> {
        const parcel = await this.parcelRepository.findOne({
            where: { trackingNumber },
            relations: ['user', 'category'],
        });

        if (!parcel) {
            throw new NotFoundException(`Parcel ${trackingNumber} not found`);
        }

        // Vérifier le statut du colis
        const isAvailable = parcel.status === ParcelStatus.READY;

        // Chercher la facture associée
        const invoice = await this.dataSource.query(
            `
      SELECT i.*, 
             COALESCE(SUM(p.amount), 0) as total_paid
      FROM invoices i
      LEFT JOIN invoice_items ii ON i.id = ii.invoice_id
      LEFT JOIN payments p ON i.id = p.invoice_id AND p.status = 'COMPLETED'
      WHERE ii.parcel_id = $1
      GROUP BY i.id
      ORDER BY i.created_at DESC
      LIMIT 1
      `,
            [parcel.id],
        );

        const hasInvoice = invoice && invoice.length > 0;
        const isPaid = hasInvoice && invoice[0].status === 'PAID';
        const totalPaid = hasInvoice ? parseFloat(invoice[0].total_paid) : 0;
        const totalDue = hasInvoice ? parseFloat(invoice[0].total) : 0;

        return {
            parcel: {
                id: parcel.id,
                trackingNumber: parcel.trackingNumber,
                description: parcel.description,
                weight: parcel.weight,
                status: parcel.status,
            },
            user: {
                id: parcel.user.id,
                email: parcel.user.email,
                firstName: parcel.user.firstName,
                lastName: parcel.user.lastName,
            },
            invoice: hasInvoice ? {
                id: invoice[0].id,
                invoiceNumber: invoice[0].invoice_number,
                total: totalDue,
                totalPaid: totalPaid,
                status: invoice[0].status,
            } : null,
            readyForPickup: isAvailable && isPaid,
            canPickup: isAvailable && isPaid,
            blockers: [
                ...(!isAvailable ? ['Parcel status is not DISPONIBLE'] : []),
                ...(!isPaid ? ['Invoice not paid'] : []),
                ...(!hasInvoice ? ['No invoice found'] : []),
            ],
        };
    }

    /**
     * Récupère les statistiques des colis
     */
    async getStatistics(): Promise<any> {
        const [
            total,
            pending,
            processing,
            received,
            inTransit,
            shipped,
            ready,
            delivered,
            exception,
            cancelled,
        ] = await Promise.all([
            this.parcelRepository.count(),
            this.parcelRepository.count({ where: { status: ParcelStatus.PENDING } }),
            this.parcelRepository.count({ where: { status: ParcelStatus.PROCESSING } }),
            this.parcelRepository.count({ where: { status: ParcelStatus.RECEIVED } }),
            this.parcelRepository.count({ where: { status: ParcelStatus.IN_TRANSIT } }),
            this.parcelRepository.count({ where: { status: ParcelStatus.SHIPPED } }),
            this.parcelRepository.count({ where: { status: ParcelStatus.READY } }),
            this.parcelRepository.count({ where: { status: ParcelStatus.DELIVERED } }),
            this.parcelRepository.count({ where: { status: ParcelStatus.EXCEPTION } }),
            this.parcelRepository.count({ where: { status: ParcelStatus.CANCELLED } }),
        ]);

        return {
            total,
            byStatus: {
                PENDING: pending,
                PROCESSING: processing,
                RECEIVED: received,
                IN_TRANSIT: inTransit,
                SHIPPED: shipped,
                READY: ready,
                DELIVERED: delivered,
                EXCEPTION: exception,
                CANCELLED: cancelled,
            },
        };
    }
}
