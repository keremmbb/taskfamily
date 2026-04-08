const nodemailer = require('nodemailer');
require('dotenv').config();

const transporter = nodemailer.createTransport({
    service: 'gmail', // Gmail için en stabil ayar
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
    }
});

const sendMail = async (to, subject, html) => {
    try {
        const mailOptions = {
            from: `"TaskFamily" <${process.env.EMAIL_USER}>`,
            to,
            subject,
            html
        };
        const info = await transporter.sendMail(mailOptions);
        console.log(`✅ Mail başarıyla gönderildi: ${info.messageId}`);
        return info;
    } catch (error) {
        console.error('❌ Mail gönderim hatası:', error.message);
        throw error; // Hatayı server.js'e fırlat ki orada yakalansın
    }
};

module.exports = sendMail;