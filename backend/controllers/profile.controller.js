/**
 * controllers/profile.controller.js
 * -------------------------------------------------------
 * Controller untuk manajemen profil pengguna (FR-7.2).
 * -------------------------------------------------------
 */

const authService = require('../services/auth.service');

function showProfile(req, res, next) {
  try {
    const user = authService.findUserById(req.session.userId);
    res.render('profile/edit', { title: 'Profil Saya', profileUser: user });
  } catch (error) {
    next(error);
  }
}

async function updateProfile(req, res, next) {
  try {
    const { name, email, photoUrl } = req.body;
    const user = await authService.updateProfile(req.session.userId, { name, email, photoUrl });
    req.session.userName = user.name;
    req.flash('success', 'Profil berhasil diperbarui.');
    res.redirect('/profile');
  } catch (error) {
    next(error);
  }
}

async function updatePassword(req, res, next) {
  try {
    const { currentPassword, newPassword } = req.body;
    const user = authService.findUserById(req.session.userId);
    const verified = await authService.verifyLogin(user.email, currentPassword);

    if (!verified) {
      req.flash('error', 'Password lama tidak sesuai.');
      return res.redirect('/profile');
    }

    await authService.changePassword(req.session.userId, newPassword);
    req.flash('success', 'Password berhasil diubah.');
    res.redirect('/profile');
  } catch (error) {
    next(error);
  }
}

module.exports = { showProfile, updateProfile, updatePassword };
