const nodemailer = require('nodemailer');
require('dotenv').config();

const transporter = nodemailer.createTransport({
    host: 'smtp.gmail.com',
    port: 465,
    secure: true, 
    debug: true, // Loglarda her detayı görmek için
    logger: true, // Render loglarına smtp trafiğini yazdırır
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
    },
    tls: {
        rejectUnauthorized: false
    }
});

const sendMail = async (to, subject, html) => {
    try {
        const info = await transporter.sendMail({
            from: `"TaskFamily" <${process.env.EMAIL_USER}>`,
            to,
            subject,
            html
        });
        return info;
    } catch (error) {
        console.error('❌ SMTP HATASI:', error.message);
        throw error;
    }
};

module.exports = sendMail;