const nodemailer = require('nodemailer');
require('dotenv').config();

const transporter = nodemailer.createTransport({
    service: 'hotmail',
    auth: {
        user: 'senin-emailin@outlook.com',
        pass: 'outlook-uygulama-sifresi'
    }
});

const sendMail = async (to, subject, html) => {
    try {
        console.log(`📧 Mail denemesi: ${to}`);
        const info = await transporter.sendMail({
            from: `"TaskFamily" <${process.env.EMAIL_USER}>`,
            to,
            subject,
            html
        });
        console.log("✅ Mail başarıyla gönderildi!");
        return info;
    } catch (error) {
        console.error('❌ Mail hatası:', error.message);
        throw error;
    }
};

module.exports = sendMail;