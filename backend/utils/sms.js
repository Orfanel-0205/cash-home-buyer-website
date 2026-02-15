require('dotenv').config();

var api = require('clicksend');

class clickSendSMS {
    constructor() {
        const username = process.env.CLICKSEND_USERNAME;
        const apiKey = process.env.CLICKSEND_API_KEY;

        if (!this.username || !this.apiKey) {
            throw new Error('ClickSend credentials are missing in .env file');
        }

        this.smsAPI = new api.SMSApi(this.username, this.apiKey);
    }

    async sendSMS(to, message, from = null) {
        try {
            const sendPhone = from || process.env.SENDER_PHONE;

            const  smsMessage =  new api.SmsMessage();
            smsMessage.to = to;
            smsMessage.body = message;
            smsMessage.from = sendPhone;

            const smsCollection = new api.SmsMessageCollection();
            smsCollection.messages = [smsMessage];

            const response = await this.smsAPI.smsSendPost(smsCollection);

            return {
                success: true,
                data: response.body,
                status: response.statusCode || 200,

            };

        } catch (error) {
            return{
                success: false,
                error: error.body || error.message,
                status: error.statusCode || 500,
                };
        }
            }
            }

            module.exports = clickSendSMS;