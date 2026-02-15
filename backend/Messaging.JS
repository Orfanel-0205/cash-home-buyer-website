//backend/Messaging.JS
const express = require('express');
const router = express.Router();
const twilio = require('twilio');
const Lead = require('../models/Lead');
// const Admin = require('../models/Admin'); // Admin model might still be needed for auto-responses

// Twilio credentials
// NOTE: These are Twilio credentials. If you are fully switching to ClickSend,
// these will not be used for sending, but the logic below is still Twilio-specific.
// const accountSid = process.env.TWILIO_ACCOUNT_SID;
// const authToken = process.env.TWILIO_AUTH_TOKEN;
// const twilioPhone = process.env.TWILIO_PHONE_NUMBER;
// const client = twilio(accountSid, authToken);

/**
 * Handle incoming SMS messages
 * Webhook URL: https://your-domain.com/api/messaging/incoming
 * NOTE: This endpoint is for Twilio webhooks. ClickSend will require a different implementation.
 */
router.post('/incoming', async (req, res) => {
    const twiml = new twilio.twiml.MessagingResponse();
    
    const from = req.body.From;
    const to = req.body.To;
    const messageBody = req.body.Body.trim();
    const messageSid = req.body.MessageSid;
    
    console.log('📨 Incoming SMS from:', from);
    console.log('   Message:', messageBody);
    
    try {
        // Find or create lead
        let lead = await Lead.findOne({ phone: from });
        
        if (!lead) {
            lead = await Lead.create({
                fullName: `SMS Lead ${from}`,
                phone: from,
                email: 'sms-lead@homesell.direct',
                propertyAddress: 'SMS Inquiry',
                propertyType: 'Unknown',
                propertyCondition: 'Unknown',
                sellingReason: 'SMS Inquiry',
                timeframe: 'Unknown',
                preferredContact: 'Text',
                smsConsent: true,
                status: 'New',
                priority: 'Medium',
                source: 'sms_inbound',
                smsConversation: []
            });
            
            console.log('✅ New lead created from SMS');
        }
        
        // Check for opt-out
        const optOutKeywords = ['stop', 'stopall', 'unsubscribe', 'cancel', 'end', 'quit'];
        if (optOutKeywords.includes(messageBody.toLowerCase())) {
            lead.smsOptOut = true;
            await lead.save();
            
            twiml.message('You have been unsubscribed from Home Sell Direct. Reply START to resubscribe.');
            
            res.type('text/xml');
            return res.send(twiml.toString());
        }
        
        // Check for opt-in
        const optInKeywords = ['start', 'yes', 'unstop'];
        if (optInKeywords.includes(messageBody.toLowerCase()) && lead.smsOptOut) {
            lead.smsOptOut = false;
            await lead.save();
            
            twiml.message('Welcome back! You\'re now subscribed to Home Sell Direct messages.');
            
            res.type('text/xml');
            return res.send(twiml.toString());
        }
        
        // Add message to conversation
        await lead.addSms('inbound', messageBody, from, to, messageSid);
        
        // Emit real-time notification
        const io = req.app.get('socketio');
        if (io) {
            io.emit('new_sms', {
                leadId: lead._id,
                from: from,
                message: messageBody,
                timestamp: new Date()
            });
        }
        
        // Auto-respond based on keywords
        const message = messageBody.toLowerCase();
        
        if (message.includes('price') || message.includes('offer')) {
            twiml.message('Great question! Our offers are based on current market value and property condition. A specialist will reach out within 1 hour to discuss a specific offer.');
        } 
        else if (message.includes('when') || message.includes('available') || message.includes('time')) {
            twiml.message('We\'re available Mon-Fri 9am-6pm, Sat 10am-4pm. A specialist will call you back shortly!');
        }
        else if (message.includes('how') || message.includes('process')) {
            twiml.message('Our process: 1) Quick property review 2) Cash offer in 24hrs 3) Close on your timeline. No fees, no commissions!');
        }
        else {
            // If you want to use Admin name here, you'll need to import Admin model
            // const admin = await Admin.findOne({ role: 'admin' }).sort({ createdAt: 1 });
            // const adminName = admin ? admin.fullName.split(' ')[0] : 'our team';
            
            // twiml.message(`Thanks for reaching out! This is ${adminName} from Home Sell Direct. I received your message and will respond personally within the hour. Feel free to share details about your property!`);
            twiml.message('Thanks for reaching out! We received your message and will respond personally within the hour. Feel free to share details about your property!');
        }
        
        console.log('✅ Auto-response sent');
        
    } catch (error) {
        console.error('❌ Error processing SMS:', error);
        twiml.message('Thank you for contacting Home Sell Direct. We received your message and will respond shortly!');
    }
    
    res.type('text/xml');
    res.send(twiml.toString());
});

