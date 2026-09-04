/**
 * routes/profile.routes.js
 * -------------------------------------------------------
 * Routing untuk manajemen profil pengguna (FR-7.2).
 * -------------------------------------------------------
 */

const express = require('express');
const { body } = require('express-validator');
const router = express.Router();

const profileController = require('../controllers/profile.controller');
const { requireAuth } = require('../middlewares/auth.middleware');
const { handleValidation } = require('../middlewares/validate.middleware');

router.use(requireAuth);

router.get('/', profileController.showProfile);

router.post(
  '/',
  [
    body('name').trim().notEmpty().withMessage('Nama wajib diisi.'),
    body('email').trim().isEmail().withMessage('Format email tidak valid.'),
  ],
  handleValidation,
  profileController.updateProfile
);

router.post(
  '/password',
  [
    body('currentPassword').notEmpty().withMessage('Password lama wajib diisi.'),
    body('newPassword').isLength({ min: 6 }).withMessage('Password baru minimal 6 karakter.'),
  ],
  handleValidation,
  profileController.updatePassword
);

module.exports = router;
