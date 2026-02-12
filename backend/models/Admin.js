// ===========================
// ADMIN ROUTES - Authentication & Management
// ===========================

const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const { body, validationResult } = require('express-validator');
const Admin = require('./Admin');
const { authMiddleware } = require('../middleware/auth');

// ===========================
// LOGIN
// ===========================

router.post('/login', [
    body('username').notEmpty().trim(),
    body('password').notEmpty()
], async (req, res) => {
    try {
        // Validate request
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({
                success: false,
                errors: errors.array()
            });
        }
        
        const { username, password } = req.body;
        
        // Find admin
        const admin = await Admin.findOne({ username });
        if (!admin) {
            return res.status(401).json({
                success: false,
                message: 'Invalid credentials'
            });
        }
        
        // Check if active
        if (!admin.isActive) {
            return res.status(401).json({
                success: false,
                message: 'Account is disabled'
            });
        }
        
        // Verify password
        const isMatch = await admin.comparePassword(password);
        if (!isMatch) {
            return res.status(401).json({
                success: false,
                message: 'Invalid credentials'
            });
        }
        
        // Update last login
        await admin.updateLastLogin();
        
        // Generate JWT token
        const token = jwt.sign(
            {
                id: admin._id,
                username: admin.username,
                role: admin.role
            },
            process.env.JWT_SECRET,
            { expiresIn: '7d' }
        );
        
        res.json({
            success: true,
            message: 'Login successful',
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
        console.error('Login error:', error);
        res.status(500).json({
            success: false,
            message: 'Login failed'
        });
    }
});

// ===========================
// VERIFY TOKEN
// ===========================

router.get('/verify', authMiddleware, async (req, res) => {
    try {
        const admin = await Admin.findById(req.admin.id);
        
        if (!admin || !admin.isActive) {
            return res.status(401).json({
                success: false,
                message: 'Invalid token'
            });
        }
        
        res.json({
            success: true,
            admin: {
                id: admin._id,
                username: admin.username,
                email: admin.email,
                fullName: admin.fullName,
                role: admin.role
            }
        });
        
    } catch (error) {
        console.error('Token verification error:', error);
        res.status(500).json({
            success: false,
            message: 'Verification failed'
        });
    }
});

// ===========================
// CREATE ADMIN (Protected)
// ===========================

router.post('/create', authMiddleware, [
    body('username').notEmpty().trim(),
    body('password').isLength({ min: 6 }),
    body('email').isEmail().normalizeEmail(),
    body('fullName').notEmpty().trim(),
    body('role').optional().isIn(['admin', 'manager', 'agent'])
], async (req, res) => {
    try {
        // Only admins can create new users
        if (req.admin.role !== 'admin') {
            return res.status(403).json({
                success: false,
                message: 'Unauthorized'
            });
        }
        
        // Validate request
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({
                success: false,
                errors: errors.array()
            });
        }
        
        const { username, password, email, fullName, role } = req.body;
        
        // Check if username or email already exists
        const existing = await Admin.findOne({
            $or: [{ username }, { email }]
        });
        
        if (existing) {
            return res.status(400).json({
                success: false,
                message: 'Username or email already exists'
            });
        }
        
        // Create new admin
        const newAdmin = new Admin({
            username,
            password,
            email,
            fullName,
            role: role || 'agent'
        });
        
        await newAdmin.save();
        
        res.status(201).json({
            success: true,
            message: 'Admin created successfully',
            admin: {
                id: newAdmin._id,
                username: newAdmin.username,
                email: newAdmin.email,
                fullName: newAdmin.fullName,
                role: newAdmin.role
            }
        });
        
    } catch (error) {
        console.error('Error creating admin:', error);
        res.status(500).json({
            success: false,
            message: 'Error creating admin'
        });
    }
});

// ===========================
// GET ALL ADMINS (Protected)
// ===========================

router.get('/users', authMiddleware, async (req, res) => {
    try {
        // Only admins can view all users
        if (req.admin.role !== 'admin') {
            return res.status(403).json({
                success: false,
                message: 'Unauthorized'
            });
        }
        
        const admins = await Admin.find().select('-password');
        
        res.json({
            success: true,
            data: admins
        });
        
    } catch (error) {
        console.error('Error fetching admins:', error);
        res.status(500).json({
            success: false,
            message: 'Error fetching admins'
        });
    }
});

// ===========================
// UPDATE ADMIN (Protected)
// ===========================

router.patch('/:id', authMiddleware, async (req, res) => {
    try {
        // Only admins can update users, or users can update themselves
        if (req.admin.role !== 'admin' && req.admin.id !== req.params.id) {
            return res.status(403).json({
                success: false,
                message: 'Unauthorized'
            });
        }
        
        const updates = {};
        const allowedUpdates = ['email', 'fullName', 'isActive', 'role'];
        
        Object.keys(req.body).forEach(key => {
            if (allowedUpdates.includes(key)) {
                updates[key] = req.body[key];
            }
        });
        
        // Only admins can change roles
        if (updates.role && req.admin.role !== 'admin') {
            delete updates.role;
        }
        
        const admin = await Admin.findByIdAndUpdate(
            req.params.id,
            updates,
            { new: true }
        ).select('-password');
        
        if (!admin) {
            return res.status(404).json({
                success: false,
                message: 'Admin not found'
            });
        }
        
        res.json({
            success: true,
            message: 'Admin updated successfully',
            data: admin
        });
        
    } catch (error) {
        console.error('Error updating admin:', error);
        res.status(500).json({
            success: false,
            message: 'Error updating admin'
        });
    }
});

// ===========================
// CHANGE PASSWORD
// ===========================

router.post('/change-password', authMiddleware, [
    body('currentPassword').notEmpty(),
    body('newPassword').isLength({ min: 6 })
], async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({
                success: false,
                errors: errors.array()
            });
        }
        
        const { currentPassword, newPassword } = req.body;
        
        const admin = await Admin.findById(req.admin.id);
        
        // Verify current password
        const isMatch = await admin.comparePassword(currentPassword);
        if (!isMatch) {
            return res.status(401).json({
                success: false,
                message: 'Current password is incorrect'
            });
        }
        
        // Update password
        admin.password = newPassword;
        await admin.save();
        
        res.json({
            success: true,
            message: 'Password changed successfully'
        });
        
    } catch (error) {
        console.error('Error changing password:', error);
        res.status(500).json({
            success: false,
            message: 'Error changing password'
        });
    }
});

module.exports = router;