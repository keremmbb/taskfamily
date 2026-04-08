const nodemailer = require('nodemailer');
require('dotenv').config();

const transporter = nodemailer.createTransport({
    host: 'smtp.gmail.com',
    port: 587,
    secure: false, // 587 portu için false olmalı
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
    },
    tls: {
        rejectUnauthorized: false, // Sertifika hatalarını es geç
        minVersion: 'TLSv1.2'      // Güvenli bağlantı protokolü
    },
    connectionTimeout: 10000, // 10 saniye bekle (Timeout hatasını önlemek için)
    greetingTimeout: 5000,
    socketTimeout: 15000
});

const sendMail = async (to, subject, html) => {
    try {
        const info = await transporter.sendMail({
            from: `"TaskFamily" <${process.env.EMAIL_USER}>`,
            to,
            subject,
            html
        });
        console.log(`✅ Mail başarıyla gönderildi: ${to}`);
        return info;
    } catch (error) {
        console.error('❌ Mail gönderim hatası:', error.message);
        throw error; 
    }
};

module.exports = sendMail;