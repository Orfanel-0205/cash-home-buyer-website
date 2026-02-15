//backend/Init.js
// ===========================
// INIT SCRIPT - Create First Admin User
// WITH DNS FIX
// ===========================

require('dotenv').config();

// ==========================================
// 🔧 DNS FIX - MUST BE FIRST
// ==========================================
const dns = require('dns');

console.log('📡 Current DNS servers:', dns.getServers());

// Set DNS servers explicitly (fixes 127.0.0.53 issue)
dns.setServers(['1.1.1.1', '1.0.0.1', '8.8.8.8', '8.8.4.4']);

console.log('✅ DNS servers set to:', dns.getServers());
console.log('');

// Force IPv4
if (dns.setDefaultResultOrder) {
    dns.setDefaultResultOrder('ipv4first');
}

// ==========================================
// NOW LOAD MONGOOSE
// ==========================================
const mongoose = require('mongoose');
const Admin = require('./models/Admin');

const createInitialAdmin = async () => {
    try {
        console.log('🔌 Connecting to MongoDB Atlas...');
        
        await mongoose.connect(process.env.MONGODB_URI, {
            serverSelectionTimeoutMS: 15000,
            socketTimeoutMS: 45000,
        });
        
        console.log('✅ Successfully connected to MongoDB');
        console.log(`✓ Database: ${mongoose.connection.name}`);
        console.log(`✓ Host: ${mongoose.connection.host}`);
        
        // Check if admin already exists
        console.log('\n🔍 Checking for existing admin user...');
        const existingAdmin = await Admin.findOne({ role: 'admin' });
        
        if (existingAdmin) {
            console.log('✅ Admin user already exists!');
            console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
            console.log(`Username: ${existingAdmin.username}`);
            console.log(`Email: ${existingAdmin.email}`);
            console.log(`Created: ${existingAdmin.createdAt}`);
            console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
            await mongoose.connection.close();
            process.exit(0);
        }
        
        console.log('📝 No admin user found. Creating new admin...');
        
        // Create admin user
        const admin = new Admin({
            username: process.env.ADMIN_USERNAME || 'admin',
            password: process.env.ADMIN_PASSWORD || 'Admin123!',
            email: process.env.ADMIN_EMAIL || 'clifford020005@gmail.com',
            fullName: 'System Administrator',
            role: 'admin',
            isActive: true
        });
        
        await admin.save();
        
        console.log('');
        console.log('╔════════════════════════════════════════╗');
        console.log('║   ✅ ADMIN USER CREATED SUCCESSFULLY  ║');
        console.log('╚════════════════════════════════════════╝');
        console.log('');
        console.log('🔑 Login Credentials:');
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        console.log(`Username: ${admin.username}`);
        console.log(`Password: ${process.env.ADMIN_PASSWORD || 'Admin123!'}`);
        console.log(`Email: ${admin.email}`);
        console.log(`Role: ${admin.role}`);
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        console.log('');
        console.log('⚠️  IMPORTANT: Change the password after first login!');
        console.log('');
        console.log('🎯 Next steps:');
        console.log('1. Run: npm start');
        console.log('2. Open: http://localhost:5000/pages/admin/admin-login.html');
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
            console.log('\n💡 SOLUTIONS:');
            console.log('');
            console.log('1. Flush DNS cache:');
            console.log('   ipconfig /flushdns');
            console.log('');
            console.log('2. Restart your computer');
            console.log('');
            console.log('3. Check MongoDB Atlas network access (0.0.0.0/0)');
            console.log('');
            console.log('Current DNS servers:', dns.getServers());
            console.log('');
        }
        
        process.exit(1);
    }
};

createInitialAdmin();