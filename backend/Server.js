// ===========================
// BACKEND SERVER - HOME SELL DIRECT
// ===========================

const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });

const {
    configureMongoDns,
    getMongooseConnectOptions,
    getTroubleshootingHints,
    sanitizeErrorMessage,
    validateMongoUri
} = require('./config/database');

let mongoConfig;
try {
    mongoConfig = validateMongoUri(process.env.MONGODB_URI);
    process.env.MONGODB_URI = mongoConfig.uri;

    const dnsConfig = configureMongoDns(mongoConfig.isSrv);
    console.log('MongoDB URI loaded for host:', mongoConfig.host);
    console.log('MongoDB database:', mongoConfig.databaseName);
    if (dnsConfig.changed) {
        console.log('MongoDB SRV DNS resolvers:', dnsConfig.servers.join(', '));
    }
} catch (error) {
    console.error('MongoDB configuration error:', sanitizeErrorMessage(error.message));
    process.exit(1);
}

const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const mongoSanitize = require('express-mongo-sanitize');
const http = require('http');
const { Server } = require('socket.io');

const Admin = require('./models/Admin');

const app = express();
const PORT = process.env.PORT || 5000;
const MONGODB_URI = mongoConfig.uri;
const maxAttempts = 3;

if (!process.env.JWT_SECRET) {
    console.warn('JWT_SECRET not found in .env, using default. Set a strong secret before production.');
    process.env.JWT_SECRET = 'change_this_to_a_secure_random_string';
}

if (process.env.EMAIL_USER) process.env.EMAIL_USER = process.env.EMAIL_USER.trim();
if (process.env.EMAIL_PASS) process.env.EMAIL_PASS = process.env.EMAIL_PASS.trim();

if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
    console.warn('EMAIL_USER or EMAIL_PASS missing in .env. Emails will not send.');
} else {
    console.log('Email credentials loaded for:', process.env.EMAIL_USER);
}

if (!process.env.CLICKSEND_USERNAME || !process.env.CLICKSEND_API_KEY) {
    console.warn('CLICKSEND credentials missing in .env. SMS will not send.');
} else {
    console.log('ClickSend credentials loaded for:', process.env.CLICKSEND_USERNAME);
}

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
    legacyHeaders: false
});
app.use('/api/', apiLimiter);

app.use((req, res, next) => {
    console.log(`${req.method} ${req.url}`);
    next();
});

const server = http.createServer(app);
const io = new Server(server, {
    cors: { origin: '*', methods: ['GET', 'POST'] }
});

app.set('socketio', io);

io.on('connection', (socket) => {
    console.log('User connected via WebSocket');
    socket.on('disconnect', () => console.log('User disconnected'));
});

function wait(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
}

async function ensureAdminExists() {
    const adminCount = await Admin.countDocuments();

    if (adminCount > 0) {
        console.log(`Found ${adminCount} admin(s) in database`);
        return;
    }

    const { ADMIN_USERNAME, ADMIN_PASSWORD, ADMIN_EMAIL } = process.env;
    if (!ADMIN_USERNAME || !ADMIN_PASSWORD || !ADMIN_EMAIL) {
        console.warn('No admin user exists. Set ADMIN_USERNAME, ADMIN_PASSWORD, and ADMIN_EMAIL, then run npm run init.');
        return;
    }

    await Admin.create({
        username: ADMIN_USERNAME,
        password: ADMIN_PASSWORD,
        email: ADMIN_EMAIL,
        fullName: process.env.ADMIN_FULL_NAME || 'System Administrator',
        role: 'admin',
        isActive: true
    });

    console.log('Default admin created from environment credentials.');
    console.log('Admin username:', ADMIN_USERNAME);
    console.log('Admin email:', ADMIN_EMAIL);
}

async function connectDatabase() {
    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
        try {
            console.log(`MongoDB connection attempt ${attempt}/${maxAttempts}`);

            await mongoose.connect(MONGODB_URI, getMongooseConnectOptions());
            const ping = await mongoose.connection.db.admin().ping();

            if (!ping || ping.ok !== 1) {
                throw new Error('MongoDB ping did not return ok: 1.');
            }

            console.log('Connected to MongoDB Atlas.');
            console.log('Database:', mongoose.connection.name);
            console.log('Host:', mongoose.connection.host);

            await ensureAdminExists();
            return;
        } catch (err) {
            await mongoose.disconnect().catch(() => {});
            console.error('MongoDB connection error:', sanitizeErrorMessage(err.message));

            if (attempt < maxAttempts) {
                console.log('Retrying MongoDB connection in 3 seconds...');
                await wait(3000);
            } else {
                console.error(`Failed to connect to MongoDB after ${maxAttempts} attempts.`);
                console.error('Troubleshooting:');
                getTroubleshootingHints(err, mongoConfig.isSrv).forEach((hint) => {
                    console.error(`- ${hint}`);
                });
                throw err;
            }
        }
    }
}

mongoose.connection.on('disconnected', () => console.warn('MongoDB disconnected'));
mongoose.connection.on('error', (err) => console.error('MongoDB error:', sanitizeErrorMessage(err.message)));
mongoose.connection.on('connected', () => console.log('Mongoose connected successfully'));

app.get('/api/health', (req, res) => {
    const connected = mongoose.connection.readyState === 1;

    res.status(connected ? 200 : 503).json({
        status: connected ? 'ok' : 'degraded',
        database: connected ? 'connected' : 'disconnected',
        timestamp: new Date().toISOString()
    });
});

app.use('/api/admin', require('./routes/admin'));
app.use('/api/leads', require('./routes/leads'));
app.use('/api', require('./routes/sms'));
app.use('/api', require('./routes/testimonials'));

app.get('/sitemap.xml', (req, res) => {
    const baseUrl = process.env.FRONTEND_URL || `http://localhost:${PORT}`;
    const date = new Date().toISOString().split('T')[0];
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

app.use((req, res, next) => {
    const forbidden = ['/backend', '/.env', '/node_modules', '/.git'];
    if (forbidden.some((folder) => req.path.startsWith(folder))) {
        return res.status(403).send('Forbidden');
    }
    next();
});

app.use(express.static(path.join(__dirname, '../')));

app.get('*', (req, res) => {
    if (req.path.startsWith('/api/')) {
        return res.status(404).json({ success: false, message: 'API endpoint not found' });
    }
    res.sendFile(path.join(__dirname, '../index.html'));
});

app.use((err, req, res, next) => {
    console.error('Global Error Handler:', err);
    res.status(500).json({
        success: false,
        message: 'Internal Server Error',
        error: err.message
    });
});

async function startServer() {
    try {
        await connectDatabase();
        server.listen(PORT, () => {
            console.log(`Server running: http://localhost:${PORT}`);
            console.log(`Admin panel: http://localhost:${PORT}/pages/admin/admin-login.html`);
        });
    } catch (error) {
        console.error('Server not started because MongoDB connection failed.');
        process.exit(1);
    }
}

server.on('error', (error) => {
    if (error.code === 'EADDRINUSE') {
        console.error(`Server port ${PORT} is already in use. Stop the process using that port or set a different PORT in .env.`);
    } else {
        console.error('Server error:', error.message);
    }
    process.exit(1);
});

function shutdown(signal) {
    console.log(`${signal} received. Shutting down gracefully.`);
    server.close(() => {
        mongoose.connection.close(false, () => process.exit(0));
    });
}

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));

startServer();
