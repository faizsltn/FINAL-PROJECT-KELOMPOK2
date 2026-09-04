/**
 * services/chatbot.service.js
 * -------------------------------------------------------
 * Logika bisnis untuk fitur "Chatbot Interaktif" (FR-6) dan
 * "Riwayat Interaksi Chatbot" (FR-7.1). Menyatukan konteks materi
 * kursus (dari course.service) dengan riwayat percakapan sebelum
 * memanggil gemini.service untuk mendapat jawaban.
 * -------------------------------------------------------
 */

const { db } = require('../config/database');
const geminiService = require('./gemini.service');
const courseService = require('./course.service');

function getChatHistory(outlineId, userId) {
  return db
    .prepare(
      'SELECT * FROM chat_history WHERE outline_id = ? AND user_id = ? ORDER BY created_at ASC'
    )
    .all(outlineId, userId);
}

function saveChatMessage(outlineId, userId, role, message) {
  db.prepare(
    'INSERT INTO chat_history (user_id, outline_id, role, message) VALUES (?, ?, ?, ?)'
  ).run(userId, outlineId, role, message);
}

/**
 * FR-6.1 s.d. FR-6.4: Terima pertanyaan pengguna, sertakan konteks
 * materi + riwayat chat, lalu kembalikan jawaban chatbot. Kedua
 * pesan (pertanyaan & jawaban) disimpan sebagai riwayat (FR-7.1).
 */
async function askAndSave(outlineId, userId, question) {
  const course = courseService.getCourseDetail(outlineId, userId);
  if (!course) {
    const err = new Error('Kursus tidak ditemukan.');
    err.code = 'NOT_FOUND';
    throw err;
  }

  const materialContext = courseService.getCourseContextText(outlineId, userId);
  const history = getChatHistory(outlineId, userId);

  saveChatMessage(outlineId, userId, 'user', question);

  const answer = await geminiService.askChatbot({
    courseTitle: course.title,
    materialContext,
    chatHistory: history,
    question,
  });

  saveChatMessage(outlineId, userId, 'ai', answer);

  return answer;
}

/**
 * Mengelompokkan seluruh riwayat chat pengguna per kursus/topik
 * (FR-7.1: "dikelompokkan per kursus/topik").
 */
function getGroupedHistoryByUser(userId) {
  const rows = db
    .prepare(
      `SELECT ch.*, o.title AS outline_title
       FROM chat_history ch
       JOIN outlines o ON o.id = ch.outline_id
       WHERE ch.user_id = ?
       ORDER BY ch.created_at ASC`
    )
    .all(userId);

  const grouped = new Map();
  for (const row of rows) {
    if (!grouped.has(row.outline_id)) {
      grouped.set(row.outline_id, { outlineId: row.outline_id, outlineTitle: row.outline_title, messages: [] });
    }
    grouped.get(row.outline_id).messages.push(row);
  }
  return Array.from(grouped.values()).reverse();
}

module.exports = { getChatHistory, saveChatMessage, askAndSave, getGroupedHistoryByUser };
