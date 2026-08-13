/**
 * Notification boundary for future SMS/email providers.
 * Saving an inquiry never depends on this optional step.
 */
async function notifyNewInquiry(inquiry) {
    const smsConfigured = Boolean(
        process.env.SMS_API_KEY &&
        process.env.SMS_API_SECRET &&
        process.env.SMS_SENDER &&
        process.env.CLIENT_PHONE
    );

    if (!smsConfigured) return { attempted: false, reason: 'not_configured' };

    // Add the selected provider adapter here. Until then, credentials alone do
    // not enable outbound messages or couple submission success to an SMS API.
    return { attempted: false, reason: 'provider_not_implemented' };
}

module.exports = { notifyNewInquiry };

