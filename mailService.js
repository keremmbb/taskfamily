const axios = require('axios');
require('dotenv').config();

const sendMail = async (to, subject, html) => {
    try {
        const response = await axios.post('https://api.brevo.com/v3/smtp/email', {
            sender: { name: "TaskFamily", email: process.env.EMAIL_USER },
            to: [{ email: to }],
            subject: subject,
            htmlContent: html
        }, {
            headers: {
                'api-key': process.env.BREVO_API_KEY,
                'Content-Type': 'application/json'
            }
        });
        console.log("✅ Mail gönderildi ID:", response.data.messageId);
        return response.data;
    } catch (error) {
        console.error('❌ BREVO HATASI DETAYI:', error.response ? error.response.data : error.message);
        throw error;
    }
};

module.exports = sendMail;