const nodemailer = require('nodemailer');
require('dotenv').config();

const transporter = nodemailer.createTransport({
    host: 'smtp.gmail.com',
    port: 465,
    secure: true, // SSL kullan
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
    },
    tls: {
        rejectUnauthorized: false // Sertifika hatalarını görmezden gel
    }
});

const sendMail = async (to, subject, html) => {
    try {
        await transporter.sendMail({
            from: `"TaskFamily" <${process.env.EMAIL_USER}>`,
            to,
            subject,
            html
        });
        console.log(`✅ Mail başarıyla kuyruğa alındı: ${to}`);
    } catch (error) {
        console.error('❌ Mail gönderim hatası:', error.message);
        // Hata olsa bile fonksiyon çökmeyecek, sadece loga yazacak
    }
};

module.exports = sendMail;