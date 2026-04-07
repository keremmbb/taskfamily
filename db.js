const { Pool } = require('pg');
require('dotenv').config();

// Render üzerindeki DATABASE_URL'i tek parça olarak kullanıyoruz
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false
  }
});

pool.on('connect', () => {
  console.log('✅ Veritabanına başarıyla bağlanıldı!');
});

pool.on('error', (err) => {
  console.error('❌ Beklenmedik DB Hatası:', err);
});

module.exports = pool;