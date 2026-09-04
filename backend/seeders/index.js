/**
 * seeders/index.js
 * -------------------------------------------------------
 * Entry point untuk menjalankan seluruh seeder secara berurutan.
 * Jalankan dengan: npm run seed
 * -------------------------------------------------------
 */

const { initSchema } = require('../config/database');
const seedUsers = require('./user.seeder');

async function runSeeders() {
  console.log('🌱 Menjalankan seeder...');
  initSchema();
  await seedUsers();
  console.log('✅ Seeder selesai dijalankan.');
  process.exit(0);
}

runSeeders().catch((err) => {
  console.error('❌ Seeder gagal:', err);
  process.exit(1);
});
