/**
 * seeders/user.seeder.js
 * -------------------------------------------------------
 * Data awal (dummy) untuk pengujian: satu akun demo mahasiswa
 * agar dosen penguji/tim dapat langsung login tanpa registrasi
 * manual. Password: "password123"
 * -------------------------------------------------------
 */

const authService = require('../services/auth.service');

async function seedUsers() {
  const demoEmail = 'mahasiswa.demo@example.com';
  const existing = authService.findUserByEmail(demoEmail);

  if (existing) {
    console.log('ℹ️  [seeders/user] Akun demo sudah ada, dilewati.');
    return;
  }

  await authService.registerUser({
    name: 'Mahasiswa Demo',
    email: demoEmail,
    password: 'password123',
  });

  console.log(`✅ [seeders/user] Akun demo dibuat -> email: ${demoEmail} | password: password123`);
}

module.exports = seedUsers;
