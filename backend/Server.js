// ===========================
// BACKEND SERVER - HOME SELL DIRECT
// ===========================

require('dotenv').config();

// ==========================================
// 🔧 CRITICAL DNS FIX - MUST BE FIRST!
// ==========================================
const dns = require('dns');

console.log('📡 Current DNS servers:', dns.getServers());

dns.setServers([
    '1.1.1.1',   // Cloudflare Primary
    '1.0.0.1',   // Cloudflare Secondary
    '8.8.8.8',   // Google Primary
    '8.8.4.4'    // Google Secondary
]);

console.log('✅ DNS servers set to:', dns.getServers());
console.log('');

if (dns.setDefaultResultOrder) {
    dns.setDefaultResultOrder('ipv4first');
}

// ==========================================
// LOAD MODULES
// ==========================================
const express    = require('express');
const mongoose   = require('mongoose');
const cors       = require('cors');
const helmet     = require('helmet');
const rateLimit  = require('express-rate-limit');
const mongoSanitize = require('express-mongo-sanitize');
const path       = require('path');

if (!process.env.JWT_SECRET) {
    console.warn('⚠️  JWT_SECRET not found in .env, using default (NOT SECURE for production)');
    process.env.JWT_SECRET = 'change_this_to_a_secure_random_string';
}

const Admin = require('./models/Admin');

const app  = express();
const PORT = process.env.PORT || 5000;
const MONGODB_URI = process.env.MONGODB_URI;

if (!MONGODB_URI) {
    console.error('❌ MONGODB_URI not found in .env file!');
    process.exit(1);
}

// ==========================================
// 📧 EMAIL CONFIG CHECK
// ==========================================
if (process.env.EMAIL_USER) process.env.EMAIL_USER = process.env.EMAIL_USER.trim();
if (process.env.EMAIL_PASS) process.env.EMAIL_PASS = process.env.EMAIL_PASS.trim();

if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
    console.warn('⚠️  EMAIL_USER or EMAIL_PASS missing in .env. Emails will not send.');
} else {
    console.log('✅ Email credentials loaded for:', process.env.EMAIL_USER);
}

// ==========================================
// 📱 SMS CONFIG CHECK (CLICKSEND)
// ==========================================
if (!process.env.CLICKSEND_USERNAME || !process.env.CLICKSEND_API_KEY) {
    console.warn('⚠️  CLICKSEND credentials missing in .env. SMS will not send.');
} else {
    console.log('✅ ClickSend credentials loaded for:', process.env.CLICKSEND_USERNAME);
}

// ==========================================
// 🛡️ SECURITY MIDDLEWARE
// ==========================================
app.use(helmet({ contentSecurityPolicy: false }));

app.use(cors({ origin: true, credentials: true }));

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
// 🔍 REQUEST LOGGER
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

        // ─────────────────────────────────────────
        // Seed default admin if none exists
        // Username: AdminHSD  |  Password: !0]hW/9dq)#S6;/
        // ─────────────────────────────────────────
        const adminCount = await Admin.countDocuments();
        if (adminCount === 0) {
            console.log('\n📝 No admin found, creating default admin...');
            await Admin.create({
                username: 'AdminHSD',
                password: '!0]hW/9dq)#S6;/',
                email: 'clifford020005@gmail.com',
                fullName: 'System Administrator',
                role: 'admin',
                isActive: true
            });
            console.log('✅ Default admin created!');
            console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
            console.log('Username : AdminHSD');
            console.log('Password : !0]hW/9dq)#S6;/');
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
            console.error('\n❌ Failed to connect after', maxAttempts, 'attempts');
            console.error('\n💡 Troubleshooting:');
            console.error('   1. Check MONGODB_URI in .env');
            console.error('   2. Verify Atlas allows 0.0.0.0/0');
            console.error('   3. Check internet connection');
            console.error('   4. Run: ipconfig /flushdns');
            console.error('\n   DNS servers:', dns.getServers());
        }
    }
}

mongoose.connection.on('disconnected', () => console.warn('⚠️  MongoDB disconnected'));
mongoose.connection.on('error', (err)  => console.error('❌ MongoDB error:', err.message));
mongoose.connection.on('connected', ()  => console.log('✅ Mongoose connected successfully'));

connectDB();

// ==========================================
// 🔌 SOCKET.IO
// ==========================================
const http = require('http');
const server = http.createServer(app);
const { Server } = require('socket.io');
const io = new Server(server, {
    cors: { origin: '*', methods: ['GET', 'POST'] }
});

app.set('socketio', io);

io.on('connection', (socket) => {
    console.log('✅ A user connected via WebSocket');
    socket.on('disconnect', () => console.log('🔥 User disconnected'));
});

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

app.use('/api/admin',       require('./routes/admin'));
app.use('/api/leads',       require('./routes/leads'));
app.use('/api',             require('./routes/sms'));
app.use('/api',             require('./routes/testimonials'));

// ==========================================
// 🔍 SEO ROUTES
// ==========================================
app.get('/sitemap.xml', (req, res) => {
    const baseUrl = process.env.FRONTEND_URL || `http://localhost:${PORT}`;
    const date    = new Date().toISOString().split('T')[0];
    res.header('Content-Type', 'application/xml');
    res.send(`<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
    <url><loc>${baseUrl}/</loc><lastmod>${date}</lastmod><changefreq>daily</changefreq><priority>1.0</priority></url>
    <url><loc>${baseUrl}/pages/sell-your-house/sell.html</loc><lastmod>${date}</lastmod><changefreq>weekly</changefreq><priority>0.8</priority></url>
</urlset>`);
});

app.get('/robots.txt', (req, res) => {
    const baseUrl = process.env.FRONTEND_URL || `http://localhost:${PORT}`;
    res.header('Content-Type', 'text/plain');
    res.send(`User-agent: *\nAllow: /\nDisallow: /api/\nDisallow: /pages/admin/\nSitemap: ${baseUrl}/sitemap.xml`);
});

// ==========================================
// ⚠️ GLOBAL ERROR HANDLER
// ==========================================
app.use((err, req, res, next) => {
    console.error('❌ Global Error Handler:', err);
    res.status(500).json({ success: false, message: 'Internal Server Error', error: err.message });
});

// ==========================================
// 🌐 STATIC FILES
// ==========================================
app.use((req, res, next) => {
    const forbidden = ['/backend', '/.env', '/node_modules', '/.git'];
    if (forbidden.some(f => req.path.startsWith(f))) return res.status(403).send('Forbidden');
    next();
});

app.use(express.static(path.join(__dirname, '../')));

app.get('*', (req, res) => {
    if (req.path.startsWith('/api/'))
        return res.status(404).json({ success: false, message: 'API endpoint not found' });
    res.sendFile(path.join(__dirname, '../index.html'));
});

// ==========================================
// 🚀 START SERVER
// ==========================================
server.listen(PORT, () => {
    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log(`    🚀 Server running  →  http://localhost:${PORT}`);
    console.log(`    🌐 Admin Panel     →  http://localhost:${PORT}/pages/admin/admin-login.html`);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
});

// Graceful shutdown
process.on('SIGTERM', () => {
    console.log('👋 SIGTERM received — shutting down gracefully');
    server.close(() => mongoose.connection.close(false, () => process.exit(0)));
});