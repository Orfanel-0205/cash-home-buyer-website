// ==========================================
// 📱 CLICKSEND SMS TESTER
// Run this with: node test-sms.js
// ==========================================

require('dotenv').config();
const mongoose = require('mongoose');
const { sendSMS, sendLeadSmsConfirmation, sendAdminSmsNotification } = require('./utils/sms');

// Fix DNS for Node 18+ environments
const dns = require('dns');
dns.setServers(['1.1.1.1', '8.8.8.8']);

// The number to receive test messages (Your number)
const TEST_TO_NUMBER = process.env.RECIPIENT_PHONE || '+639683214615'; 

async function runTests() {
    console.log('\n🚀 Starting ClickSend SMS Tests...');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log(`ClickSend Username: ${process.env.CLICKSEND_USERNAME ? '✅ Loaded' : '❌ MISSING'}`);
    console.log(`ClickSend API Key: ${process.env.CLICKSEND_API_KEY ? '✅ Loaded' : '❌ MISSING'}`);
    console.log(`ClickSend From Number: ${process.env.CLICKSEND_FROM_NUMBER || 'Defaulting to "HomeSell"'}`);
    console.log(`Sending test messages to: ${TEST_TO_NUMBER}`);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

    try {
        // 1. Connect to MongoDB (Required for Admin name lookup in sendLeadSmsConfirmation)
        console.log('🔌 Connecting to MongoDB...');
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('✅ Connected to DB.');

        // 2. Test Basic SMS
        console.log('\n🧪 Test 1: Sending basic SMS...');
        const basicSmsResult = await sendSMS(TEST_TO_NUMBER, 'Test 1: Hello from Home Sell Direct via ClickSend!');
        if (basicSmsResult.success) {
            console.log('✅ Basic SMS sent successfully!');
            console.log(`   Message ID: ${basicSmsResult.messageId}`);
        } else {
            console.error('❌ Basic SMS failed:', basicSmsResult.error);
        }

        // 3. Test Lead Confirmation (Uses Admin Name from DB)
        console.log('\n🧪 Test 2: Testing lead confirmation SMS...');
        const mockLead = {
            fullName: 'Test User',
            phone: TEST_TO_NUMBER,
            propertyAddress: '123 Test St, Test City',
            smsConsent: true // Ensure consent is true for the SMS to send
        };
        const leadConfirmationResult = await sendLeadSmsConfirmation(mockLead);
        if (leadConfirmationResult && leadConfirmationResult.success) {
            console.log('✅ Lead Confirmation SMS sent successfully!');
            console.log(`   Message ID: ${leadConfirmationResult.messageId}`);
        } else {
            console.error('❌ Lead Confirmation SMS failed:', leadConfirmationResult ? leadConfirmationResult.error : 'No response');
        }

        // 4. Test Admin Notification
        console.log('\n🧪 Test 3: Testing admin notification SMS...');
        // Temporarily ensure ADMIN_PHONE is set for this test
        const originalAdminPhone = process.env.ADMIN_PHONE;
        process.env.ADMIN_PHONE = TEST_TO_NUMBER; // Send admin notification to the test number
        
        const adminNotificationResult = await sendAdminSmsNotification(mockLead);
        if (adminNotificationResult && adminNotificationResult.success) {
            console.log('✅ Admin Notification SMS sent successfully!');
            console.log(`   Message ID: ${adminNotificationResult.messageId}`);
        } else {
            console.error('❌ Admin Notification SMS failed:', adminNotificationResult ? adminNotificationResult.error : 'No response');
        }
        
        // Restore original ADMIN_PHONE
        process.env.ADMIN_PHONE = originalAdminPhone;

        console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        console.log('✅ All SMS tests completed!');
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

    } catch (error) {
        console.error('\n❌ AN UNEXPECTED ERROR OCCURRED DURING TESTS:');
        console.error(error);
        if (error.message && error.message.includes('ClickSend credentials')) {
            console.error('   👉 FIX: Ensure CLICKSEND_USERNAME and CLICKSEND_API_KEY are set in your .env file.');
        } else if (error.message && error.message.includes('ClickSend SDK is not loaded')) {
            console.error('   👉 FIX: Run "npm install clicksend" in your backend directory.');
        }
    } finally {
        await mongoose.disconnect();
        process.exit();
    }
}

runTests();