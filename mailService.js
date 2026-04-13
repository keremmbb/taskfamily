const nodemailer = require('nodemailer');
require('dotenv').config();

const transporter = nodemailer.createTransport({
    host: 'smtp-relay.brevo.com', // Brevo panelindeki host ile aynı mı kontrol et
    port: 587, 
    secure: false, // 587 için false olmalı
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
    },
    tls: {
        // Render gibi bulut ortamlarında bağlantıyı zorlamak için
        rejectUnauthorized: false,
        minVersion: 'TLSv1.2'
    },
    connectionTimeout: 20000, // Süreyi 20 saniyeye çıkardık
    greetingTimeout: 20000
});

const sendMail = async (to, subject, html) => {
    try {
        console.log(`📧 Mail gönderiliyor: ${to}...`);
        const info = await transporter.sendMail({
            from: `"TaskFamily" <${process.env.EMAIL_USER}>`,
            to: to,
            subject: subject,
            html: html
        });
        console.log("✅ Mail başarıyla gönderildi ID:", info.messageId);
        return info;
    } catch (error) {
        console.error('❌ SMTP KRİTİK HATA:', error.message);
        throw error;
    }
};

module.exports = sendMail;