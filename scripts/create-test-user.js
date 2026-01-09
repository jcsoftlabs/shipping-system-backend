const axios = require('axios');

async function createTestUser() {
    try {
        const response = await axios.post('http://localhost:3000/api/auth/register', {
            email: 'test@client.com',
            password: 'Test123!',
            firstName: 'Test',
            lastName: 'Client',
            phone: '+509 1234-5678',
            role: 'CLIENT',
            haitiAddress: {
                department: 'Ouest',
                commune: 'Port-au-Prince',
                quartier: 'Delmas 33',
                street: 'Rue Lamarre',
                details: 'Maison #15',
                landmark: 'Près de l\'église',
                deliveryInstructions: ''
            }
        });

        console.log('✅ Test user created successfully!');
        console.log('📧 Email: test@client.com');
        console.log('🔑 Password: Test123!');
        console.log('🏠 Address USA:', response.data.user?.customAddresses?.[0]?.addressCode || 'Generated');
        console.log('\nYou can now login at: http://localhost:3002/login');
    } catch (error) {
        console.error('❌ Error creating test user:', error.response?.data || error.message);
    }
}

createTestUser();
