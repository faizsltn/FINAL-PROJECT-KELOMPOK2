/**
 * routes/index.js
 * -------------------------------------------------------
 * Router utama: halaman landing (lihat demo) & penggabungan
 * seluruh sub-router fitur ke satu tempat yang dipakai app.js.
 * -------------------------------------------------------
 */

const express = require('express');
const router = express.Router();

router.get('/', (req, res) => {
  if (req.session && req.session.userId) {
    return res.redirect('/outlines');
  }
  res.render('index', { title: 'AI Course Generator — Belajar Mandiri Bersama AI' });
});

router.use('/auth', require('../../../routes/auth.routes'));
router.use('/outlines', require('../../backend/routes/outline.routes'));
router.use('/courses', require('../../backend/routes/course.routes'));
router.use('/chatbot', require('../../../routes/chatbot.routes'));
router.use('/profile', require('../../../routes/profile.routes'));

module.exports = router;
