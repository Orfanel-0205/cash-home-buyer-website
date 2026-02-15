//backend/utils/Email.js
const nodemailer = require('nodemailer');

/**
 * Creates the transporter only when needed and validates credentials
 */
const createTransporter = () => {
    const user = process.env.EMAIL_USER;
    const pass = process.env.EMAIL_PASS;

    if (!user || !pass) {
        console.error('❌ Email Error: Missing credentials in .env file');
        return null;
    }

    return nodemailer.createTransport({
        service: process.env.EMAIL_SERVICE || 'gmail',
        auth: {
            user: user,
            pass: pass
        }
    });
};

/**
 * Generic send email function with error handling
 */
const sendEmail = async (options) => {
    const transporter = createTransporter();
    if (!transporter) return false;

    try {
        const info = await transporter.sendMail(options);
        console.log(`📧 Email sent: ${info.messageId}`);
        return true;
    } catch (error) {
        console.error('❌ Error sending email:', error.message);
        if (error.code === 'EAUTH') {
            console.error('   👉 FIX: Check your EMAIL_USER and EMAIL_PASS in .env');
            console.error('   👉 NOTE: If using Gmail, ensure you are using an App Password, not your login password.');
        }
        return false;
    }
};

/**
 * Sends confirmation email to the seller
 */
const sendLeadConfirmation = async (lead) => {
    if (!lead.email) return;

    const message = {
        from: process.env.EMAIL_FROM || process.env.EMAIL_USER,
        to: lead.email,
        subject: 'We received your inquiry - Home Sell Direct',
        text: `Hi ${lead.fullName},\n\nThanks for reaching out! We received your details regarding ${lead.propertyAddress}.\n\nWe will review your property and get back to you shortly with a cash offer.\n\nBest regards,\nHome Sell Direct Team`
    };

    return sendEmail(message);
};

/**
 * Sends notification email to the admin
 */
const sendAdminNotification = async (lead) => {
    const adminEmail = process.env.ADMIN_EMAIL;
    if (!adminEmail) return;

    const message = {
        from: process.env.EMAIL_FROM || process.env.EMAIL_USER,
        to: adminEmail,
        subject: `🔔 New Lead: ${lead.propertyAddress}`,
        text: `New lead received!\n\nName: ${lead.fullName}\nPhone: ${lead.phone}\nEmail: ${lead.email}\nAddress: ${lead.propertyAddress}\nSelling Reason: ${lead.sellingReason}\n\nLogin to the dashboard to view full details.`
    };

    return sendEmail(message);
};

module.exports = { sendLeadConfirmation, sendAdminNotification };