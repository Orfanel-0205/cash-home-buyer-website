//backend/routes/leads.js
// ===========================
// LEADS ROUTES - API Endpoints
// ===========================

const express = require('express');
const router = express.Router();
const { body, validationResult } = require('express-validator');
const Lead = require('../models/Lead');
const { authMiddleware } = require('../middleware/Auth');
const { sendLeadConfirmation, sendAdminNotification } = require('../utils/email');
const { sendAdminSmsNotification, sendLeadSmsConfirmation } = require('../utils/sms');
const { mirrorLeadContact } = require('../utils/leadContacts');

// ===========================
// VALIDATION MIDDLEWARE
// ===========================

const leadValidation = [
    body('propertyAddress').notEmpty().trim().withMessage('Property address is required'),
    body('propertyType').isIn(['Single Family', 'Multi-Family', 'Condo', 'Townhouse', 'Mobile Home', 'Land']).withMessage('Invalid property type'),
    body('propertyCondition').isIn(['Excellent', 'Good', 'Fair', 'Needs Work', 'Poor']).withMessage('Invalid property condition'),
    body('sellingReason').notEmpty().withMessage('Selling reason is required'),
    body('timeframe').notEmpty().withMessage('Timeframe is required'),
    body('fullName').notEmpty().trim().withMessage('Full name is required'),
    body('email').isEmail().normalizeEmail().withMessage('Valid email is required'),
    body('phone')
        .customSanitizer((value) => {
            const raw = String(value || '').trim();
            const digits = raw.replace(/\D/g, '');
            return raw.startsWith('+') ? `+${digits}` : digits;
        })
        .matches(/^\+?\d{10,15}$/)
        .withMessage('Valid phone number is required'),
    body('preferredContact').isIn(['Phone', 'Email', 'Text']).withMessage('Invalid contact preference')
];

// ===========================
// CREATE NEW LEAD (Public - website form)
// ===========================

router.post('/', leadValidation, async (req, res) => {
    try {
        // Validate request
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({
                success: false,
                errors: errors.array()
            });
        }
        
        // Get client IP address
        const ipAddress = req.headers['x-forwarded-for'] || req.connection.remoteAddress;
        
        // Create lead object
        const leadData = {
            propertyAddress: req.body.propertyAddress,
            propertyType: req.body.propertyType,
            propertyCondition: req.body.propertyCondition,
            bedrooms: req.body.bedrooms,
            bathrooms: req.body.bathrooms,
            sellingReason: req.body.sellingReason,
            timeframe: req.body.timeframe,
            oweMortgage: req.body.oweMortgage,
            additionalInfo: req.body.additionalInfo,
            fullName: req.body.fullName,
            email: req.body.email,
            phone: req.body.phone,
            preferredContact: req.body.preferredContact,
            smsConsent: req.body.smsConsent || false,
            tracking: {
                ...req.body.tracking,
                ipAddress,
                timestamp: new Date()
            },
            source: req.body.source || 'website_form'
        };
        
        // Save to database
        const lead = new Lead(leadData);
        await lead.save();

        // Mirror the contact fields to Supabase. Best effort only: MongoDB is the
        // source of truth and this never throws, so a Supabase outage cannot fail
        // the visitor's submission.
        const supabaseMirror = mirrorLeadContact(lead);

        // Emit a socket event for new lead
        const io = req.app.get('socketio');
        io.emit('new_lead', lead);
        
        // Send confirmation email to seller
        try {
            await sendLeadConfirmation(lead);
        } catch (emailError) {
            console.error('Error sending confirmation email:', emailError);
            // Don't fail the request if email fails
        }
        
        // Send notification email to admin
        try {
            await sendAdminNotification(lead);
        } catch (emailError) {
            console.error('Error sending admin notification:', emailError);
            // Don't fail the request if email fails
        }

        // Send confirmation SMS to seller if they consented
        try {
            await sendLeadSmsConfirmation(lead);
        } catch (smsError) {
            console.error('Error sending confirmation SMS:', smsError);
        }

        // Send notification SMS to admin
        try {
            await sendAdminSmsNotification(lead);
        } catch (smsError) {
            console.error('Error sending admin notification SMS:', smsError);
        }
        
        // The email and SMS calls above have already given this time to finish;
        // await it so any failure is logged against this request, not orphaned.
        await supabaseMirror;

        // Return success response
        res.status(201).json({
            success: true,
            message: 'Lead submitted successfully',
            leadId: lead._id
        });
        
    } catch (error) {
        console.error('Error creating lead:', error);
        res.status(500).json({
            success: false,
            message: 'An error occurred while submitting your information. Please try again.'
        });
    }
});