/**
 * SMS status callback
 * NOTE: This endpoint is for Twilio status callbacks. ClickSend will require a different implementation.
 */
router.post('/status', async (req, res) => {
    const messageSid = req.body.MessageSid;
    const messageStatus = req.body.MessageStatus;
    const to = req.body.To;
    
    console.log(`📊 SMS Status: ${messageSid} - ${messageStatus}`);
    
    try {
        const lead = await Lead.findOne({ 
            phone: to,
            'smsConversation.twilioSid': messageSid 
        });
        
        if (lead) {
            const sms = lead.smsConversation.find(s => s.twilioSid === messageSid);
            if (sms) {
                sms.status = messageStatus;
                await lead.save();
            }
        }
    } catch (error) {
        console.error('Error updating SMS status:', error);
    }
    
    res.sendStatus(200);
});

/**
 * Send SMS to lead
 * NOTE: This endpoint uses Twilio client. It needs to be updated for ClickSend.
 */
router.post('/send', async (req, res) => {
    const { leadId, message } = req.body;
    
    if (!message || !leadId) {
        return res.status(400).json({
            success: false,
            message: 'leadId and message are required'
        });
    }
    
    try {
        const lead = await Lead.findById(leadId);
        
        if (!lead) {
            return res.status(404).json({ success: false, message: 'Lead not found' });
        }
        
        if (lead.smsOptOut) {
            return res.status(400).json({ success: false, message: 'Lead has opted out' });
        }
        
        // This part needs to be replaced with ClickSend's sendSMS method
        // const twilioMessage = await client.messages.create({
        //     body: message,
        //     from: twilioPhone,
        //     to: lead.phone,
        //     statusCallback: `${process.env.FRONTEND_URL || 'http://localhost:5000'}/api/messaging/status`
        // });
        const twilioMessage = { sid: 'CLICKSEND_OUTBOUND_SID' }; // Mock for now
        
        await lead.addSms('outbound', message, twilioPhone, lead.phone, twilioMessage.sid);
        
        console.log('📤 SMS sent to:', lead.phone);
        
        res.json({
            success: true,
            message: 'SMS sent successfully',
            messageSid: twilioMessage.sid
        });
        
    } catch (error) {
        console.error('Error sending SMS:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to send SMS',
            error: error.message
        });
    }
});

/**
 * Get conversation history
 */
router.get('/conversation/:leadId', async (req, res) => {
    try {
        const lead = await Lead.findById(req.params.leadId);
        
        if (!lead) {
            return res.status(404).json({ success: false, message: 'Lead not found' });
        }
        
        res.json({
            success: true,
            conversation: lead.smsConversation || [],
            optedOut: lead.smsOptOut,
            lastReceived: lead.lastSmsReceived,
            lastSent: lead.lastSmsSent
        });
        
    } catch (error) {
        console.error('Error fetching conversation:', error);
        res.status(500).json({ success: false, message: 'Error fetching conversation' });
    }
});

/**
 * Mark messages as read
 */
