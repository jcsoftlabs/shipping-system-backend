import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource, EntityManager } from 'typeorm';
import { Invoice, InvoiceStatus } from '../entities/invoice.entity';
import { InvoiceItem } from '../entities/invoice-item.entity';
import { Payment, PaymentStatus, PaymentMethod } from '../entities/payment.entity';
import { Parcel, ParcelStatus } from '../entities/parcel.entity';
import { ParcelCategory } from '../entities/parcel-category.entity';
import { ParcelStatusHistory } from '../entities/parcel-status-history.entity';

@Injectable()
export class BillingService {
    private readonly logger = new Logger(BillingService.name);

    constructor(
        @InjectRepository(Invoice)
        private invoiceRepository: Repository<Invoice>,

        @InjectRepository(InvoiceItem)
        private invoiceItemRepository: Repository<InvoiceItem>,

        @InjectRepository(Payment)
        private paymentRepository: Repository<Payment>,

        @InjectRepository(Parcel)
        private parcelRepository: Repository<Parcel>,

        @InjectRepository(ParcelCategory)
        private categoryRepository: Repository<ParcelCategory>,

        @InjectRepository(ParcelStatusHistory)
        private parcelHistoryRepository: Repository<ParcelStatusHistory>,

        private dataSource: DataSource,
    ) { }

    /**
     * Génère une facture pour un ou plusieurs colis
     */
    async generateInvoiceForParcels(
        userId: string,
        parcelIds: string[],
    ): Promise<Invoice> {
        this.logger.log(`Generating invoice for user ${userId} with ${parcelIds.length} parcels`);

        return await this.dataSource.transaction(async (manager) => {
            // 1. Récupérer les colis
            const parcels = await manager.find(Parcel, {
                where: parcelIds.map(id => ({ id, userId })),
                relations: ['category'],
            });

            if (parcels.length === 0) {
                throw new NotFoundException('No parcels found');
            }

            // 2. Calculer les frais pour chaque colis
            let subtotal = 0;
            const items: Partial<InvoiceItem>[] = [];

            for (const parcel of parcels) {
                const cost = await this.calculateParcelCost(parcel);
                subtotal += cost;

                items.push({
                    parcelId: parcel.id,
                    description: `Shipping - ${parcel.description || 'Parcel'} (${parcel.weight} lbs)`,
                    quantity: 1,
                    unitPrice: cost,
                    total: cost,
                });
            }

            // 3. Calculer taxes et frais
            const tax = 0; // Pas de taxe pour l'instant
            const fees = 5.00; // Frais de traitement fixes
            const total = subtotal + tax + fees;

            // 4. Générer le numéro de facture
            const invoiceNumber = await this.generateInvoiceNumber();

            // 5. Créer la facture
            const invoice = manager.create(Invoice, {
                invoiceNumber,
                userId,
                subtotal,
                tax,
                fees,
                total,
                status: InvoiceStatus.PENDING,
                dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 jours
            });

            const savedInvoice = await manager.save(Invoice, invoice);

            // 6. Créer les lignes de facture
            for (const itemData of items) {
                const item = manager.create(InvoiceItem, {
                    ...itemData,
                    invoiceId: savedInvoice.id,
                });
                await manager.save(InvoiceItem, item);
            }

            this.logger.log(`Invoice ${invoiceNumber} generated: $${total}`);

            return savedInvoice;
        });
    }

    /**
     * Calcule le coût d'un colis
     */
    private async calculateParcelCost(parcel: Parcel): Promise<number> {
        const weight = parcel.weight || 0;

        // Si le colis a une catégorie avec tarifs
        if (parcel.category) {
            const baseRate = parcel.category.baseRate || 10;
            const perPoundRate = parcel.category.perPoundRate || 2;
            return baseRate + (weight * perPoundRate);
        }

        // Tarif par défaut
        const baseRate = 10.00;
        const perPoundRate = 2.00;
        return baseRate + (weight * perPoundRate);
    }

