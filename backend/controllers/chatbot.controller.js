/**
 * controllers/chatbot.controller.js
 * -------------------------------------------------------
 * Controller untuk chatbot interaktif (FR-6) dan riwayat interaksi
 * chatbot (FR-7.1). Endpoint chat dipanggil secara asinkron (AJAX/fetch)
 * dari widget chatbot pada halaman kursus.
 * -------------------------------------------------------
 */

const chatbotService = require('../services/chatbot.service');

/**
 * FR-6.1 s.d. FR-6.4: endpoint AJAX untuk mengirim pertanyaan
 * dan menerima jawaban chatbot secara kontekstual.
 */
async function sendMessage(req, res, next) {
  try {
    const { message } = req.body;
    const outlineId = req.params.id;

    if (!message || !message.trim()) {
      return res.status(400).json({ success: false, message: 'Pertanyaan tidak boleh kosong.' });
    }

    const answer = await chatbotService.askAndSave(outlineId, req.session.userId, message.trim());
    res.json({ success: true, answer });
  } catch (error) {
    if (error.code === 'NOT_FOUND') {
      return res.status(404).json({ success: false, message: error.message });
    }
    next(error);
  }
}

function getHistory(req, res, next) {
  try {
    const history = chatbotService.getChatHistory(req.params.id, req.session.userId);
    res.json({ success: true, history });
  } catch (error) {
    next(error);
  }
}

/**
 * FR-7.1: halaman riwayat interaksi chatbot, dikelompokkan per kursus.
 */
function showHistoryPage(req, res, next) {
  try {
    const grouped = chatbotService.getGroupedHistoryByUser(req.session.userId);
    res.render('courses/chat-history', { title: 'Riwayat Chatbot', grouped });
  } catch (error) {
    next(error);
  }
}

module.exports = { sendMessage, getHistory, showHistoryPage };

