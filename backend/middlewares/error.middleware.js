/**
 * middlewares/error.middleware.js
 * -------------------------------------------------------
 * Penanganan error terpusat. Semua controller memanggil next(err)
 * saat terjadi kegagalan (misal Gemini API/YouTube API error),
 * lalu ditangkap di sini agar pesan error konsisten dan pengguna
 * tetap mendapat halaman yang informatif (bukan crash / stack trace
 * mentah) — sesuai kebutuhan non-fungsional Reliability pada PRD.
 * -------------------------------------------------------
 */

function notFoundHandler(req, res, next) {
  res.status(404);
  res.render('errors/404', {
    title: 'Halaman Tidak Ditemukan',
    layout: false,
  });
}

// eslint-disable-next-line no-unused-vars
function errorHandler(err, req, res, next) {
  console.error('❌ [error.middleware]', err);

  const statusCode = err.statusCode || 500;
  const isAjax = req.xhr || (req.headers.accept || '').includes('application/json');

  const message =
    statusCode === 500
      ? 'Terjadi kesalahan pada server. Ini mungkin karena Gemini API/YouTube API sedang gagal atau kuota habis — silakan coba lagi.'
      : err.message || 'Terjadi kesalahan.';

  if (isAjax) {
    return res.status(statusCode).json({ success: false, message });
  }

  if (req.flash) {
    req.flash('error', message);
    return res.redirect('back');
  }

  res.status(statusCode).render('errors/500', {
    title: 'Terjadi Kesalahan',
    message,
    layout: false,
  });
}

module.exports = { notFoundHandler, errorHandler };