    /**
     * Génère un numéro de facture unique
     */
    private async generateInvoiceNumber(): Promise<string> {
        const year = new Date().getFullYear();
        const prefix = `INV-${year}-`;

        const lastInvoice = await this.invoiceRepository
            .createQueryBuilder('invoice')
            .where('invoice.invoice_number LIKE :prefix', { prefix: `${prefix}%` })
            .orderBy('invoice.created_at', 'DESC')
            .getOne();

        let sequence = 1;
        if (lastInvoice) {
            const lastNumber = lastInvoice.invoiceNumber.split('-')[2];
            sequence = parseInt(lastNumber, 10) + 1;
        }

        return `${prefix}${sequence.toString().padStart(6, '0')}`;
    }

    /**
     * Enregistre un paiement
     */
    async recordPayment(
        invoiceId: string,
        amount: number,
        method: PaymentMethod,
        transactionId?: string,
    ): Promise<Payment> {
        this.logger.log(`Recording payment for invoice ${invoiceId}: $${amount}`);

        return await this.dataSource.transaction(async (manager) => {
            // 1. Récupérer la facture
            const invoice = await manager.findOne(Invoice, {
                where: { id: invoiceId },
            });

            if (!invoice) {
                throw new NotFoundException(`Invoice ${invoiceId} not found`);
            }

            // 2. Créer le paiement
            const payment = manager.create(Payment, {
                invoiceId,
                userId: invoice.userId,
                amount,
                method,
                status: PaymentStatus.COMPLETED,
                transactionId,
                processedAt: new Date(),
            });

            const savedPayment = await manager.save(Payment, payment);

            // 3. Mettre à jour le statut de la facture
            invoice.status = InvoiceStatus.PAID;
            invoice.paidAt = new Date();
            await manager.save(Invoice, invoice);

            // 4. Mettre à jour le statut des colis associés
            const invoiceItems = await manager.find(InvoiceItem, {
                where: { invoiceId },
                relations: ['parcel'],
            });

            for (const item of invoiceItems) {
                if (item.parcel) {
                    await this.updateParcelStatusAfterPayment(manager, item.parcel);
                }
            }

            this.logger.log(`Payment recorded for invoice ${invoice.invoiceNumber}`);

            return savedPayment;
        });
    }

    /**
     * Met à jour le statut d'un colis après paiement
     */
    private async updateParcelStatusAfterPayment(
        manager: EntityManager,
        parcel: Parcel,
    ): Promise<void> {
        let newStatus: ParcelStatus | null = null;
        let notes = '';

        // Déterminer le nouveau statut basé sur le statut actuel
        switch (parcel.status) {
            case ParcelStatus.CUSTOMS:
                newStatus = ParcelStatus.OUT_FOR_DELIVERY;
                notes = 'Colis dédouané et prêt pour livraison suite au paiement';
                break;
            case ParcelStatus.READY:
                newStatus = ParcelStatus.SHIPPED;
                notes = 'Colis expédié suite au paiement';
                break;
            // Pour les autres statuts, pas de changement automatique
            default:
                this.logger.log(
                    `Parcel ${parcel.trackingNumber} status ${parcel.status} - no automatic update on payment`
                );
                return;
        }

        if (newStatus) {
            const oldStatus = parcel.status;
            parcel.status = newStatus;
            await manager.save(Parcel, parcel);

            // Créer une entrée dans l'historique
            const history = manager.create(ParcelStatusHistory, {
                parcelId: parcel.id,
                status: newStatus,
                location: parcel.currentLocation || 'System',
                notes,
            });
            await manager.save(ParcelStatusHistory, history);

            this.logger.log(
                `Parcel ${parcel.trackingNumber} status updated: ${oldStatus} → ${newStatus} (payment completed)`
            );
        }
    }

    /**
     * Récupère les factures d'un utilisateur
     */
    async getUserInvoices(userId: string): Promise<Invoice[]> {
        return await this.invoiceRepository.find({
            where: { userId },
            relations: ['items', 'items.parcel', 'payments'],
            order: { createdAt: 'DESC' },
        });
    }

