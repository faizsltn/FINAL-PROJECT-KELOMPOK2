/**
 * middlewares/validate.middleware.js
 * -------------------------------------------------------
 * Middleware pembantu untuk memeriksa hasil validasi
 * express-validator yang didefinisikan di masing-masing route.
 * Jika ada error, redirect kembali dengan pesan flash (bukan
 * lempar exception) agar pengalaman pengguna tetap baik.
 * -------------------------------------------------------
 */

const { validationResult } = require('express-validator');

function handleValidation(req, res, next) {
  const errors = validationResult(req);
  if (errors.isEmpty()) return next();

  const firstError = errors.array()[0];
  req.flash('error', firstError.msg);
  req.flash('oldInput', req.body);
  return res.redirect('back');
}

module.exports = { handleValidation };
