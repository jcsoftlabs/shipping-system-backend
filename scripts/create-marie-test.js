const https = require('https');
const http = require('http');

// Since we can't connect to PostgreSQL directly, let's create a test user via registration
// But first, let's try to use the backend's existing auth service

const data = JSON.stringify({
    email: 'marie.test@example.com',
    password: 'password123',
    firstName: 'Marie',
    lastName: 'Joseph',
    phone: '+509 3456-7890',
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

const options = {
    hostname: 'localhost',
    port: 3000,
    path: '/api/auth/register',
    method: 'POST',
    headers: {
        'Content-Type': 'application/json',
        'Content-Length': data.length
    }
};

const req = http.request(options, (res) => {
    let responseData = '';

    res.on('data', (chunk) => {
        responseData += chunk;
    });

    res.on('end', () => {
        if (res.statusCode === 201 || res.statusCode === 200) {
            console.log('✅ Test user created successfully!');
            console.log('📧 Email: marie.test@example.com');
            console.log('🔑 Password: password123');
            console.log('\nYou can now login at: http://localhost:3002/login');
            try {
                const parsed = JSON.parse(responseData);
                if (parsed.user?.customAddresses?.[0]?.addressCode) {
                    console.log('🏠 USA Address:', parsed.user.customAddresses[0].addressCode);
                }
            } catch (e) {
                // Ignore parse errors
            }
        } else {
            console.error('❌ Error creating user:', res.statusCode);
            console.error('Response:', responseData);
        }
    });
});

req.on('error', (error) => {
    console.error('❌ Request error:', error.message);
});

req.write(data);
req.end();
