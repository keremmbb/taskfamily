const nodemailer = require('nodemailer');
require('dotenv').config();

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
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
    console.log(`📧 Mail gönderildi: ${to}`);
  } catch (error) {
    console.error('❌ Mail hatası:', error);
  }
};

module.exports = sendMail;