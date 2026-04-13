const nodemailer = require('nodemailer');
require('dotenv').config();

const transporter = nodemailer.createTransport({
    host: 'smtp-relay.brevo.com',
    port: 465, // Kesinlikle 465 olmalı
    secure: true, // 465 portu için true zorunludur
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
    },
    // Render/Bulut sunucuları için bağlantı bekletme ayarları
    connectionTimeout: 10000, 
    greetingTimeout: 10000,
    socketTimeout: 15000,
    tls: {
        rejectUnauthorized: false // Sertifika hatalarını görmezden gel
    }
});

const sendMail = async (to, subject, html) => {
    try {
        const info = await transporter.sendMail({
            from: `"TaskFamily" <${process.env.EMAIL_USER}>`,
            to: to,
            subject: subject,
            html: html
        });
        console.log("✅ Mail başarıyla gönderildi: ", info.messageId);
        return info;
    } catch (error) {
        console.error('❌ SMTP/MAIL HATASI DETAYI:', error);
        throw error;
    }
};

module.exports = sendMail;