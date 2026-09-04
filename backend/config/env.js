/**
 * config/env.js
 * -------------------------------------------------------
 * Memuat environment variable dari file .env dan menyediakan
 * satu sumber kebenaran (single source of truth) untuk seluruh
 * konfigurasi aplikasi. File lain (services, controllers, dll)
 * WAJIB mengambil konfigurasi dari sini, bukan dari process.env
 * langsung, agar mudah di-maintain dan divalidasi terpusat.
 * -------------------------------------------------------
 */

require('dotenv').config();

const requiredVars = ['GEMINI_API_KEY', 'YOUTUBE_API_KEY', 'SESSION_SECRET'];

const missing = requiredVars.filter((key) => !process.env[key] || process.env[key].includes('isi_'));

if (missing.length > 0) {
  console.warn(
    `⚠️  [config/env] Variabel environment berikut belum diisi dengan benar di file .env: ${missing.join(
      ', '
    )}. Fitur terkait mungkin tidak berfungsi sampai diisi.`
  );
}

module.exports = {
  port: process.env.PORT || 3000,
  nodeEnv: process.env.NODE_ENV || 'development',
  isProduction: process.env.NODE_ENV === 'production',
  sessionSecret: process.env.SESSION_SECRET || 'dev-secret-jangan-dipakai-di-production',
  databasePath: process.env.DATABASE_PATH || './database/aicourse.sqlite',
  gemini: {
    apiKey: process.env.GEMINI_API_KEY || '',
    model: process.env.GEMINI_MODEL || 'gemini-3.6-flash',
  },
  youtube: {
    apiKey: process.env.YOUTUBE_API_KEY || '',
  },
  appBaseUrl: process.env.APP_BASE_URL || 'http://localhost:3000',
};
