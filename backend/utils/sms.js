require('dotenv').config();
const axios = require('axios');

// --- ClickSend API Configuration ---
const username = process.env.CLICKSEND_USERNAME;
const apiKey = process.env.CLICKSEND_API_KEY;

// Create a pre-configured axios instance for all ClickSend API calls.
const clicksendApi = axios.create({
    baseURL: 'https://rest.clicksend.com/v3',
    headers: {
        'Content-Type': 'application/json',
        'Authorization': (username && apiKey) ? `Basic ${Buffer.from(`${username}:${apiKey}`).toString('base64')}` : ''
    }
});

/**
 * Sends a single SMS message.
 * @param {string} to - The recipient's phone number in international format.
 * @param {string} message - The text message content.
 * @param {string|null} [from=null] - The sender ID. Defaults to .env setting or 'HomeSell'.
 * @returns {Promise<object>} A promise that resolves to a result object.
 */
async function sendSMS(to, message, from = null) {
    try {
        if (!username || !apiKey) {
            throw new Error('ClickSend credentials are not configured in .env file.');
        }
        // Use empty string by default to use ClickSend's shared number pool (better deliverability for trials)
        const fromNumber = from || process.env.CLICKSEND_FROM_NUMBER || '';

        const payload = {
            messages: [{
                source: "cash-home-buyer",
                to: to,
                body: message,
                from: fromNumber
            }]
        };

        const response = await clicksendApi.post('/sms/send', payload);
        const messageData = response.data.data.messages[0];

        return {
            success: true,
            messageId: messageData.message_id,
            status: messageData.status,
            cost: response.data.data.total_price,
            data: response.data,
        };
    } catch (error) {
        const errorResponse = error.response?.data;
        return {
            success: false,
            error: errorResponse?.response_msg || error.message,
            status: errorResponse?.response_code || error.response?.status || 500,
        };
    }
}

/**
 * Sends a confirmation SMS to a new lead.
 * @param {object} lead - The lead object containing fullName, phone, propertyAddress, and smsConsent.
 * @returns {Promise<object>} The result from sendSMS.
 */
async function sendLeadSmsConfirmation(lead) {
    if (!lead.smsConsent) {
        console.warn(`SMS not sent to ${lead.fullName}: No SMS consent.`);
        return { success: false, error: 'User has not consented to SMS.' };
    }
    const message = `Hi ${lead.fullName.split(' ')[0]}, this is Home Sell Direct. We've received your inquiry for ${lead.propertyAddress} and will be in touch shortly.`;
    return sendSMS(lead.phone, message);
}

/**
 * Sends an SMS notification to the admin about a new lead.
 * @param {object} lead - The lead object containing fullName, phone, and propertyAddress.
 * @returns {Promise<object>} The result from sendSMS.
 */
async function sendAdminSmsNotification(lead) {
    const adminPhone = process.env.ADMIN_PHONE;
    if (!adminPhone) {
        console.error('Admin SMS not sent: ADMIN_PHONE not set in .env');
        return { success: false, error: 'ADMIN_PHONE not set in .env' };
    }
    const message = `New Lead: ${lead.fullName}, ${lead.phone}, Property: ${lead.propertyAddress}.`;
    return sendSMS(adminPhone, message);
}

/**
 * Retrieves the current account balance from ClickSend.
 * @returns {Promise<object>} A promise that resolves to a result object with balance info.
 */
async function getAccountBalance() {
    try {
        if (!username || !apiKey) {
            throw new Error('ClickSend credentials are not configured in .env file.');
        }
        const response = await clicksendApi.get('/account');
        return {
            success: true,
            balance: response.data.data.balance,
            currency: response.data.data._currency,
        };
    } catch (error) {
        const errorResponse = error.response?.data;
        return {
            success: false,
            error: errorResponse?.response_msg || error.message,
            status: errorResponse?.response_code || error.response?.status || 500,
        };
    }
}

/**
 * Calculates the cost of sending an SMS message.
 * @param {string} to - The recipient's phone number.
 * @param {string} message - The message content.
 * @returns {Promise<object>} A promise that resolves to a result object with price info.
 */
async function calculateSMSPrice(to, message) {
    try {
        if (!username || !apiKey) {
            throw new Error('ClickSend credentials are not configured in .env file.');
        }
        const payload = {
            messages: [{
                to: to,
                body: message
            }]
        };

        const response = await clicksendApi.post('/sms/price', payload);
        const priceData = response.data.data;

        return {
            success: true,
            price: priceData.total_price,
            currency: priceData._currency,
            data: response.data.data,
        };
    } catch (error) {
        const errorResponse = error.response?.data;
        return {
            success: false,
            error: errorResponse?.response_msg || error.message,
            status: errorResponse?.response_code || error.response?.status || 500,
        };
    }
}

module.exports = {
    sendSMS,
    sendLeadSmsConfirmation,
    sendAdminSmsNotification,
    getAccountBalance,
    calculateSMSPrice,
};