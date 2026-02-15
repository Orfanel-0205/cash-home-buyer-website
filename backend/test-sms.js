require('dotenv').config();
const { sendSMS, sendLeadSmsConfirmation, sendAdminSmsNotification } = require('./utils/sms');

// Test 1: Send basic SMS
async function testBasicSMS() {
    console.log('🧪 Test 1: Sending basic SMS...');
    try {
        const result = await sendSMS(
            '+639683214615', // Your Philippine number
            'Test message from Home Sell Direct!'
        );
        console.log('✅ SMS sent successfully!');
        console.log('Message SID:', result.sid);
        console.log('Status:', result.status);
    } catch (error) {
        console.error('❌ Failed:', error.message);
    }
}

// Test 2: Test lead confirmation SMS
async function testLeadConfirmation() {
    console.log('\n🧪 Test 2: Testing lead confirmation SMS...');
    
    const mockLead = {
        fullName: 'John Doe',
        phone: '+639683214615', // Your number
        propertyAddress: '123 Main Street, Manila',
        smsConsent: true
    };
    
    try {
        await sendLeadSmsConfirmation(mockLead);
        console.log('✅ Lead confirmation SMS sent!');
    } catch (error) {
        console.error('❌ Failed:', error.message);
    }
}

// Test 3: Test admin notification
async function testAdminNotification() {
    console.log('\n🧪 Test 3: Testing admin notification SMS...');
    
    const mockLead = {
        fullName: 'Jane Smith',
        propertyAddress: '456 Oak Avenue, Quezon City'
    };
    
    try {
        await sendAdminSmsNotification(mockLead);
        console.log('✅ Admin notification SMS sent!');
    } catch (error) {
        console.error('❌ Failed:', error.message);
    }
}

// Run all tests
async function runAllTests() {
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('🚀 Starting Twilio SMS Tests...\n');
    console.log('Account SID:', process.env.TWILIO_ACCOUNT_SID);
    console.log('From Number:', process.env.TWILIO_PHONE_NUMBER);
    console.log('Admin Phone:', process.env.ADMIN_PHONE);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    
    await testBasicSMS();
    await new Promise(resolve => setTimeout(resolve, 2000)); // Wait 2 seconds
    
    await testLeadConfirmation();
    await new Promise(resolve => setTimeout(resolve, 2000)); // Wait 2 seconds
    
    await testAdminNotification();
    
    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('✅ All tests completed!');
    console.log('Check your phone for 3 SMS messages');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    process.exit(0);
}

runAllTests();