// ===========================
// GET ALL LEADS (Protected - for admin dashboard)
// ===========================

router.get('/', authMiddleware, async (req, res) => {
    try {
        const {
            status,
            startDate,
            endDate,
            limit = 50,
            skip = 0,
            sortBy = 'submittedAt',
            sortOrder = 'desc'
        } = req.query;
        
        // Build query
        const query = {};
        if (status) {
            query.status = status;
        }
        if (startDate || endDate) {
            query.submittedAt = {};
            if (startDate) query.submittedAt.$gte = new Date(startDate);
            if (endDate) query.submittedAt.$lte = new Date(endDate);
        }
        
        // Execute query
        const leads = await Lead.find(query)
            .sort({ [sortBy]: sortOrder === 'desc' ? -1 : 1 })
            .limit(parseInt(limit))
            .skip(parseInt(skip));
        
        // Get total count
        const total = await Lead.countDocuments(query);
        
        res.json({
            success: true,
            data: leads,
            pagination: {
                total,
                limit: parseInt(limit),
                skip: parseInt(skip),
                hasMore: total > (parseInt(skip) + parseInt(limit))
            }
        });
        
    } catch (error) {
        console.error('Error fetching leads:', error);
        res.status(500).json({
            success: false,
            message: 'Error fetching leads'
        });
    }
});

// ===========================
// GET LEAD STATISTICS (Protected)
// Declared before '/:id' so the literal path is not captured by the id param.
// ===========================

router.get('/stats/summary', authMiddleware, async (req, res) => {
    try {
        const stats = await Lead.aggregate([
            {
                $group: {
                    _id: '$status',
                    count: { $sum: 1 }
                }
            }
        ]);
        
        const total = await Lead.countDocuments();
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const todayCount = await Lead.countDocuments({
            submittedAt: { $gte: today }
        });
        
        res.json({
            success: true,
            data: {
                total,
                todayCount,
                byStatus: stats
            }
        });
        
    } catch (error) {
        console.error('Error fetching stats:', error);
        res.status(500).json({
            success: false,
            message: 'Error fetching statistics'
        });
    }
});

// ===========================
// GET SINGLE LEAD BY ID (Protected)
// ===========================

router.get('/:id', authMiddleware, async (req, res) => {
    try {
        const lead = await Lead.findById(req.params.id);
        
        if (!lead) {
            return res.status(404).json({
                success: false,
                message: 'Lead not found'
            });
        }
        
        res.json({
            success: true,
            data: lead
        });
        
    } catch (error) {
        console.error('Error fetching lead:', error);
        res.status(500).json({
            success: false,
            message: 'Error fetching lead'
        });
    }
});

// ===========================
// UPDATE LEAD STATUS (Protected)
// ===========================

router.patch('/:id/status', authMiddleware, async (req, res) => {
    try {
        const { status, updatedBy } = req.body;
        
        const lead = await Lead.findById(req.params.id);
        if (!lead) {
            return res.status(404).json({
                success: false,
                message: 'Lead not found'
            });
        }
        
        await lead.updateStatus(status, updatedBy);
        
        res.json({
            success: true,
            message: 'Lead status updated',
            data: lead
        });
        
    } catch (error) {
        console.error('Error updating lead status:', error);
        res.status(500).json({
            success: false,
            message: 'Error updating lead status'
        });
    }
});

// ===========================
// ADD NOTE TO LEAD (Protected)
// ===========================

router.post('/:id/notes', authMiddleware, async (req, res) => {
    try {
        const { content, createdBy } = req.body;
        
        if (!content) {
            return res.status(400).json({
                success: false,
                message: 'Note content is required'
            });
        }
        
        const lead = await Lead.findById(req.params.id);
        if (!lead) {
            return res.status(404).json({
                success: false,
                message: 'Lead not found'
            });
        }
        
        await lead.addNote(content, createdBy);
        
        res.json({
            success: true,
            message: 'Note added successfully',
            data: lead
        });
        
    } catch (error) {
        console.error('Error adding note:', error);
        res.status(500).json({
            success: false,
            message: 'Error adding note'
        });
    }
});

module.exports = router;
