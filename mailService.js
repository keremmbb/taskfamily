const nodemailer = require('nodemailer');
require('dotenv').config();

const transporter = nodemailer.createTransport({
    host: 'smtp.gmail.com',
    port: 587,
    secure: false, // 587 için mutlaka false olmalı
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
    },
    tls: {
        rejectUnauthorized: false
    },
    connectionTimeout: 10000 // 10 saniye sonra vazgeç ki sunucu asılı kalmasın
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