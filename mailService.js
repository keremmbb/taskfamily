const nodemailer = require('nodemailer');
require('dotenv').config();

const transporter = nodemailer.createTransport({
  host: 'smtp.gmail.com',
  port: 587,
  secure: false, // 587 için false olmalı
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  },
  tls: {
    rejectUnauthorized: false // Sertifika hatalarını geçer
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
    return true;
  } catch (error) {
    console.error('❌ Mail hatası detayı:', error.message);
    throw error;
  }
};

module.exports = sendMail;