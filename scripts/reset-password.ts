import { DataSource } from 'typeorm';
import * as bcrypt from 'bcrypt';

const AppDataSource = new DataSource({
    type: 'postgres',
    host: 'localhost',
    port: 5432,
    username: 'postgres',
    password: 'postgres',
    database: 'shipping_platform',
});

async function resetPassword() {
    try {
        await AppDataSource.initialize();
        console.log('✅ Connected to database');

        const email = 'marie.joseph@example.com';
        const newPassword = 'password123';

        // Generate hash
        const passwordHash = await bcrypt.hash(newPassword, 12);
        console.log('🔐 Generated password hash');

        // Update user
        const result = await AppDataSource.query(
            'UPDATE users SET password_hash = $1 WHERE email = $2',
            [passwordHash, email]
        );

        if (result[1] > 0) {
            console.log(`✅ Password reset successfully for ${email}`);
            console.log(`📧 Email: ${email}`);
            console.log(`🔑 New password: ${newPassword}`);
        } else {
            console.log(`❌ User not found: ${email}`);
        }

        await AppDataSource.destroy();
    } catch (error) {
        console.error('❌ Error:', error.message);
        process.exit(1);
    }
}

resetPassword();
