const nodemailer = require('nodemailer');
require('dotenv').config();

const transporter = nodemailer.createTransport({
    host: 'smtp.gmail.com',
    port: 465, 
    secure: true, // 465 portu için true olmalı
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
    },
    // Render ve Google arasındaki gecikmeleri aşmak için süreleri artırıyoruz
    connectionTimeout: 30000, // 30 saniye
    greetingTimeout: 30000,
    socketTimeout: 30000,
    tls: {
        rejectUnauthorized: false
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