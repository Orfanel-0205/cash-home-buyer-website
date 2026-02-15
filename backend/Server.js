//backend/Server.js
// ===========================
// BACKEND SERVER - US CASH BUYERS
// WITH EXPLICIT DNS FIX FOR NODE.JS
// ===========================

require('dotenv').config();

// ==========================================
// 🔧 CRITICAL DNS FIX - MUST BE FIRST!
// ==========================================
const dns = require('dns');

// Check current DNS servers (for debugging)
console.log('📡 Current DNS servers:', dns.getServers());

// EXPLICITLY set DNS servers to Cloudflare and Google
// This fixes the 127.0.0.53 issue
dns.setServers([
    '1.1.1.1',      // Cloudflare Primary
    '1.0.0.1',      // Cloudflare Secondary
    '8.8.8.8',      // Google Primary
    '8.8.4.4'       // Google Secondary
]);

console.log('✅ DNS servers set to:', dns.getServers());
console.log('');

// Force IPv4 first
if (dns.setDefaultResultOrder) {
    dns.setDefaultResultOrder('ipv4first');
}

// ==========================================
// NOW LOAD OTHER MODULES
// ==========================================
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const mongoSanitize = require('express-mongo-sanitize');
const path = require('path');

// Ensure JWT_SECRET is available
if (!process.env.JWT_SECRET) {
    console.warn('⚠️  JWT_SECRET not found in .env, using default (NOT SECURE for production)');
    process.env.JWT_SECRET = 'change_this_to_a_secure_random_string';
}

// Models
const Admin = require('./models/Admin');

const app = express();
const PORT = process.env.PORT || 5000;
const MONGODB_URI = process.env.MONGODB_URI;

if (!MONGODB_URI) {
    console.error('❌ MONGODB_URI not found in .env file!');
    process.exit(1);
}

// ==========================================
// 📧 EMAIL CONFIG CHECK
// ==========================================
// Auto-fix: Trim spaces from credentials to prevent "Missing credentials" errors
if (process.env.EMAIL_USER) process.env.EMAIL_USER = process.env.EMAIL_USER.trim();
if (process.env.EMAIL_PASS) process.env.EMAIL_PASS = process.env.EMAIL_PASS.trim();

if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
    console.warn('⚠️  EMAIL_USER or EMAIL_PASS missing in .env. Emails will not send.');
} else {
    console.log('✅ Email credentials loaded for:', process.env.EMAIL_USER);
}

// ==========================================
// 📱 SMS CONFIG CHECK
// ==========================================
if (!process.env.CLICKSEND_USERNAME || !process.env.CLICKSEND_API_KEY || !process.env.CLICKSEND_FROM_NUMBER) {
    console.warn('⚠️  CLICKSEND credentials missing in .env. SMS will not send.');
}

// ==========================================
// �️ SECURITY MIDDLEWARE
// ==========================================

app.use(helmet({
    contentSecurityPolicy: false,
}));

app.use(cors({
    origin: true,
    credentials: true
}));

app.use(express.json({ limit: '10kb' }));
app.use(express.urlencoded({ extended: true, limit: '10kb' }));
app.use(mongoSanitize());

const apiLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 100,
    message: 'Too many requests from this IP, please try again later.',
    standardHeaders: true,
    legacyHeaders: false,
});
app.use('/api/', apiLimiter);

// ==========================================
// 🔍 REQUEST LOGGER (Debug)
// ==========================================
app.use((req, res, next) => {
    console.log(`📨 ${req.method} ${req.url}`);
    next();
});

// ==========================================
// 🗄️ DATABASE CONNECTION
// ==========================================

let connectionAttempts = 0;
const maxAttempts = 3;

