const nodemailer = require('nodemailer');
require('dotenv').config();

const transporter = nodemailer.createTransport({
    host: 'smtp-relay.brevo.com',
    port: 465, 
    secure: true, // SSL/TLS kullanımı
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
    },
    // Bağlantı kopmalarını önlemek için ekstra ayarlar
    pool: true, 
    maxConnections: 5,
    maxMessages: 100,
    tls: {
        rejectUnauthorized: false
    }
});

const sendMail = async (to, subject, html) => {
    try {
        console.log(`📧 Mail denemesi başlatıldı: ${to}`);
        const info = await transporter.sendMail({
            from: `"TaskFamily" <${process.env.EMAIL_USER}>`,
            to: to,
            subject: subject,
            html: html
        });
        console.log("✅ Mail başarıyla gönderildi!");
        return info;
    } catch (error) {
        console.error('❌ Mail Gönderim Hatası:', error.message);
        throw error;
    }
};

module.exports = sendMail;