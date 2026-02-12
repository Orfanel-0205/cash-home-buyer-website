// ===========================
// INIT SCRIPT - Create First Admin User
// ===========================

require('dotenv').config();
const mongoose = require('mongoose');
const Admin = require('./models/Admin');

// Force IPv4 DNS resolution (Windows fix)
const dns = require('dns');
if (dns.setDefaultResultOrder) {
    dns.setDefaultResultOrder('ipv4first');
}

const createInitialAdmin = async () => {
    try {
        console.log('Connecting to MongoDB Atlas...');
        
        // Connect to MongoDB - removed deprecated options
        try {
            await mongoose.connect(process.env.MONGODB_URI, {
                serverSelectionTimeoutMS: 15000,
                socketTimeoutMS: 45000,
            });
        } catch (connError) {
            if (connError.message.includes('ECONNREFUSED') || connError.message.includes('querySrv')) {
                console.log('⚠ Connection failed. Attempting to use Google DNS (8.8.8.8)...');
                dns.setServers(['8.8.8.8', '8.8.4.4']);
                await mongoose.connect(process.env.MONGODB_URI, {
                    serverSelectionTimeoutMS: 15000,
                    socketTimeoutMS: 45000,
                });
            } else {
                throw connError;
            }
        }
        
        console.log('✓ Successfully connected to MongoDB');
        console.log(`✓ Database: ${mongoose.connection.name}`);
        console.log(`✓ Host: ${mongoose.connection.host}`);
        
        // Check if admin already exists
        console.log('\nChecking for existing admin user...');
        const existingAdmin = await Admin.findOne({ role: 'admin' });
        
        if (existingAdmin) {
            console.log('⚠ Admin user already exists!');
            console.log(`   Username: ${existingAdmin.username}`);
            console.log(`   Email: ${existingAdmin.email}`);
            console.log(`   Created: ${existingAdmin.createdAt}`);
            await mongoose.connection.close();
            process.exit(0);
        }
        
        console.log('No admin user found. Creating new admin...');
        
        // Create admin user
        const admin = new Admin({
            username: process.env.ADMIN_USERNAME || 'admin',
            password: process.env.ADMIN_PASSWORD || 'changeme123',
            email: process.env.ADMIN_EMAIL || 'admin@example.com',
            fullName: 'System Administrator',
            role: 'admin',
            isActive: true
        });
        
        await admin.save();
        
        console.log('');
        console.log('╔════════════════════════════════════════╗');
        console.log('║   ✓ ADMIN USER CREATED SUCCESSFULLY   ║');
        console.log('╚════════════════════════════════════════╝');
        console.log('');
        console.log('Login Credentials:');
        console.log('------------------');
        console.log(`Username: ${admin.username}`);
        console.log(`Password: ${process.env.ADMIN_PASSWORD || 'changeme123'}`);
        console.log(`Email: ${admin.email}`);
        console.log(`Role: ${admin.role}`);
        console.log('');
        console.log('⚠ IMPORTANT: Change the default password after first login!');
        console.log('');
        console.log('Next steps:');
        console.log('1. Run: node server.js');
        console.log('2. Open: http://localhost:5000');
        console.log('3. Login with credentials above');
        console.log('');
        
        await mongoose.connection.close();
        process.exit(0);
        
    } catch (error) {
        console.error('\n❌ ERROR:', error.message);
        console.error('\nFull error details:');
        console.error(error);
        
        if (error.message.includes('ECONNREFUSED') || error.message.includes('querySrv') || error.message.includes('ENOTFOUND')) {
            console.log('\n═══════════════════════════════════════');
            console.log('🔍 DNS/CONNECTION ERROR DETECTED');
            console.log('═══════════════════════════════════════');
            console.log('\n✓ Good news: mongosh connected successfully!');
            console.log('✗ Problem: Node.js cannot resolve MongoDB DNS');
            console.log('\n💡 SOLUTIONS TO TRY:');
            console.log('');
            console.log('1. Run with DNS fix:');
            console.log('   $env:NODE_OPTIONS="--dns-result-order=ipv4first"');
            console.log('   node init.js');
            console.log('');
            console.log('2. Flush DNS cache:');
            console.log('   ipconfig /flushdns');
            console.log('   node init.js');
            console.log('');
            console.log('3. Try alternative connection (see .env file)');
            console.log('');
            console.log('4. Restart your computer (clears DNS cache)');
            console.log('');
        }
        
        process.exit(1);
    }
};

createInitialAdmin();