async function connectDB() {
    try {
        connectionAttempts++;
        console.log(`🔌 MongoDB Connection Attempt ${connectionAttempts}/${maxAttempts}`);
        
        await mongoose.connect(MONGODB_URI, {
            serverSelectionTimeoutMS: 30000,
            socketTimeoutMS: 45000,
        });
        
        console.log('\n✅ Connected to MongoDB Atlas!');
        console.log('✓ Database:', mongoose.connection.name);
        console.log('✓ Host:', mongoose.connection.host);
        
        // Seed default admin if none exists
        const adminCount = await Admin.countDocuments();
        if (adminCount === 0) {
            console.log('\n📝 No admin found, creating default admin...');
            await Admin.create({
                username: 'admin',
                password: 'Admin123!',
                email: 'clifford020005@gmail.com',
                fullName: 'System Administrator',
                role: 'admin',
                isActive: true
            });
            console.log('✅ Default admin created!');
            console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
            console.log('Username: admin');
            console.log('Password: Admin123!');
            console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
        } else {
            console.log(`✓ Found ${adminCount} admin(s) in database\n`);
        }
        
    } catch (err) {
        console.error('❌ MongoDB connection error:', err.message);
        
        if (connectionAttempts < maxAttempts) {
            console.log(`\n⏳ Retrying in 3 seconds...`);
            setTimeout(connectDB, 3000);
        } else {
            console.error('\n❌ Failed to connect to MongoDB after', maxAttempts, 'attempts');
            console.error('\n💡 Troubleshooting:');
            console.error('   1. Check if MONGODB_URI is correct in .env');
            console.error('   2. Verify MongoDB Atlas allows connections from 0.0.0.0/0');
            console.error('   3. Check your internet connection');
            console.error('   4. Run: ipconfig /flushdns');
            console.error('\n   DNS servers are set to:', dns.getServers());
        }
    }
}

// Handle MongoDB events
mongoose.connection.on('disconnected', () => {
    console.warn('⚠️  MongoDB disconnected');
});

mongoose.connection.on('error', (err) => {
    console.error('❌ MongoDB error:', err.message);
});

mongoose.connection.on('connected', () => {
    console.log('✅ Mongoose connected successfully');
});

// Start connection attempt
connectDB();

const http = require('http');
const server = http.createServer(app);
const { Server } = require("socket.io");
const io = new Server(server);

app.set('socketio', io);

// ==========================================
// 🚀 API ROUTES
// ==========================================

app.get('/api/health', (req, res) => {
    res.json({ 
        status: 'ok', 
        database: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected',
        timestamp: new Date().toISOString()
    });
});

app.use('/api/admin', require('./routes/admin'));
app.use('/api/leads', require('./routes/leads'));
app.use('/api', require('./routes/sms'));

// ==========================================
// 🔍 SEO ROUTES (Sitemap & Robots)
// ==========================================

app.get('/sitemap.xml', (req, res) => {
    const baseUrl = process.env.FRONTEND_URL || `http://localhost:${PORT}`;
    const currentDate = new Date().toISOString().split('T')[0];
    
    const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
    <url>
        <loc>${baseUrl}/</loc>
        <lastmod>${currentDate}</lastmod>
        <changefreq>daily</changefreq>
        <priority>1.0</priority>
    </url>
    <url>
        <loc>${baseUrl}/pages/sell-your-house/sell.html</loc>
        <lastmod>${currentDate}</lastmod>
        <changefreq>weekly</changefreq>
        <priority>0.8</priority>
    </url>
</urlset>`;
    
    res.header('Content-Type', 'application/xml');
    res.send(sitemap);
});

app.get('/robots.txt', (req, res) => {
    const baseUrl = process.env.FRONTEND_URL || `http://localhost:${PORT}`;
    const robots = `User-agent: *
Allow: /
Disallow: /api/
Disallow: /pages/admin/
Sitemap: ${baseUrl}/sitemap.xml`;
    
    res.header('Content-Type', 'text/plain');
    res.send(robots);
});

// ==========================================
// ⚠️ GLOBAL ERROR HANDLER
// ==========================================
app.use((err, req, res, next) => {
    console.error('❌ Global Error Handler:', err);
    res.status(500).json({ 
        success: false, 
        message: 'Internal Server Error',
        error: err.message 
    });
});

// ==========================================
// 🌐 STATIC FILES
// ==========================================

app.use(express.static(path.join(__dirname, '../')));

app.get('*', (req, res) => {
    if (req.path.startsWith('/api/')) {
        return res.status(404).json({ success: false, message: 'API endpoint not found' });
    }
    res.sendFile(path.join(__dirname, '../index.html'));
});

// ==========================================
// 🚀 START SERVER
// ==========================================

server.listen(PORT, () => {
    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log(`    🚀 Server running on http://localhost:${PORT}`);
    console.log(`    📁 Serving static files`);
    console.log(`    🌐 Admin: http://localhost:${PORT}/pages/admin/admin-login.html`);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
});

io.on('connection', (socket) => {
    console.log('✅ a user connected');
    socket.on('disconnect', () => {
        console.log('🔥 user disconnected');
    });
});

// Graceful shutdown
process.on('SIGTERM', () => {
    console.log('👋 SIGTERM - closing server');
    server.close(() => {
        mongoose.connection.close(false, () => {
            process.exit(0);
        });
    });
});