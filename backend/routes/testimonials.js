const express = require('express');
const router = express.Router();
const Testimonial = require('../models/Testimonial'); // Adjust path if needed
const nodemailer = require('nodemailer');

// ==========================================
// GET ALL APPROVED TESTIMONIALS (Public)
// ==========================================
router.get('/testimonials', async (req, res) => {
    try {
        const testimonials = await Testimonial.find({ isApproved: true })
            .sort({ isFeatured: -1, createdAt: -1 })
            .select('-email'); // Don't send emails to frontend
        
        res.status(200).json({
            success: true,
            count: testimonials.length,
            data: testimonials
        });
    } catch (error) {
        console.error('Error fetching testimonials:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch testimonials'
        });
    }
});

// ==========================================
// POST NEW TESTIMONIAL (Public)
// ==========================================
router.post('/testimonials', async (req, res) => {
    try {
        console.log('📝 Received testimonial submission:', req.body);

        const { name, location, message, rating, situation, email } = req.body;

        // Validate required fields
        if (!name || !location || !message || !rating) {
            console.log('❌ Validation failed: Missing required fields');
            return res.status(400).json({
                success: false,
                message: 'Please provide name, location, message, and rating'
            });
        }

        // Validate rating range
        if (rating < 1 || rating > 5) {
            console.log('❌ Validation failed: Invalid rating');
            return res.status(400).json({
                success: false,
                message: 'Rating must be between 1 and 5'
            });
        }

        // Create new testimonial
        const testimonial = new Testimonial({
            name,
            location,
            message,
            rating,
            situation: situation || '',
            email: email || '',
            isApproved: true, // Requires admin approval
            isFeatured: false,
            createdAt: new Date()
        });

        await testimonial.save();

        console.log('✅ New testimonial saved to database:', {
            id: testimonial._id,
            name,
            location,
            rating
        });

        // Send confirmation email if email provided
        if (email && process.env.EMAIL_USER && process.env.EMAIL_PASS) {
            try {
                await sendConfirmationEmail(email, name);
                console.log('✅ Confirmation email sent to:', email);
            } catch (emailError) {
                console.error('⚠️ Failed to send confirmation email:', emailError.message);
                // Don't fail the request if email fails
            }
        }

        // Notify admin via Socket.IO
        const io = req.app.get('socketio');
        if (io) {
            io.emit('new-testimonial', {
                name,
                location,
                rating,
                timestamp: new Date()
            });
            console.log('✅ Socket.IO notification sent');
        }

        res.status(201).json({
            success: true,
            message: 'Thank you for your review! It will be posted after verification.',
            data: {
                id: testimonial._id,
                name: testimonial.name,
                rating: testimonial.rating
            }
        });

    } catch (error) {
        console.error('❌ Error saving testimonial:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to submit testimonial. Please try again.',
            error: error.message
        });
    }
});

// ==========================================
// SEND CONFIRMATION EMAIL
// ==========================================
async function sendConfirmationEmail(email, name) {
    if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
        console.log('⚠️ Email not configured, skipping confirmation email');
        return;
    }

    const transporter = nodemailer.createTransport({
        service: 'gmail',
        auth: {
            user: process.env.EMAIL_USER,
            pass: process.env.EMAIL_PASS
        }
    });

    const mailOptions = {
        from: `"HOME SELL DIRECT" <${process.env.EMAIL_USER}>`,
        to: email,
        subject: 'Thank You for Your Review! - HOME SELL DIRECT',
        html: `
            <!DOCTYPE html>
            <html>
            <head>
                <style>
                    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
                    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
                    .header { background: #D32F2F; color: white; padding: 20px; text-align: center; }
                    .content { padding: 30px; background: #f9f9f9; }
                    .footer { text-align: center; padding: 20px; color: #666; font-size: 12px; }
                </style>
            </head>
            <body>
                <div class="container">
                    <div class="header">
                        <h1>Thank You for Your Review!</h1>
                    </div>
                    <div class="content">
                        <p>Dear ${name},</p>
                        <p>Thank you for taking the time to share your experience with HOME SELL DIRECT!</p>
                        <p>Your review has been received and will be reviewed by our team. We typically post reviews within 24-48 hours after verification.</p>
                        <p>Your feedback helps other homeowners make informed decisions about selling their houses for cash.</p>
                        <p>If you have any questions, please don't hesitate to contact us.</p>
                        <p>Best regards,<br>The HOME SELL DIRECT Team</p>
                    </div>
                    <div class="footer">
                        <p>HOME SELL DIRECT<br>
                        Email: info@uscashbuyers.com<br>
                        Phone: 1-800-CASH-NOW</p>
                    </div>
                </div>
            </body>
            </html>
        `
    };

    await transporter.sendMail(mailOptions);
}

module.exports = router;