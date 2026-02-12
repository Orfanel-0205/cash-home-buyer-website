// ===========================
// INIT SCRIPT - Create First Admin User
// ===========================
// Run this once to create your first admin account
// Command: node init.js

require('dotenv').config();
const mongoose = require('mongoose');
const Admin = require('./models/Admin');

const createInitialAdmin = async () => {
    try {
        // Connect to MongoDB
        await mongoose.connect(process.env.MONGODB_URI, {
            useNewUrlParser: true,
            useUnifiedTopology: true,
        });
        console.log('✓ Connected to MongoDB');
        
        // Check if admin already exists
        const existingAdmin = await Admin.findOne({ role: 'admin' });
        if (existingAdmin) {
            console.log('⚠ Admin user already exists!');
            console.log(`Username: ${existingAdmin.username}`);
            process.exit(0);
        }
        
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
        console.log('');
        console.log('⚠ IMPORTANT: Change the default password immediately!');
        console.log('');
        
        process.exit(0);
        
    } catch (error) {
        console.error('Error creating admin:', error);
        process.exit(1);
    }
};

createInitialAdmin();