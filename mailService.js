const nodemailer = require('nodemailer');
require('dotenv').config();

const transporter = nodemailer.createTransport({
  host: 'smtp.gmail.com', // "service: gmail" yerine host kullanmak daha stabildir
  port: 465,              // Güvenli bağlantı portu
  secure: true,           // Port 465 için true olmalı
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  },
  tls: {
    // Render sunucuları için sertifika hatalarını önler
    rejectUnauthorized: false
  },
  connectionTimeout: 10000, // 10 saniye bekleme süresi
});

const sendMail = async (to, subject, html) => {
  try {
    await transporter.sendMail({
      from: `"Görev Sistemi" <${process.env.EMAIL_USER}>`,
      to,
      subject,
      html
    });
    console.log(`📧 Mail başarıyla gönderildi: ${to}`);
  } catch (error) {
    console.error('❌ Mail hatası detayı:', error.message);
    throw error; // Hatayı yukarı fırlatalım ki server.js bunu yakalasın
  }
};

module.exports = sendMail;