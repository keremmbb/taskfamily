const nodemailer = require('nodemailer');
require('dotenv').config();

const transporter = nodemailer.createTransport({
  host: 'smtp.gmail.com',
  port: 465,
  secure: true, // Port 465 için true
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  },
  tls: {
    // Render ve benzeri bulut sunucularda SSL/Sertifika hatalarını aşmak için:
    rejectUnauthorized: false,
    minVersion: "TLSv1.2"
  },
  connectionTimeout: 20000, // Süreyi 20 saniyeye çıkardık
  greetingTimeout: 20000,
  socketTimeout: 20000
});

const sendMail = async (to, subject, html) => {
  try {
    const info = await transporter.sendMail({
      from: `"Görev Sistemi" <${process.env.EMAIL_USER}>`,
      to,
      subject,
      html
    });
    console.log(`📧 Mail başarıyla gönderildi: ${info.messageId}`);
    return true;
  } catch (error) {
    console.error('❌ Mail hatası detayı:', error.message);
    throw error; // Hatayı fırlat ki server.js hatayı yakalayıp ekrana bassın
  }
};

module.exports = sendMail;