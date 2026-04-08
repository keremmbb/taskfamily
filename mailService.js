const nodemailer = require('nodemailer');
require('dotenv').config();

const transporter = nodemailer.createTransport({
  host: 'smtp.gmail.com',
  port: 465,
  secure: true, 
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS // Yeni şifren: pyyhwfjqvmqyjjgh
  },
  tls: {
    rejectUnauthorized: false
  },
  connectionTimeout: 5000 // 5 saniye içinde bağlanamazsan vazgeç
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
    console.error('❌ Mail hatası:', error.message);
    return false; // Hata olsa da sistem çökmesin
  }
};

module.exports = sendMail;