    /**
     * Récupère une facture par son ID
     */
    async getInvoiceById(invoiceId: string): Promise<Invoice> {
        const invoice = await this.invoiceRepository.findOne({
            where: { id: invoiceId },
            relations: ['items', 'items.parcel', 'payments', 'user'],
        });

        if (!invoice) {
            throw new NotFoundException(`Invoice ${invoiceId} not found`);
        }
        return invoice;
    }

    /**
     * Récupère les factures impayées
     */
    async getUnpaidInvoices(): Promise<Invoice[]> {
        return await this.invoiceRepository.find({
            where: { status: InvoiceStatus.PENDING },
            relations: ['user', 'items', 'items.parcel'],
            order: { dueDate: 'ASC' },
        });
    }

    /**
     * Récupère les paiements cash avec filtres de date
     */
    async getCashPayments(
        date?: string,
        startDate?: string,
        endDate?: string,
    ): Promise<Payment[]> {
        const query = this.paymentRepository
            .createQueryBuilder('payment')
            .leftJoinAndSelect('payment.invoice', 'invoice')
            .leftJoinAndSelect('payment.user', 'user')
            .where('payment.method = :method', { method: PaymentMethod.CASH })
            .orderBy('payment.processedAt', 'DESC');

        // Filtre par date exacte
        if (date) {
            const startOfDay = new Date(date);
            startOfDay.setHours(0, 0, 0, 0);
            const endOfDay = new Date(date);
            endOfDay.setHours(23, 59, 59, 999);

            query.andWhere('payment.processedAt BETWEEN :start AND :end', {
                start: startOfDay,
                end: endOfDay,
            });
        }
        // Filtre par plage de dates
        else if (startDate && endDate) {
            query.andWhere('payment.processedAt BETWEEN :start AND :end', {
                start: new Date(startDate),
                end: new Date(endDate),
            });
        }
        // Par défaut: aujourd'hui
        else {
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            const tomorrow = new Date(today);
            tomorrow.setDate(tomorrow.getDate() + 1);

            query.andWhere('payment.processedAt BETWEEN :start AND :end', {
                start: today,
                end: tomorrow,
            });
        }

        return await query.getMany();
    }

    /**
     * Enregistre un paiement cash au bureau
     */
    async recordCashPayment(
        invoiceId: string,
        amount: number,
        receivedBy: string,
        notes?: string,
    ): Promise<Payment> {
        this.logger.log(`Recording cash payment for invoice ${invoiceId}`);

        return await this.dataSource.transaction(async (manager) => {
            // 1. Récupérer la facture
            const invoice = await manager.findOne(Invoice, {
                where: { id: invoiceId },
                relations: ['user', 'items', 'items.parcel'],
            });

            if (!invoice) {
                throw new NotFoundException(`Invoice ${invoiceId} not found`);
            }

            // 2. Vérifier si la facture est déjà payée
            if (invoice.status === InvoiceStatus.PAID) {
                throw new Error('Invoice is already paid');
            }

            // 3. Vérifier le montant
            if (amount < invoice.total) {
                throw new Error(`Payment amount (${amount}) is less than invoice total (${invoice.total})`);
            }

            // 4. Créer le paiement
            const payment = manager.create(Payment, {
                invoiceId: invoice.id,
                userId: invoice.userId,
                amount: invoice.total,
                currency: 'USD',
                method: PaymentMethod.CASH,
                status: PaymentStatus.COMPLETED,
                transactionId: `CASH-${Date.now()}`,
                processedAt: new Date(),
                metadata: {
                    receivedBy,
                    notes,
                    changeGiven: amount > invoice.total ? amount - invoice.total : 0,
                },
            });

            await manager.save(payment);

            // 5. Mettre à jour le statut de la facture
            invoice.status = InvoiceStatus.PAID;
            invoice.paidAt = new Date();
            await manager.save(invoice);

            // 6. Marquer les colis comme DELIVERED (client présent au bureau)
            for (const item of invoice.items) {
                if (item.parcel && item.parcel.status !== ParcelStatus.DELIVERED) {
                    const oldStatus = item.parcel.status;
                    item.parcel.status = ParcelStatus.DELIVERED;
                    item.parcel.deliveredAt = new Date();
                    await manager.save(Parcel, item.parcel);

                    // Créer une entrée dans l'historique
                    const history = manager.create(ParcelStatusHistory, {
                        parcelId: item.parcel.id,
                        status: ParcelStatus.DELIVERED,
                        location: 'Bureau - Retrait client',
                        notes: `Colis remis au client lors du paiement cash. Reçu par: ${receivedBy}`,
                    });
                    await manager.save(ParcelStatusHistory, history);

                    this.logger.log(
                        `Parcel ${item.parcel.trackingNumber} marked as DELIVERED: ${oldStatus} → DELIVERED (cash payment pickup)`
                    );
                }
            }

            this.logger.log(`Cash payment recorded for invoice ${invoiceId} - Parcels marked as delivered`);

            return payment;
        });
    }

