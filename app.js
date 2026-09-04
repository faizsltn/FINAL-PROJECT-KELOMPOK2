/**
 * app.js
 * -------------------------------------------------------
 * Entry point aplikasi "AI Course Generator". Menginisialisasi
 * Express, middleware global (session, flash, layout, dsb),
 * database, dan menghubungkan seluruh routes.
 *
 * Menjalankan aplikasi:
 *   1. cp .env.example .env  (lalu isi API key Gemini & YouTube)
 *   2. npm install
 *   3. npm run seed   (opsional, membuat akun demo)
 *   4. npm start
 * -------------------------------------------------------
 */

const express = require('express');
const path = require('path');
const session = require('express-session');
const flash = require('connect-flash');
const methodOverride = require('method-override');
const morgan = require('morgan');
const expressLayouts = require('express-ejs-layouts');

const env = require('../config/env');
const { initSchema } = require('./backend/config/database');
const mainRouter = require('./frontend/views/index');
const { notFoundHandler, errorHandler } = require('./backend/middlewares/error.middleware');

// Inisialisasi skema database sebelum server menerima request.
initSchema();

const app = express();

// ---------- View engine ----------
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
app.use(expressLayouts);
app.set('layout', 'layouts/main');

// ---------- Middleware global ----------
app.use(morgan(env.isProduction ? 'combined' : 'dev'));
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(methodOverride('_method'));
app.use(express.static(path.join(__dirname, 'public')));

app.use(
  session({
    secret: env.sessionSecret,
    resave: false,
    saveUninitialized: false,
    cookie: {
      maxAge: 1000 * 60 * 60 * 24, // 1 hari
      httpOnly: true,
    },
  })
);
app.use(flash());

// ---------- Local variables untuk semua view ----------
app.use((req, res, next) => {
  res.locals.currentUser = req.session.userId
    ? { id: req.session.userId, name: req.session.userName }
    : null;
  res.locals.flashSuccess = req.flash('success');
  res.locals.flashError = req.flash('error');
  const oldInputArr = req.flash('oldInput');
  res.locals.oldInput = oldInputArr && oldInputArr[0] ? oldInputArr[0] : {};
  res.locals.currentPath = req.path;
  next();
});

// ---------- Routes ----------
app.use('/', mainRouter);

// ---------- 404 & error handler (harus di paling akhir) ----------
app.use(notFoundHandler);
app.use(errorHandler);

app.listen(env.port, () => {
  console.log(`🚀 AI Course Generator berjalan di http://localhost:${env.port}`);
  console.log(`   Mode: ${env.nodeEnv}`);
});

module.exports = app;
