/**
 * controllers/auth.controller.js
 * -------------------------------------------------------
 * Controller untuk fitur autentikasi (FR-1). Menerima request
 * HTTP, memanggil services/auth.service.js untuk logika bisnis,
 * lalu merender view atau redirect. Tidak ada query database
 * langsung di sini — semua lewat service.
 * -------------------------------------------------------
 */

const authService = require('../services/auth.service');
const env = require('../config/env');

function showRegisterForm(req, res) {
  res.render('auth/register', { title: 'Daftar Akun' });
}

async function register(req, res, next) {
  try {
    const { name, email, password } = req.body;
    const user = await authService.registerUser({ name, email, password });

    req.session.userId = user.id;
    req.session.userName = user.name;
    req.flash('success', `Selamat datang, ${user.name}! Akun kamu berhasil dibuat.`);
    res.redirect('/outlines');
  } catch (error) {
    if (error.code === 'EMAIL_TAKEN') {
      req.flash('error', error.message);
      req.flash('oldInput', req.body);
      return res.redirect('/auth/register');
    }
    next(error);
  }
}

function showLoginForm(req, res) {
  res.render('auth/login', { title: 'Masuk' });
}

async function login(req, res, next) {
  try {
    const { email, password } = req.body;
    const user = await authService.verifyLogin(email, password);

    if (!user) {
      req.flash('error', 'Email atau password salah.');
      req.flash('oldInput', req.body);
      return res.redirect('/auth/login');
    }

    req.session.userId = user.id;
    req.session.userName = user.name;
    req.flash('success', `Selamat datang kembali, ${user.name}!`);
    res.redirect('/outlines');
  } catch (error) {
    next(error);
  }
}

function logout(req, res, next) {
  req.session.destroy((err) => {
    if (err) return next(err);
    res.redirect('/auth/login');
  });
}

function showForgotPasswordForm(req, res) {
  res.render('auth/forgot-password', { title: 'Lupa Password' });
}

/**
 * FR-1.3: karena aplikasi tidak memiliki server email sungguhan,
 * link reset ditampilkan langsung di halaman (mode "dev/demo")
 * alih-alih dikirim lewat email — namun mekanisme token & masa
 * berlakunya tetap real dan aman.
 */
async function forgotPassword(req, res, next) {
  try {
    const { email } = req.body;
    const user = authService.findUserByEmail(email);

    if (!user) {
      req.flash('error', 'Email tidak ditemukan di sistem kami.');
      return res.redirect('/auth/forgot-password');
    }

    const token = authService.createPasswordResetToken(user.id);
    const resetLink = `${env.appBaseUrl}/auth/reset-password/${token}`;

    res.render('auth/forgot-password', {
      title: 'Lupa Password',
      resetLink,
      infoMessage:
        'Karena ini adalah lingkungan demo tanpa server email, gunakan tautan di bawah untuk reset password (berlaku 30 menit).',
    });
  } catch (error) {
    next(error);
  }
}

function showResetPasswordForm(req, res) {
  const { token } = req.params;
  const valid = authService.validateResetToken(token);

  if (!valid) {
    req.flash('error', 'Tautan reset password tidak valid atau sudah kedaluwarsa.');
    return res.redirect('/auth/forgot-password');
  }

  res.render('auth/reset-password', { title: 'Reset Password', token });
}

async function resetPassword(req, res, next) {
  try {
    const { token } = req.params;
    const { password } = req.body;

    const valid = authService.validateResetToken(token);
    if (!valid) {
      req.flash('error', 'Tautan reset password tidak valid atau sudah kedaluwarsa.');
      return res.redirect('/auth/forgot-password');
    }

    await authService.changePassword(valid.user_id, password);
    authService.consumeResetToken(token);

    req.flash('success', 'Password berhasil direset. Silakan masuk dengan password baru.');
    res.redirect('/auth/login');
  } catch (error) {
    next(error);
  }
}

module.exports = {
  showRegisterForm,
  register,
  showLoginForm,
  login,
  logout,
  showForgotPasswordForm,
  forgotPassword,
  showResetPasswordForm,
  resetPassword,
};