    /**
     * Génère un reçu thermique (format 80mm)
     */
    async generateThermalReceipt(invoiceId: string): Promise<string> {
        const invoice = await this.invoiceRepository.findOne({
            where: { id: invoiceId },
            relations: ['user', 'items', 'items.parcel', 'payments'],
        });

        if (!invoice) {
            throw new NotFoundException(`Invoice ${invoiceId} not found`);
        }

        const payment = invoice.payments?.[0];
        const width = 32; // 32 caractères pour imprimante 80mm

        const center = (text: string) => {
            const padding = Math.max(0, Math.floor((width - text.length) / 2));
            return ' '.repeat(padding) + text;
        };

        const line = () => '='.repeat(width);
        const dottedLine = () => '-'.repeat(width);

        let receipt = '\n';
        receipt += center('SHIPPING PLATFORM') + '\n';
        receipt += center('RECU DE PAIEMENT') + '\n';
        receipt += line() + '\n';
        receipt += '\n';

        // Informations de la facture
        receipt += `Facture: ${invoice.invoiceNumber}\n`;
        receipt += `Date: ${new Date(invoice.createdAt).toLocaleString('fr-HT')}\n`;
        receipt += dottedLine() + '\n';

        // Client
        receipt += `Client: ${invoice.user.firstName} ${invoice.user.lastName}\n`;
        receipt += `Email: ${invoice.user.email}\n`;
        receipt += dottedLine() + '\n';

        // Articles
        receipt += 'COLIS:\n';
        for (const item of invoice.items) {
            const parcel = item.parcel;
            receipt += `  ${parcel.trackingNumber}\n`;
            receipt += `  ${item.description}\n`;
            const price = `$${item.total.toFixed(2)}`;
            receipt += `  ${' '.repeat(width - price.length - 2)}${price}\n`;
        }
        receipt += dottedLine() + '\n';

        // Totaux
        const subtotal = `Sous-total: $${invoice.subtotal.toFixed(2)}`;
        receipt += `${' '.repeat(width - subtotal.length)}${subtotal}\n`;

        if (invoice.tax > 0) {
            const tax = `Taxe: $${invoice.tax.toFixed(2)}`;
            receipt += `${' '.repeat(width - tax.length)}${tax}\n`;
        }

        if (invoice.fees > 0) {
            const fees = `Frais: $${invoice.fees.toFixed(2)}`;
            receipt += `${' '.repeat(width - fees.length)}${fees}\n`;
        }

        receipt += line() + '\n';
        const total = `TOTAL: $${invoice.total.toFixed(2)}`;
        receipt += `${' '.repeat(width - total.length)}${total}\n`;
        receipt += line() + '\n';

        // Paiement
        if (payment) {
            receipt += '\n';
            receipt += `Mode: ${payment.method}\n`;
            receipt += `Montant reçu: $${payment.amount.toFixed(2)}\n`;

            if (payment.metadata?.changeGiven > 0) {
                receipt += `Monnaie rendue: $${payment.metadata.changeGiven.toFixed(2)}\n`;
            }

            receipt += `Payé le: ${new Date(payment.processedAt).toLocaleString('fr-HT')}\n`;
            receipt += `Transaction: ${payment.transactionId}\n`;
        }

        receipt += '\n';
        receipt += dottedLine() + '\n';
        receipt += center('MERCI DE VOTRE CONFIANCE') + '\n';
        receipt += center('www.shippingplatform.com') + '\n';
        receipt += '\n';
        receipt += '\n';
        receipt += '\n'; // Espace pour découpe

        return receipt;
    }

