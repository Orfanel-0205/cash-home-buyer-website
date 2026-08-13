const { getDatabase } = require('../lib/mongodb');
const { validateInquiry } = require('../lib/inquiry');
const { notifyNewInquiry } = require('../lib/notifications');

function sendJson(res, status, payload) {
    res.status(status).setHeader('Content-Type', 'application/json; charset=utf-8').json(payload);
}

module.exports = async function inquiryHandler(req, res) {
    res.setHeader('Cache-Control', 'no-store');
    res.setHeader('Allow', 'POST');

    if (req.method !== 'POST') {
        return sendJson(res, 405, { success: false, message: 'Method not allowed.' });
    }

    const contentLength = Number(req.headers['content-length'] || 0);
    if (contentLength > 12 * 1024) {
        return sendJson(res, 413, { success: false, message: 'Request is too large.' });
    }

    if (!String(req.headers['content-type'] || '').toLowerCase().includes('application/json')) {
        return sendJson(res, 415, { success: false, message: 'Content-Type must be application/json.' });
    }

    if (!req.body || typeof req.body !== 'object' || Array.isArray(req.body)) {
        return sendJson(res, 400, { success: false, message: 'Please submit valid form data.' });
    }

    // Optional honeypot: bots commonly fill hidden fields that people cannot see.
    if (req.body.website) {
        return sendJson(res, 201, { success: true, message: 'Your inquiry has been received.' });
    }

    const { inquiry, errors } = validateInquiry(req.body);
    if (errors.length) {
        return sendJson(res, 400, { success: false, message: errors[0], errors });
    }

    try {
        const forwarded = String(req.headers['x-forwarded-for'] || '').split(',')[0].trim();
        const document = {
            ...inquiry,
            status: 'New',
            priority: 'Medium',
            submittedAt: new Date(),
            tracking: {
                ...inquiry.tracking,
                ipAddress: forwarded.slice(0, 64)
            }
        };
        const database = await getDatabase();
        const result = await database.collection('leads').insertOne(document);

        try {
            await notifyNewInquiry(document);
        } catch (notificationError) {
            console.error('Optional inquiry notification failed:', notificationError.message);
        }

        return sendJson(res, 201, {
            success: true,
            message: 'Your inquiry has been received.',
            inquiryId: result.insertedId.toString()
        });
    } catch (error) {
        console.error('Inquiry storage failed:', error.message);
        return sendJson(res, 500, {
            success: false,
            message: 'We could not save your inquiry right now. Please try again shortly.'
        });
    }
};
