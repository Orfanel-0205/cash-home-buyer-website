require('dotenv').config();
const Admin = require('../models/Admin');

const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;
const fromNumber = process.env.TWILIO_PHONE_NUMBER;

let client;
if (accountSid && authToken) {
    client = require('twilio')(accountSid, authToken);
}

const sendSMS = async (to, messageBody) => {
  try {
    if (!client) {
        throw new Error('Twilio client not initialized. Check TWILIO_ACCOUNT_SID and TWILIO_AUTH_TOKEN.');
    }
    const message = await client.messages.create({
      body: messageBody,
      from: fromNumber,
      to: to
    });
    return message;
  } catch (error) {
    console.error('Twilio SMS Error:', error);
    throw error;
  }
};

/**
 * Sends the confirmation SMS to the lead
 * @param {Object} lead - The lead object
 */
const sendLeadSmsConfirmation = async (lead) => {
    if (!lead.phone || !lead.smsConsent) return;

    const firstName = lead.fullName.split(' ')[0];
    let adminName = "Clifford"; 

    try {
        const admin = await Admin.findOne({ role: 'admin' }).sort({ createdAt: 1 });
        if (admin && admin.fullName) {
            adminName = admin.fullName.split(' ')[0];
        }
    } catch (error) {
        console.error('Error fetching admin name for SMS:', error);
    }
    
    const message = `Hi ${firstName}! This is ${adminName} from Home Sell Direct. We received your inquiry about your ${lead.propertyAddress}. If you’re open to a fast, hassle-free cash offer, I’d love to help. When’s a good time to connect? You can reply here anytime. Thanks!`;

    return sendSMS(lead.phone, message);
};

/**
 * Sends a notification SMS to the admin (if ADMIN_PHONE is set)
 * @param {Object} lead - The lead object
 */
const sendAdminSmsNotification = async (lead) => {
    if (process.env.ADMIN_PHONE) {
        const message = `🔔 New Lead: ${lead.fullName} - ${lead.propertyAddress}`;
        return sendSMS(process.env.ADMIN_PHONE, message);
    }
};

module.exports = { 
    sendSMS, 
    sendLeadSmsConfirmation, 
    sendAdminSmsNotification 
};
