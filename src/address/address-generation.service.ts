import { Injectable, ConflictException, BadRequestException, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { CustomAddress, AddressStatus } from '../entities/custom-address.entity';
import { AddressCounter } from '../entities/address-counter.entity';
import { HubAddress } from '../entities/hub-address.entity';
import { User } from '../entities/user.entity';

@Injectable()
export class AddressGenerationService {
    private readonly logger = new Logger(AddressGenerationService.name);

    constructor(
        @InjectRepository(CustomAddress)
        private addressRepository: Repository<CustomAddress>,

        @InjectRepository(AddressCounter)
        private counterRepository: Repository<AddressCounter>,

        @InjectRepository(HubAddress)
        private hubAddressRepository: Repository<HubAddress>,

        @InjectRepository(User)
        private userRepository: Repository<User>,

        private dataSource: DataSource,
    ) { }

    /**
     * Génère une nouvelle adresse personnalisée pour un utilisateur
     * Format: HT-{HUB}-{CLIENT_ID}/A
     */
    async generateAddress(userId: string, hub: string = 'NMB'): Promise<CustomAddress> {
        this.logger.log(`Generating address for user ${userId} at hub ${hub}`);

        return await this.dataSource.transaction(async (manager) => {
            // 1. Vérifier que l'utilisateur existe
            const user = await manager.findOne(User, { where: { id: userId } });
            if (!user) {
                throw new BadRequestException(`User ${userId} not found`);
            }

            // 2. Vérifier si l'utilisateur a déjà une adresse pour ce hub
            const existingAddress = await manager.findOne(CustomAddress, {
                where: { userId, hub, status: AddressStatus.ACTIVE },
            });

            if (existingAddress) {
                throw new ConflictException(
                    `User already has an active address at hub ${hub}: ${existingAddress.addressCode}`,
                );
            }

            // 3. Obtenir le prochain numéro de séquence pour ce hub
            const clientId = await this.getNextClientId(manager, hub);

            // 4. Générer le code d'adresse
            const addressCode = `HT-${hub}-${clientId}/A`;

            // 5. Obtenir l'adresse US pour ce hub
            const usAddressData = await this.getUSAddressData(hub);

            // 6. Créer l'adresse
            const address = new CustomAddress();
            address.userId = userId;
            address.addressCode = addressCode;
            address.hub = hub;
            address.clientId = clientId;
            address.unit = 'A';
            address.status = AddressStatus.ACTIVE;
            address.isPrimary = true;
            address.usStreet = usAddressData.street;
            address.usCity = usAddressData.city;
            address.usState = usAddressData.state;
            address.usZipcode = usAddressData.zipcode;
            address.generatedAt = new Date();

            const savedAddress = await manager.save(CustomAddress, address);

            this.logger.log(`Address generated: ${addressCode}`);

            return savedAddress;
        });
    }

    /**
     * Obtient le prochain ID client pour un hub donné
     */
    private async getNextClientId(manager: any, hub: string): Promise<string> {
        // Lock pessimiste pour éviter les doublons
        let counter = await manager
            .createQueryBuilder(AddressCounter, 'counter')
            .setLock('pessimistic_write')
            .where('counter.hub = :hub', { hub })
            .getOne();

        if (!counter) {
            // Premier client pour ce hub: initialiser le compteur
            counter = manager.create(AddressCounter, {
                hub,
                currentSequence: 1,
            });
            await manager.save(AddressCounter, counter);
            return '00001';
        }

        // Incrémenter le compteur
        const nextSequence = counter.currentSequence + 1;
        counter.currentSequence = nextSequence;
        await manager.save(AddressCounter, counter);

        // Formater avec des zéros à gauche (5 chiffres)
        return nextSequence.toString().padStart(5, '0');
    }

    /**
     * Récupère les données d'adresse US depuis la base de données
     */
    private async getUSAddressData(hub: string): Promise<{ street: string; city: string; state: string; zipcode: string }> {
        const hubAddress = await this.hubAddressRepository.findOne({
            where: { hub, isActive: true },
        });

        if (!hubAddress) {
            throw new NotFoundException(`Hub address not found for hub: ${hub}`);
        }

        return {
            street: hubAddress.street,
            city: hubAddress.city,
            state: hubAddress.state,
            zipcode: hubAddress.zipcode,
        };
    }

    /**
     * Récupère toutes les adresses de hub actives
     */
    async getActiveHubs(): Promise<HubAddress[]> {
        return await this.hubAddressRepository.find({
            where: { isActive: true },
            order: { hubName: 'ASC' },
        });
    }

    /**
     * Crée ou met à jour une adresse de hub
     */
    async upsertHubAddress(data: {
        hub: string;
        hubName: string;
        street: string;
        city: string;
        state: string;
        zipcode: string;
    }): Promise<HubAddress> {
        let hubAddress = await this.hubAddressRepository.findOne({
            where: { hub: data.hub },
        });

        if (hubAddress) {
            // Update existing
            Object.assign(hubAddress, data);
        } else {
            // Create new
            hubAddress = this.hubAddressRepository.create(data);
        }

        return await this.hubAddressRepository.save(hubAddress);
    }

    /**
     * Désactive une adresse de hub
     */
    async deactivateHub(hub: string): Promise<HubAddress> {
        const hubAddress = await this.hubAddressRepository.findOne({
            where: { hub },
        });

        if (!hubAddress) {
            throw new NotFoundException(`Hub not found: ${hub}`);
        }

        hubAddress.isActive = false;
        return await this.hubAddressRepository.save(hubAddress);
    }

    /**
     * Récupère toutes les adresses d'un utilisateur
     */
    async getUserAddresses(userId: string): Promise<CustomAddress[]> {
        return await this.addressRepository.find({
            where: { userId },
            order: { createdAt: 'DESC' },
        });
    }

    /**
     * Récupère l'adresse primaire d'un utilisateur
     */
    async getPrimaryAddress(userId: string): Promise<CustomAddress | null> {
        return await this.addressRepository.findOne({
            where: { userId, isPrimary: true, status: AddressStatus.ACTIVE },
        });
    }

    /**
     * Récupère une adresse par son code
     */
    async getAddressByCode(addressCode: string): Promise<CustomAddress | null> {
        return await this.addressRepository.findOne({
            where: { addressCode },
            relations: ['user'],
        });
    }

    /**
     * Désactive une adresse
     */
    async deactivateAddress(addressId: string): Promise<CustomAddress> {
        const address = await this.addressRepository.findOne({
            where: { id: addressId },
        });

        if (!address) {
            throw new BadRequestException(`Address ${addressId} not found`);
        }

        address.status = AddressStatus.INACTIVE;
        address.deactivatedAt = new Date();

        return await this.addressRepository.save(address);
    }

    /**
     * Statistiques par hub
     */
    async getHubStatistics(): Promise<any[]> {
        return await this.addressRepository
            .createQueryBuilder('address')
            .select('address.hub', 'hub')
            .addSelect('COUNT(*)', 'total')
            .addSelect('COUNT(CASE WHEN address.status = :active THEN 1 END)', 'active')
            .addSelect('COUNT(CASE WHEN address.status = :inactive THEN 1 END)', 'inactive')
            .setParameter('active', AddressStatus.ACTIVE)
            .setParameter('inactive', AddressStatus.INACTIVE)
            .groupBy('address.hub')
            .getRawMany();
    }
}
