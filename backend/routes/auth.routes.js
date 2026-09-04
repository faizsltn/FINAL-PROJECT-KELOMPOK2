/**
 * routes/auth.routes.js
 * -------------------------------------------------------
 * Routing untuk fitur autentikasi (FR-1). Validasi input
 * didefinisikan di sini (dekat dengan definisi endpoint),
 * lalu diteruskan ke controllers/auth.controller.js.
 * -------------------------------------------------------
 */

const express = require('express');
const { body } = require('express-validator');
const router = express.Router();

const authController = require('../controllers/auth.controller');
const { redirectIfAuthenticated } = require('../middlewares/auth.middleware');
const { handleValidation } = require('../middlewares/validate.middleware');

const registerValidation = [
  body('name').trim().notEmpty().withMessage('Nama wajib diisi.'),
  body('email').trim().isEmail().withMessage('Format email tidak valid.'),
  body('password').isLength({ min: 6 }).withMessage('Password minimal 6 karakter.'),
  body('confirmPassword').custom((value, { req }) => {
    if (value !== req.body.password) throw new Error('Konfirmasi password tidak cocok.');
    return true;
  }),
];

const loginValidation = [
  body('email').trim().isEmail().withMessage('Format email tidak valid.'),
  body('password').notEmpty().withMessage('Password wajib diisi.'),
];

const forgotPasswordValidation = [body('email').trim().isEmail().withMessage('Format email tidak valid.')];

const resetPasswordValidation = [
  body('password').isLength({ min: 6 }).withMessage('Password minimal 6 karakter.'),
  body('confirmPassword').custom((value, { req }) => {
    if (value !== req.body.password) throw new Error('Konfirmasi password tidak cocok.');
    return true;
  }),
];

router.get('/register', redirectIfAuthenticated, authController.showRegisterForm);
router.post('/register', redirectIfAuthenticated, registerValidation, handleValidation, authController.register);

router.get('/login', redirectIfAuthenticated, authController.showLoginForm);
router.post('/login', redirectIfAuthenticated, loginValidation, handleValidation, authController.login);

router.post('/logout', authController.logout);

router.get('/forgot-password', redirectIfAuthenticated, authController.showForgotPasswordForm);
router.post(
  '/forgot-password',
  redirectIfAuthenticated,
  forgotPasswordValidation,
  handleValidation,
  authController.forgotPassword
);

router.get('/reset-password/:token', redirectIfAuthenticated, authController.showResetPasswordForm);
router.post(
  '/reset-password/:token',
  redirectIfAuthenticated,
  resetPasswordValidation,
  handleValidation,
  authController.resetPassword
);

module.exports = router;
