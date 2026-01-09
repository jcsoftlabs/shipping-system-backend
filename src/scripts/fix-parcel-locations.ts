import { DataSource } from 'typeorm';
import { Parcel, ParcelStatus } from '../entities/parcel.entity';

/**
 * Script de migration pour corriger les localisations des colis
 * Colis READY → "Port-au-Prince, Haïti - Prêt pour retrait"
 * Colis DELIVERED → "Livré au client"
 */
async function fixParcelLocations() {
    const dataSource = new DataSource({
        type: 'postgres',
        host: process.env.DB_HOST || 'localhost',
        port: parseInt(process.env.DB_PORT || '5432'),
        username: process.env.DB_USERNAME || 'postgres',
        password: process.env.DB_PASSWORD || 'postgres',
        database: process.env.DB_NAME || 'shipping_platform',
        entities: [__dirname + '/../entities/*.entity{.ts,.js}'],
        synchronize: false,
    });

    try {
        await dataSource.initialize();
        console.log('✅ Database connected');

        const parcelRepository = dataSource.getRepository(Parcel);

        // 1. Corriger les colis READY
        const readyParcels = await parcelRepository.find({
            where: { status: ParcelStatus.READY },
        });

        console.log(`\n📦 Found ${readyParcels.length} parcels with READY status`);

        let readyUpdated = 0;
        for (const parcel of readyParcels) {
            if (parcel.currentLocation !== 'Port-au-Prince, Haïti - Prêt pour retrait') {
                console.log(`  Updating ${parcel.trackingNumber}: "${parcel.currentLocation}" → "Port-au-Prince, Haïti - Prêt pour retrait"`);
                parcel.currentLocation = 'Port-au-Prince, Haïti - Prêt pour retrait';
                await parcelRepository.save(parcel);
                readyUpdated++;
            }
        }

        console.log(`✅ Updated ${readyUpdated} READY parcels\n`);

        // 2. Corriger les colis DELIVERED
        const deliveredParcels = await parcelRepository.find({
            where: { status: ParcelStatus.DELIVERED },
        });

        console.log(`📦 Found ${deliveredParcels.length} parcels with DELIVERED status`);

        let deliveredUpdated = 0;
        for (const parcel of deliveredParcels) {
            if (parcel.currentLocation !== 'Livré au client') {
                console.log(`  Updating ${parcel.trackingNumber}: "${parcel.currentLocation}" → "Livré au client"`);
                parcel.currentLocation = 'Livré au client';
                await parcelRepository.save(parcel);
                deliveredUpdated++;
            }
        }

        console.log(`✅ Updated ${deliveredUpdated} DELIVERED parcels\n`);

        console.log(`\n🎉 Migration completed successfully!`);
        console.log(`   Total updated: ${readyUpdated + deliveredUpdated} parcels`);

        await dataSource.destroy();
        process.exit(0);
    } catch (error) {
        console.error('❌ Migration failed:', error);
        await dataSource.destroy();
        process.exit(1);
    }
}

// Exécuter le script
fixParcelLocations();
