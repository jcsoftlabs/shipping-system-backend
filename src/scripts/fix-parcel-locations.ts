import { DataSource } from 'typeorm';
import { Parcel, ParcelStatus } from '../entities/parcel.entity';
import * as dotenv from 'dotenv';

// Charger les variables d'environnement
dotenv.config();

/**
 * Script de migration pour corriger les localisations des colis
 * Colis READY → "Port-au-Prince, Haïti - Prêt pour retrait"
 * Colis DELIVERED → "Livré au client"
 */
async function fixParcelLocations() {
    const databaseUrl = process.env.DATABASE_URL;

    if (!databaseUrl) {
        console.error('❌ DATABASE_URL not found in environment variables');
        process.exit(1);
    }

    const dataSource = new DataSource({
        type: 'postgres',
        url: databaseUrl,
        entities: [__dirname + '/../entities/*.entity{.ts,.js}'],
        synchronize: false,
        ssl: {
            rejectUnauthorized: false,
        },
    });

    try {
        console.log('🔌 Connecting to database...');
        await dataSource.initialize();
        console.log('✅ Database connected\n');

        const parcelRepository = dataSource.getRepository(Parcel);

        // 1. Corriger les colis READY
        const readyParcels = await parcelRepository.find({
            where: { status: ParcelStatus.READY },
        });

        console.log(`📦 Found ${readyParcels.length} parcels with READY status`);

        let readyUpdated = 0;
        for (const parcel of readyParcels) {
            if (parcel.currentLocation !== 'Port-au-Prince, Haïti - Prêt pour retrait') {
                console.log(`  ✏️  ${parcel.trackingNumber}: "${parcel.currentLocation}" → "Port-au-Prince, Haïti - Prêt pour retrait"`);
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
                console.log(`  ✏️  ${parcel.trackingNumber}: "${parcel.currentLocation}" → "Livré au client"`);
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
        if (dataSource.isInitialized) {
            await dataSource.destroy();
        }
        process.exit(1);
    }
}

// Exécuter le script
fixParcelLocations();

