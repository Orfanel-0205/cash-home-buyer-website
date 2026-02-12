// ===========================
// SERVER.JS - Main Application Entry
// ===========================

const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
require('dotenv').config();

// Force IPv4 DNS resolution (Windows fix)
const dns = require('dns');
if (dns.setDefaultResultOrder) {
    dns.setDefaultResultOrder('ipv4first');
}

const app = express();

// ===========================
// MIDDLEWARE
// ===========================

// Security headers
app.use(helmet());

// CORS configuration
app.use(cors({
    origin: process.env.FRONTEND_URL || '*',
    credentials: true
}));

// Body parser
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve static files (frontend)
app.use(express.static('../'));

// Rate limiting
const limiter = rateLimit({
    windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000, // 15 minutes
    max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 100,
    message: 'Too many requests from this IP, please try again later.'
});
app.use('/api/', limiter);

// Logging middleware
app.use((req, res, next) => {
    console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
    next();
});

// ===========================
// DATABASE CONNECTION
// ===========================

const connectDB = async () => {
    try {
        await mongoose.connect(process.env.MONGODB_URI, {
            serverSelectionTimeoutMS: 15000,
            socketTimeoutMS: 45000,
        });
        console.log('✓ Connected to MongoDB');
        console.log(`✓ Database: ${mongoose.connection.name}`);
    } catch (connError) {
        if (connError.message.includes('ECONNREFUSED') || connError.message.includes('querySrv')) {
            console.log('⚠ Connection failed. Attempting to use Google DNS (8.8.8.8)...');
            dns.setServers(['8.8.8.8', '8.8.4.4']);
            try {
                await mongoose.connect(process.env.MONGODB_URI, {
                    serverSelectionTimeoutMS: 15000,
                    socketTimeoutMS: 45000,
                });
                console.log('✓ Connected to MongoDB via Google DNS');
                console.log(`✓ Database: ${mongoose.connection.name}`);
            } catch (fallbackError) {
                console.error('✗ MongoDB connection error (after fallback):', fallbackError.message);
                process.exit(1);
            }
        } else {
            console.error('✗ MongoDB connection error:', connError.message);
            process.exit(1);
        }
    }
};

connectDB();

// ===========================
// ROUTES
// ===========================

// API routes
app.use('/api/leads', require('./routes/leads'));
app.use('/api/admin', require('./routes/admin'));

// Health check endpoint
app.get('/api/health', (req, res) => {
    res.json({
        status: 'ok',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        database: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected'
    });
});

// Catch-all route for frontend (SPA support)
app.get('*', (req, res) => {
    if (!req.path.startsWith('/api')) {
        res.sendFile('index.html', { root: '../' });
    } else {
        res.status(404).json({ error: 'API endpoint not found' });
    }
});

// ===========================
// ERROR HANDLING
// ===========================

// 404 handler
app.use((req, res, next) => {
    res.status(404).json({
        error: 'Not Found',
        message: 'The requested resource does not exist'
    });
});

// Global error handler
app.use((err, req, res, next) => {
    console.error('Error:', err);
    
    res.status(err.status || 500).json({
        error: err.message || 'Internal Server Error',
        ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
    });
});

// ===========================
// START SERVER
// ===========================

const PORT = process.env.PORT || 5000;

const server = app.listen(PORT, () => {
    console.log(`
╔════════════════════════════════════════╗
║   Cash Home Buyers API Server         ║
║   Running on port ${PORT}                ║
║   Environment: ${process.env.NODE_ENV || 'development'}           ║
╚════════════════════════════════════════╝

Frontend: http://localhost:${PORT}
API: http://localhost:${PORT}/api
Health: http://localhost:${PORT}/api/health
    `);
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (err) => {
    console.error('Unhandled Promise Rejection:', err);
    // Close server & exit process
    server.close(() => process.exit(1));
});