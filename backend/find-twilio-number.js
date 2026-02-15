//backend/find-twilio-number.js
// ==========================================
// 🔍 TWILIO NUMBER FINDER
// Run this with: node find-twilio-number.js
// ==========================================

require('dotenv').config();
const https = require('https');

const accountSid = process.env.TWILIO_ACCOUNT_SID ? process.env.TWILIO_ACCOUNT_SID.trim() : '';
const authToken = process.env.TWILIO_AUTH_TOKEN ? process.env.TWILIO_AUTH_TOKEN.trim() : '';

console.log('\n🔍 Checking Twilio Account for valid phone numbers...');
console.log(`Account SID: ${accountSid}`);

if (!accountSid || !authToken) {
    console.error('❌ Missing credentials in .env file');
    process.exit(1);
}

const options = {
    hostname: 'api.twilio.com',
    path: `/2010-04-01/Accounts/${accountSid}/IncomingPhoneNumbers.json`,
    method: 'GET',
    auth: `${accountSid}:${authToken}`
};

const req = https.request(options, (res) => {
    let data = '';
    res.on('data', (chunk) => data += chunk);
    res.on('end', () => {
        if (res.statusCode === 200) {
            const result = JSON.parse(data);
            const numbers = result.incoming_phone_numbers;
            
            if (numbers && numbers.length > 0) {
                console.log('\n✅ Found the following active numbers:');
                numbers.forEach(n => {
                    console.log(`   📞 ${n.phone_number} (${n.friendly_name})`);
                });
                console.log('\n👉 Please update TWILIO_PHONE_NUMBER in your .env file with one of these.');
            } else {
                console.log('\n❌ No active phone numbers found for this account.');
                console.log('   You need to buy a number in the Twilio Console or use a Trial Number.');
            }
        } else {
            console.error('\n❌ Error fetching numbers. Check your Account SID and Auth Token.');
            console.error('Response:', data);
        }
    });
});

req.on('error', (e) => console.error(e));
req.end();