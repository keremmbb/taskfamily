const nodemailer = require('nodemailer');
require('dotenv').config();

const transporter = nodemailer.createTransport({
    host: 'smtp-relay.brevo.com',
    port: 465, // Portu 465 yap
    secure: true, // 465 kullanırken bu her zaman true olmalı
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
    },
    // Bağlantı süresini biraz uzatalım (isteğe bağlı)
    connectionTimeout: 10000, 
    greetingTimeout: 10000
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
    } catch (error) {
        console.error('❌ Mail Hatası Detayı:', error); // Hatayı komple yazdır
        throw error;
    }
};

module.exports = sendMail;