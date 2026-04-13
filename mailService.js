const nodemailer = require('nodemailer');
require('dotenv').config();

const transporter = nodemailer.createTransport({
    host: 'smtp.gmail.com',
    port: 587,
    secure: false, // 587 için false olmalı
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
    },
    tls: {
        rejectUnauthorized: false,
        minVersion: "TLSv1.2"
    },
    connectionTimeout: 10000 // 10 saniye (2 dakika bekletmesin)
});

const sendMail = async (to, subject, html) => {
    try {
        const info = await transporter.sendMail({
            from: `"TaskFamily" <${process.env.EMAIL_USER}>`,
            to,
            subject,
            html
        });
        return info;
    } catch (error) {
        console.error('❌ SMTP HATASI:', error.message);
        throw error;
    }
};

module.exports = sendMail;