router.post('/mark-read/:leadId', async (req, res) => {
    const { adminName } = req.body;
    
    try {
        const lead = await Lead.findById(req.params.leadId);
        
        if (!lead) {
            return res.status(404).json({ success: false, message: 'Lead not found' });
        }
        
        let marked = 0;
        if (lead.smsConversation) {
            lead.smsConversation.forEach(sms => {
                if (sms.direction === 'inbound' && !sms.readBy) {
                    sms.readBy = adminName;
                    sms.readAt = new Date();
                    marked++;
                }
            });
        }
        
        await lead.save();
        
        res.json({ success: true, markedCount: marked });
        
    } catch (error) {
        console.error('Error marking as read:', error);
        res.status(500).json({ success: false, message: 'Error marking as read' });
    }
});

/**
 * Get unread message count
 */
router.get('/unread-count', async (req, res) => {
    try {
        const leads = await Lead.find({
            'smsConversation': { $exists: true, $not: { $size: 0 } }
        });
        
        let unreadCount = 0;
        const unreadLeads = [];
        
        leads.forEach(lead => {
            if (lead.smsConversation) {
                const unread = lead.smsConversation.filter(sms => 
                    sms.direction === 'inbound' && !sms.readBy
                ).length;
                
                if (unread > 0) {
                    unreadCount += unread;
                    unreadLeads.push({
                        leadId: lead._id,
                        name: lead.fullName,
                        unreadCount: unread,
                        lastMessage: lead.smsConversation[lead.smsConversation.length - 1]
                    });
                }
            }
        });
        
        res.json({
            success: true,
            totalUnread: unreadCount,
            leads: unreadLeads
        });
        
    } catch (error) {
        console.error('Error getting unread count:', error);
        res.status(500).json({ success: false, message: 'Error fetching unread count' });
    }
});

/**
 * Broadcast SMS to multiple leads
 */
router.post('/broadcast', async (req, res) => {
    const { message, leadIds } = req.body;
    
    if (!message || !leadIds || !Array.isArray(leadIds)) {
        return res.status(400).json({
            success: false,
            message: 'message and leadIds array are required'
        });
    }
    
    try {
        const results = {
            success: [],
            failed: [],
            optedOut: []
        };
        
        for (const leadId of leadIds) {
            // This loop uses Twilio client. It needs to be updated for ClickSend.
            try {
                const lead = await Lead.findById(leadId);
                
                if (!lead) {
                    results.failed.push({ leadId, reason: 'Not found' });
                    continue;
                }
                
                if (lead.smsOptOut) {
                    results.optedOut.push({ leadId, phone: lead.phone });
                    continue;
                }
                
                // This part needs to be replaced with ClickSend's sendSMS method
                // const twilioMessage = await client.messages.create({
                //     body: message,
                //     from: twilioPhone,
                //     to: lead.phone,
                //     statusCallback: `${process.env.FRONTEND_URL || 'http://localhost:5000'}/api/messaging/status`
                // });
                const twilioMessage = { sid: 'CLICKSEND_BROADCAST_SID' }; // Mock for now
                
                await lead.addSms('outbound', message, twilioPhone, lead.phone, twilioMessage.sid);
                
                results.success.push({ 
                    leadId, 
                    phone: lead.phone,
                    messageSid: twilioMessage.sid 
                });
                
            } catch (error) {
                results.failed.push({ leadId, reason: error.message });
            }
        }
        
        res.json({
            success: true,
            results: results,
            summary: {
                sent: results.success.length,
                failed: results.failed.length,
                optedOut: results.optedOut.length
            }
        });
        
    } catch (error) {
        console.error('Broadcast error:', error);
        res.status(500).json({
            success: false,
            message: 'Broadcast failed',
            error: error.message
        });
    }
});

/**
 * Health check
 */
router.get('/health', (req, res) => {
    res.json({
        success: true,
        service: 'Messaging (Twilio-based, needs ClickSend update)',
        configured: false // Since it's commented out
    });
});

module.exports = router;