    /**
     * Vérifie si un colis est prêt pour retrait
     */
    async checkParcelReadyForPickup(trackingNumber: string): Promise<{
        ready: boolean;
        parcel?: Parcel;
        invoice?: Invoice;
        message: string;
    }> {
        const parcel = await this.parcelRepository.findOne({
            where: { trackingNumber },
            relations: ['user', 'customAddress'],
        });

        if (!parcel) {
            return {
                ready: false,
                message: 'Colis introuvable',
            };
        }

        // Vérifier le statut du colis
        if (parcel.status !== ParcelStatus.READY && parcel.status !== ParcelStatus.DELIVERED) {
            return {
                ready: false,
                parcel,
                message: `Colis pas encore prêt. Statut actuel: ${parcel.status}`,
            };
        }

        // Vérifier si une facture existe
        const invoice = await this.invoiceRepository
            .createQueryBuilder('invoice')
            .leftJoinAndSelect('invoice.items', 'items')
            .leftJoinAndSelect('items.parcel', 'itemParcel')
            .leftJoinAndSelect('invoice.payments', 'payments')
            .where('itemParcel.id = :parcelId', { parcelId: parcel.id })
            .getOne();

        if (!invoice) {
            return {
                ready: false,
                parcel,
                message: 'Aucune facture générée pour ce colis',
            };
        }

        // Si la facture est déjà payée
        if (invoice.status === InvoiceStatus.PAID) {
            return {
                ready: true,
                parcel,
                invoice,
                message: 'Colis déjà payé et prêt pour retrait',
            };
        }

        // Si le colis est READY et la facture est PENDING, c'est prêt pour paiement cash
        return {
            ready: true,
            parcel,
            invoice,
            message: `Colis prêt. Facture à payer: $${parseFloat(invoice.total.toString()).toFixed(2)}`,
        };
    }

    /**
     * Obtenir les statistiques de facturation
     */
    async getBillingStatistics(): Promise<{
        monthlyRevenue: number;
        cashPayments: number;
        unpaidInvoices: number;
        unpaidAmount: number;
    }> {
        const now = new Date();
        const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
        const lastDayOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);

        // Revenus du mois (paiements complétés ce mois)
        const monthlyPayments = await this.paymentRepository
            .createQueryBuilder('payment')
            .where('payment.status = :status', { status: PaymentStatus.COMPLETED })
            .andWhere('payment.processedAt BETWEEN :start AND :end', {
                start: firstDayOfMonth,
                end: lastDayOfMonth,
            })
            .getMany();

        const monthlyRevenue = monthlyPayments.reduce(
            (sum, payment) => sum + parseFloat(payment.amount.toString()),
            0
        );

        // Paiements cash du mois
        const cashPayments = monthlyPayments
            .filter(p => p.method === PaymentMethod.CASH)
            .reduce((sum, payment) => sum + parseFloat(payment.amount.toString()), 0);

        // Factures impayées
        const unpaidInvoices = await this.invoiceRepository
            .createQueryBuilder('invoice')
            .where('invoice.status IN (:...statuses)', {
                statuses: [InvoiceStatus.PENDING, InvoiceStatus.DRAFT, InvoiceStatus.OVERDUE],
            })
            .getMany();

        const unpaidAmount = unpaidInvoices.reduce(
            (sum, invoice) => sum + parseFloat(invoice.total.toString()),
            0
        );

        return {
            monthlyRevenue,
            cashPayments,
            unpaidInvoices: unpaidInvoices.length,
            unpaidAmount,
        };
    }
}

