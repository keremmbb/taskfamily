const nodemailer = require('nodemailer');
require('dotenv').config();

const transporter = nodemailer.createTransport({
    host: 'smtp.gmail.com',
    port: 465, // SSL portu (Render'da genellikle 465 daha stabildir)
    secure: true, 
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
    },
    // Bağlantı kopmalarını önlemek için bekleme sürelerini artırıyoruz
    connectionTimeout: 20000, // 20 saniye
    greetingTimeout: 20000,
    socketTimeout: 30000,
    tls: {
        rejectUnauthorized: false // Sertifika sorunlarını görmezden gel
    }
});

const sendMail = async (to, subject, html) => {
    try {
        const mailOptions = {
            from: `"TaskFamily" <${process.env.EMAIL_USER}>`,
            to: to,
            subject: subject,
            html: html
        };
        
        console.log(`📧 Mail gönderimi deneniyor: ${to}`);
        const info = await transporter.sendMail(mailOptions);
        console.log(`✅ Mail başarıyla gönderildi: ${info.messageId}`);
        return info;
    } catch (error) {
        console.error('❌ Mail hatası detayı:', error.message);
        throw error;
    }
};

module.exports = sendMail;