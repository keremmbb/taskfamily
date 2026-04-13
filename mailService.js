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
        rejectUnauthorized: false
    },
    connectionTimeout: 15000 // 15 saniye bekle
});

const sendMail = async (to, subject, html) => {
    try {
        console.log(`📧 Mail denemesi başlatıldı: ${to}`);
        const info = await transporter.sendMail({
            from: `"TaskFamily" <${process.env.EMAIL_USER}>`,
            to,
            subject,
            html
        });
        console.log("✅ Mail başarıyla iletildi");
        return info;
    } catch (error) {
        console.error('❌ Mail gönderme başarısız:', error.message);
        // Hata fırlatıyoruz ki server.js bunu yakalayıp 500 hatası vermesin
        throw new Error("Mail gönderilemedi: " + error.message);
    }
};

module.exports = sendMail;