import { DataSource } from 'typeorm';
import * as bcrypt from 'bcrypt';

const dataSource = new DataSource({
    type: 'postgres',
    host: process.env.DATABASE_HOST || 'tramway.proxy.rlwy.net',
    port: parseInt(process.env.DATABASE_PORT || '27962'),
    username: process.env.DATABASE_USER || 'postgres',
    password: process.env.DATABASE_PASSWORD || 'fhgbCqlEhXtWKPUWXVaFklveSDymNgDr',
    database: process.env.DATABASE_NAME || 'railway',
    ssl: { rejectUnauthorized: false },
});

async function seed() {
    console.log('🌱 Starting database seeding...\n');

    try {
        await dataSource.initialize();
        console.log('✅ Database connected\n');

        // Hash password for all users
        const hashedPassword = await bcrypt.hash('Password123!', 10);

        // 1. Create Users
        console.log('👥 Creating users...');
        const users = [
            {
                email: 'admin@shipping.com',
                password_hash: hashedPassword,
                first_name: 'Admin',
                last_name: 'System',
                role: 'SUPER_ADMIN',
                phone: '+13055550001',
                is_active: true,
            },
            {
                email: 'agent.miami@shipping.com',
                password_hash: hashedPassword,
                first_name: 'John',
                last_name: 'Smith',
                role: 'AGENT',
                phone: '+13055550002',
                is_active: true,
            },
            {
                email: 'agent.haiti@shipping.com',
                password_hash: hashedPassword,
                first_name: 'Marie',
                last_name: 'Pierre',
                role: 'AGENT',
                phone: '+50934567890',
                is_active: true,
            },
            {
                email: 'jean.dupont@example.com',
                password_hash: hashedPassword,
                first_name: 'Jean',
                last_name: 'Dupont',
                role: 'CLIENT',
                phone: '+50912345678',
                is_active: true,
            },
            {
                email: 'marie.joseph@example.com',
                password_hash: hashedPassword,
                first_name: 'Marie',
                last_name: 'Joseph',
                role: 'CLIENT',
                phone: '+50923456789',
                is_active: true,
            },
            {
                email: 'paul.charles@example.com',
                password_hash: hashedPassword,
                first_name: 'Paul',
                last_name: 'Charles',
                role: 'CLIENT',
                phone: '+50934567891',
                is_active: true,
            },
        ];

        const userIds: string[] = [];
        for (const user of users) {
            const result = await dataSource.query(
                `INSERT INTO users (email, password_hash, first_name, last_name, role, phone, is_active, created_at, updated_at)
                 VALUES ($1, $2, $3, $4, $5, $6, $7, NOW(), NOW())
                 ON CONFLICT (email) DO UPDATE SET updated_at = NOW()
                 RETURNING id`,
                [user.email, user.password_hash, user.first_name, user.last_name, user.role, user.phone, user.is_active]
            );
            userIds.push(result[0].id);
            console.log(`  ✓ ${user.first_name} ${user.last_name} (${user.role})`);
        }

        // 2. Create Address Counters
        console.log('\n📍 Creating address counters...');
        const hubs = ['MIA', 'NYC', 'LAX'];
        for (const hub of hubs) {
            await dataSource.query(
                `INSERT INTO address_counters (hub, current_sequence, created_at, updated_at)
                 VALUES ($1, $2, NOW(), NOW())
                 ON CONFLICT (hub) DO NOTHING`,
                [hub, 100]
            );
            console.log(`  ✓ ${hub} counter initialized`);
        }

        // 3. Create Custom Addresses for clients
        console.log('\n🏠 Creating custom addresses...');
        const clientIds = userIds.slice(3); // Last 3 users are clients
        const addresses = [];

        for (let i = 0; i < clientIds.length; i++) {
            const hub = hubs[i % hubs.length];
            const clientId = String(10100 + i).padStart(5, '0');
            const addressCode = `HT-${hub}-${clientId}/A`;

            const usAddresses = [
                { street: '1234 Ocean Drive', city: 'Miami', state: 'FL', zip: '33139' },
                { street: '5678 Broadway', city: 'New York', state: 'NY', zip: '10019' },
                { street: '9012 Sunset Blvd', city: 'Los Angeles', state: 'CA', zip: '90028' },
            ];

            const addr = usAddresses[i % usAddresses.length];

            const result = await dataSource.query(
                `INSERT INTO custom_addresses (
                    user_id, address_code, hub, client_id, unit,
                    us_street, us_city, us_state, us_zipcode,
                    status, is_primary, generated_at, activated_at, created_at, updated_at
                 ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, NOW(), NOW(), NOW(), NOW())
                 ON CONFLICT (address_code) DO NOTHING
                 RETURNING id`,
                [clientIds[i], addressCode, hub, clientId, 'A', addr.street, addr.city, addr.state, addr.zip, 'ACTIVE', true]
            );

            if (result.length > 0) {
                addresses.push(result[0].id);
                console.log(`  ✓ ${addressCode} - ${addr.street}, ${addr.city}`);
            } else {
                // Address already exists, fetch it
                const existing = await dataSource.query(
                    `SELECT id FROM custom_addresses WHERE address_code = $1`,
                    [addressCode]
                );
                if (existing.length > 0) {
                    addresses.push(existing[0].id);
                    console.log(`  ↻ ${addressCode} - Already exists`);
                }
            }
        }

        // 4. Create Parcel Categories
        console.log('\n📦 Creating parcel categories...');
        const categories = [
            { name: 'Electronics', description: 'Electronic devices and accessories', base_rate: 15.00, per_pound_rate: 3.00, icon: '💻' },
            { name: 'Clothing', description: 'Clothes and textiles', base_rate: 10.00, per_pound_rate: 1.50, icon: '👕' },
            { name: 'Documents', description: 'Papers and documents', base_rate: 8.00, per_pound_rate: 1.00, icon: '📄' },
            { name: 'Food', description: 'Non-perishable food items', base_rate: 12.00, per_pound_rate: 2.00, icon: '🍱' },
            { name: 'General', description: 'General merchandise', base_rate: 10.00, per_pound_rate: 2.00, icon: '📦' },
        ];

        const categoryIds: string[] = [];
        for (const cat of categories) {
            const result = await dataSource.query(
                `INSERT INTO parcel_categories (name, description, base_rate, per_pound_rate, icon, is_active, created_at, updated_at)
                 VALUES ($1, $2, $3, $4, $5, $6, NOW(), NOW())
                 ON CONFLICT (name) DO UPDATE SET updated_at = NOW()
                 RETURNING id`,
                [cat.name, cat.description, cat.base_rate, cat.per_pound_rate, cat.icon, true]
            );
            categoryIds.push(result[0].id);
            console.log(`  ✓ ${cat.icon} ${cat.name}`);
        }

        // 5. Create Parcels with various statuses
        console.log('\n📮 Creating parcels...');
        const statuses = ['PENDING', 'RECEIVED', 'PROCESSING', 'READY', 'SHIPPED', 'IN_TRANSIT', 'DELIVERED'];
        const carriers = ['USPS', 'FedEx', 'UPS', 'DHL'];

        for (let i = 0; i < 20; i++) {
            const trackingNumber = `TRK-2025-${String(1000 + i).padStart(6, '0')}`;
            const userId = clientIds[i % clientIds.length];
            const addressId = addresses[i % addresses.length];
            const categoryId = categoryIds[i % categoryIds.length];
            const status = statuses[i % statuses.length];
            const carrier = carriers[i % carriers.length];
            const weight = (Math.random() * 20 + 1).toFixed(2);
            const declaredValue = (Math.random() * 500 + 50).toFixed(2);

            const descriptions = [
                'iPhone 15 Pro Max',
                'MacBook Air M2',
                'Nike Air Jordan Shoes',
                'Samsung Galaxy S24',
                'Designer Handbag',
                'Laptop Accessories',
                'Winter Clothes',
                'Kitchen Appliances',
                'Books and Magazines',
                'Toys and Games',
            ];

            await dataSource.query(
                `INSERT INTO parcels (
                    tracking_number, user_id, custom_address_id, category_id,
                    carrier, carrier_tracking_number, description, weight, declared_value,
                    status, warehouse, current_location, received_at, created_at, updated_at
                 ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, NOW(), NOW())
                 ON CONFLICT (tracking_number) DO NOTHING`,
                [
                    trackingNumber, userId, addressId, categoryId,
                    carrier, `${carrier}-${Math.random().toString(36).substr(2, 9).toUpperCase()}`,
                    descriptions[i % descriptions.length], weight, declaredValue,
                    status, 'MIA', 'Miami Warehouse',
                    status !== 'PENDING' ? new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000) : null
                ]
            );
            console.log(`  ✓ ${trackingNumber} - ${status}`);
        }

        // 6. Create Invoices
        console.log('\n💰 Creating invoices...');
        const parcels = await dataSource.query(`SELECT id, user_id FROM parcels LIMIT 10`);

        for (let i = 0; i < 5; i++) {
            const parcel = parcels[i];
            const invoiceNumber = `INV-2025-${String(1 + i).padStart(6, '0')}`;
            const subtotal = (Math.random() * 100 + 50).toFixed(2);
            const fees = 5.00;
            const total = (parseFloat(subtotal) + fees).toFixed(2);
            const isPaid = i < 3; // First 3 are paid

            const invoiceResult = await dataSource.query(
                `INSERT INTO invoices (
                    invoice_number, user_id, subtotal, tax, fees, total,
                    status, due_date, paid_at, created_at, updated_at
                 ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW(), NOW())
                 ON CONFLICT (invoice_number) DO NOTHING
                 RETURNING id`,
                [
                    invoiceNumber, parcel.user_id, subtotal, 0, fees, total,
                    isPaid ? 'PAID' : 'PENDING',
                    new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
                    isPaid ? new Date() : null
                ]
            );

            if (invoiceResult.length > 0) {
                const invoiceId = invoiceResult[0].id;

                // Create invoice item
                await dataSource.query(
                    `INSERT INTO invoice_items (invoice_id, parcel_id, description, quantity, unit_price, total, created_at)
                     VALUES ($1, $2, $3, $4, $5, $6, NOW())`,
                    [invoiceId, parcel.id, 'Shipping Fee', 1, subtotal, subtotal]
                );

                // Create payment if paid
                if (isPaid) {
                    const methods = ['CASH', 'CARD', 'BANK_TRANSFER'];
                    await dataSource.query(
                        `INSERT INTO payments (
                            invoice_id, user_id, amount, currency, method, status,
                            transaction_id, processed_at, created_at
                         ) VALUES ($1, $2, $3, $4, $5, $6, $7, NOW(), NOW())`,
                        [
                            invoiceId, parcel.user_id, total, 'USD', methods[i % methods.length],
                            'COMPLETED', `TXN-${Math.random().toString(36).substr(2, 9).toUpperCase()}`
                        ]
                    );
                }

                console.log(`  ✓ ${invoiceNumber} - ${isPaid ? 'PAID' : 'PENDING'} ($${total})`);
            }
        }

        console.log('\n✅ Database seeding completed successfully!\n');
        console.log('📊 Summary:');
        console.log(`  - ${users.length} users created`);
        console.log(`  - ${addresses.length} addresses created`);
        console.log(`  - ${categories.length} categories created`);
        console.log(`  - 20 parcels created`);
        console.log(`  - 5 invoices created (3 paid, 2 pending)`);
        console.log('\n🎉 You can now test the application with realistic data!\n');

    } catch (error) {
        console.error('❌ Error seeding database:', error);
        process.exit(1);
    } finally {
        await dataSource.destroy();
    }
}

seed();
