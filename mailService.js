const nodemailer = require('nodemailer');
require('dotenv').config();

const transporter = nodemailer.createTransport({
    host: 'smtp-relay.brevo.com',
    port: 465, 
    secure: true, 
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
    },
    // Render için kritik ağ ayarları
    connectionTimeout: 30000, // 30 saniye bekle
    greetingTimeout: 30000,
    socketTimeout: 30000,
    debug: true, // Loglarda daha fazla detay görmek için
    logger: true, // Nodemailer'ın iç süreçlerini yazdırır
    tls: {
        rejectUnauthorized: false,
        minVersion: 'TLSv1.2'
    }
});

const sendMail = async (to, subject, html) => {
    try {
        console.log(`📧 Gönderim başlatılıyor: ${to}`);
        const info = await transporter.sendMail({
            from: `"TaskFamily" <${process.env.EMAIL_USER}>`,
            to: to,
            subject: subject,
            html: html
        });
        console.log("✅ Mail başarıyla gönderildi!");
        return info;
    } catch (error) {
        console.error('❌ SMTP DETAYLI HATA:', error);
        throw error;
    }
};

module.exports = sendMail;