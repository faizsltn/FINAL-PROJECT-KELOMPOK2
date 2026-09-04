/**
 * routes/chatbot.routes.js
 * -------------------------------------------------------
 * Routing untuk chatbot interaktif (FR-6) dan riwayat interaksi (FR-7.1).
 * -------------------------------------------------------
 */

const express = require('express');
const router = express.Router();

const chatbotController = require('../controllers/chatbot.controller');
const { requireAuth } = require('../middlewares/auth.middleware');

router.use(requireAuth);

router.get('/history', chatbotController.showHistoryPage);
router.post('/:id/messages', chatbotController.sendMessage);
router.get('/:id/messages', chatbotController.getHistory);

module.exports = router;