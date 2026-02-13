//backend/routes/admin.js
// ===========================
// ADMIN ROUTES - API Endpoints
// ===========================

const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const Admin = require('../models/Admin');
const { authMiddleware, authorize } = require('../middleware/Auth');

// ===========================
// ADMIN LOGIN
// ===========================

router.post('/login', async (req, res) => {
    try {
        const { username, password } = req.body;

        if (!username || !password) {
            return res.status(400).json({ success: false, message: 'Username and password are required' });
        }

        const admin = await Admin.findOne({ username: username.toLowerCase() });
        if (!admin) {
            console.log(`Login failed: User '${username}' not found`);
            return res.status(401).json({ success: false, message: 'Invalid credentials' });
        }

        const isMatch = await admin.comparePassword(password);
        if (!isMatch) {
            console.log(`Login failed: Password mismatch for user '${username}'`);
            return res.status(401).json({ success: false, message: 'Invalid credentials' });
        }

        if (!admin.isActive) {
            return res.status(403).json({ success: false, message: 'Account is inactive' });
        }

        await admin.updateLastLogin();

        const payload = {
            id: admin._id,
            username: admin.username,
            role: admin.role
        };

        const token = jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '8h' });

        res.json({
            success: true,
            token,
            admin: {
                id: admin._id,
                username: admin.username,
                email: admin.email,
                fullName: admin.fullName,
                role: admin.role
            }
        });

    } catch (error) {
        console.error('Admin login error:', error);
        res.status(500).json({ success: false, message: 'Server error during login' });
    }
});

// ===========================
// GET CURRENT ADMIN (Protected)
// ===========================

router.get('/me', authMiddleware, async (req, res) => {
    try {
        const admin = await Admin.findById(req.admin.id);
        if (!admin) {
            return res.status(404).json({ success: false, message: 'Admin not found' });
        }
        res.json({ success: true, data: admin });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Server error' });
    }
});


module.exports = router;
