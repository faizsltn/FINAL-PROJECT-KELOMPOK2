/**
 * routes/outline.routes.js
 * -------------------------------------------------------
 * Routing untuk fitur generate & kelola outline (FR-2, FR-3).
 * Seluruh route di sini dilindungi middleware requireAuth (FR-1.4).
 * -------------------------------------------------------
 */

const express = require('express');
const { body } = require('express-validator');
const router = express.Router();

const outlineController = require('../../../controllers/outline.controller');
const courseController = require('../controllers/course.controller');
const { requireAuth } = require('../../../middlewares/auth.middleware');
const { handleValidation } = require('../../../middlewares/validate.middleware');

router.use(requireAuth);

router.get('/', outlineController.listOutlines);
router.get('/new', outlineController.showNewForm);

router.post(
  '/',
  [body('topic').trim().notEmpty().withMessage('Topik yang ingin dipelajari wajib diisi.')],
  handleValidation,
  outlineController.createOutline
);

router.get('/:id', outlineController.showOutlineDetail);

router.post(
  '/:id',
  [body('title').trim().notEmpty().withMessage('Judul outline wajib diisi.')],
  handleValidation,
  outlineController.updateOutline
);

router.post('/:id/levels/:levelId', outlineController.updateLevel);
router.post('/:id/subtopics/:subtopicId', outlineController.updateSubtopic);

router.post('/:id/delete', outlineController.deleteOutline);
router.post('/:id/regenerate', outlineController.regenerateOutline);
router.post('/:id/continue-level', outlineController.continueLevel);

// FR-4: konversi outline menjadi kursus lengkap (delegasi ke course.controller)
router.post('/:id/convert', courseController.convertToCourse);

module.exports = router;
