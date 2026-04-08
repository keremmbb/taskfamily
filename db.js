const { Pool } = require('pg');
require('dotenv').config();

// SSL ayarını sadece Render'da (üretim ortamında) aktif et, lokalde kapat
const isProduction = process.env.NODE_ENV === 'production' || process.env.DATABASE_URL?.includes('render.com');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: isProduction ? { rejectUnauthorized: false } : false
});

pool.on('connect', () => {
  console.log('✅ Veritabanına başarıyla bağlanıldı!');
});

pool.on('error', (err) => {
  console.error('❌ Beklenmedik veritabanı hatası:', err);
});

module.exports = pool;