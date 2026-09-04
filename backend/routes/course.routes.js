/**
 * routes/course.routes.js
 * -------------------------------------------------------
 * Routing untuk konversi outline -> kursus (FR-4) dan
 * belajar materi + video (FR-5).
 * -------------------------------------------------------
 */

const express = require('express');
const router = express.Router();

const courseController = require('../controllers/course.controller');
const { requireAuth } = require('../../../middlewares/auth.middleware');

router.use(requireAuth);

router.get('/', courseController.listCourses);
router.get('/:id', courseController.showCourseDetail);

module.exports = router;
