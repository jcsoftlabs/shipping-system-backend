import { NestFactory } from '@nestjs/core';
import { AppModule } from '../src/app.module';
import { AddressGenerationService } from '../src/address/address-generation.service';
import { User } from '../src/entities/user.entity';
import { Repository } from 'typeorm';
import { getRepositoryToken } from '@nestjs/typeorm';

async function generateAddressesForExistingUsers() {
    const app = await NestFactory.createApplicationContext(AppModule);

    const addressService = app.get(AddressGenerationService);
    const userRepository: Repository<User> = app.get(getRepositoryToken(User));

    console.log('🚀 Starting address generation for existing users...\n');

    // Get all users
    const users = await userRepository.find({
        where: { isActive: true },
    });

    console.log(`📊 Found ${users.length} active users\n`);

    let successCount = 0;
    let skipCount = 0;
    let errorCount = 0;

    for (const user of users) {
        try {
            // Check if user already has an address
            const existingAddresses = await addressService.getUserAddresses(user.id);

            if (existingAddresses.length > 0) {
                console.log(`⏭️  Skipping ${user.email} - already has ${existingAddresses.length} address(es)`);
                skipCount++;
                continue;
            }

            // Generate address with default hub (MIA)
            const address = await addressService.generateAddress(user.id, 'MIA');
            console.log(`✅ Generated address for ${user.email}: ${address.addressCode}`);
            successCount++;
        } catch (error) {
            console.error(`❌ Error generating address for ${user.email}:`, error.message);
            errorCount++;
        }
    }

    console.log('\n📈 Summary:');
    console.log(`   ✅ Successfully generated: ${successCount}`);
    console.log(`   ⏭️  Skipped (already had address): ${skipCount}`);
    console.log(`   ❌ Errors: ${errorCount}`);
    console.log(`   📊 Total processed: ${users.length}\n`);

    await app.close();
}

generateAddressesForExistingUsers()
    .then(() => {
        console.log('✨ Migration completed successfully!');
        process.exit(0);
    })
    .catch((error) => {
        console.error('💥 Migration failed:', error);
        process.exit(1);
    });
