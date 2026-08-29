//backend/utils/email.js
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

    // Without explicit timeouts nodemailer waits indefinitely. Cloud hosts often
    // throttle or block outbound SMTP, so a send can hang forever and hold open
    // whatever is awaiting it.
    const timeout = parseInt(process.env.EMAIL_TIMEOUT_MS, 10) || 15000;

    return nodemailer.createTransport({
        service: process.env.EMAIL_SERVICE || 'gmail',
        auth: {
            user: user,
            pass: pass
        },
        connectionTimeout: timeout,
        greetingTimeout: timeout,
        socketTimeout: timeout
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

/**
 * Forwards a contact-form message to the admin inbox.
 * replyTo is the visitor's address so hitting Reply answers them directly.
 */
const sendContactMessage = async (contact) => {
    const adminEmail = process.env.ADMIN_EMAIL;
    if (!adminEmail) {
        console.error('❌ Contact form: ADMIN_EMAIL is not set, message not delivered');
        return false;
    }

    const message = {
        from: process.env.EMAIL_FROM || process.env.EMAIL_USER,
        to: adminEmail,
        replyTo: contact.email,
        subject: `📨 Contact form: ${contact.name}`,
        text: `New message from the website contact form.\n\nName: ${contact.name}\nEmail: ${contact.email}\n${contact.phone ? `Phone: ${contact.phone}\n` : ''}Received: ${new Date().toLocaleString()}\n\nMessage:\n${contact.message}\n\nReply to this email to respond directly to the sender.`
    };

    return sendEmail(message);
};

/**
 * Confirms to the visitor that their message arrived.
 */
const sendContactAcknowledgement = async (contact) => {
    if (!contact.email) return false;

    const message = {
        from: process.env.EMAIL_FROM || process.env.EMAIL_USER,
        to: contact.email,
        subject: 'We got your message - Home Sell Direct',
        text: `Hi ${contact.name},\n\nThanks for reaching out. We received your message and someone from our team will get back to you within one business day.\n\nFor a copy of your records, here is what you sent:\n\n${contact.message}\n\nIf it is urgent, call us at 1-800-CASH-NOW.\n\nBest regards,\nHome Sell Direct Team`
    };

    return sendEmail(message);
};

module.exports = {
    sendLeadConfirmation,
    sendAdminNotification,
    sendContactMessage,
    sendContactAcknowledgement
};