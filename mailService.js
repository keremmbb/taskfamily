const nodemailer = require('nodemailer');
require('dotenv').config();

const transporter = nodemailer.createTransport({
    host: 'smtp-relay.brevo.com',
    port: 2525, // 465 veya 587 yerine bunu dene
    secure: false, // 2525 portu için false olmalı
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
    },
    tls: {
        rejectUnauthorized: false
    }
});

const sendMail = async (to, subject, html) => {
    try {
        console.log(`📧 Gönderim denemesi (Port 2525): ${to}`);
        const info = await transporter.sendMail({
            from: `"TaskFamily" <${process.env.EMAIL_USER}>`,
            to: to,
            subject: subject,
            html: html
        });
        console.log("✅ Mail başarıyla uçtu!");
        return info;
    } catch (error) {
        console.error('❌ SMTP HATASI:', error.message);
        throw error;
    }
};

module.exports = sendMail;