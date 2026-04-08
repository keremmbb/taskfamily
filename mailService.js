const nodemailer = require('nodemailer');
require('dotenv').config();

const transporter = nodemailer.createTransport({
  host: 'smtp.gmail.com',
  port: 465, // En güvenli Gmail portu
  secure: true, 
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  },
  tls: {
    // Sunucu bazlı bağlantı reddini önlemek için kritik ayar
    rejectUnauthorized: false
  }
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
    console.error('❌ Mail gönderme hatası detayı:', error.message);
    throw error;
  }
};

module.exports = sendMail;