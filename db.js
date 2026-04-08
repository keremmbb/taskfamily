const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  // Eğer Render linki kullanılıyorsa SSL her zaman zorunludur
  ssl: process.env.DATABASE_URL?.includes('render.com') 
    ? { rejectUnauthorized: false } 
    : false
});

pool.on('connect', () => {
  console.log('✅ Veritabanına bağlantı sağlandı!');
});

pool.on('error', (err) => {
  console.error('❌ Veritabanı hatası:', err);
});

// server.js'de "db" olarak çağırdığın için kafa karışıklığını önleyelim
module.exports = {
  query: (text, params) => pool.query(text, params),
  pool: pool
};