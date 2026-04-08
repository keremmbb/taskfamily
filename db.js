const { Pool } = require('pg');
require('dotenv').config();

// Sadece DATABASE_URL kullanarak bağlanıyoruz
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false
  }
});

pool.on('connect', () => {
  console.log('✅ Veritabanına başarıyla bağlanıldı!');
});

module.exports = pool;