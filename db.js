const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  // Burası çok kritik, isimlendirme Environment ile aynı olmalı
  connectionString: process.env.DATABASE_URL, 
  ssl: {
    rejectUnauthorized: false
  }
});

pool.on('connect', () => {
  console.log('✅ Veritabanına bağlanıldı!');
});

module.exports = pool;