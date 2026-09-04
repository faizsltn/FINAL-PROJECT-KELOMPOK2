/**
 * middlewares/auth.middleware.js
 * -------------------------------------------------------
 * FR-1.4: Seluruh fitur generate outline, kursus, dan chatbot
 * hanya dapat diakses pengguna yang sudah login. Middleware ini
 * dipasang di routes yang membutuhkan autentikasi.
 * -------------------------------------------------------
 */

/**
 * Mewajibkan pengguna login. Jika belum, redirect ke /auth/login
 * dan simpan pesan flash.
 */
function requireAuth(req, res, next) {
  if (req.session && req.session.userId) {
    return next();
  }
  req.flash('error', 'Silakan masuk terlebih dahulu untuk mengakses halaman ini.');
  return res.redirect('/auth/login');
}

/**
 * Mencegah pengguna yang sudah login mengakses halaman auth
 * (login/register) lagi — akan diarahkan ke dashboard.
 */
function redirectIfAuthenticated(req, res, next) {
  if (req.session && req.session.userId) {
    return res.redirect('/outlines');
  }
  return next();
}

module.exports = { requireAuth, redirectIfAuthenticated };
