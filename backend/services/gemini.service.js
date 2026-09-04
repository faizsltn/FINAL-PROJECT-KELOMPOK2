/**
 * services/gemini.service.js
 * -------------------------------------------------------
 * Modul terisolasi untuk seluruh komunikasi dengan Gemini API.
 * Controller TIDAK BOLEH memanggil Gemini API secara langsung.
 * Semua komunikasi dengan Gemini dilakukan melalui file ini.
 * -------------------------------------------------------
 */

const { GoogleGenAI } = require('@google/genai');
const env = require('../../../config/env');

const ai = new GoogleGenAI({
  apiKey: env.gemini.apiKey,
});

/**
 * Mengambil HTTP status dari berbagai bentuk error SDK/API Gemini.
 * Satu-satunya tempat yang tahu "bentuk" error @google/genai —
 * dipakai oleh services/course.service.js (untuk keputusan retry)
 * dan controllers/outline.controller.js (untuk pesan ke pengguna),
 * supaya kedua tempat itu tidak menebak error dengan cara berbeda.
 */
function getErrorStatus(error) {
  if (!error) return null;
  if (error.status) return Number(error.status);
  if (error.statusCode) return Number(error.statusCode);
  if (error.response && error.response.status) return Number(error.response.status);
  if (error.error && error.error.code) return Number(error.error.code);
  return null;
}

/**
 * Mengklasifikasikan error Gemini menjadi kategori yang bisa
 * ditindaklanjuti: apakah layak di-retry, apakah kuota habis,
 * apakah API key tidak valid, atau apakah model tidak ditemukan.
 */
function classifyGeminiError(error) {
  const status = getErrorStatus(error);
  const message = (error && error.message) || '';

  const isQuotaError =
    status === 429 || /RESOURCE_EXHAUSTED/i.test(message) || /quota/i.test(message);

  const isInvalidKey =
    status === 401 ||
    status === 403 ||
    /API_KEY_INVALID/i.test(message) ||
    /UNAUTHENTICATED/i.test(message) ||
    /PERMISSION_DENIED/i.test(message);

  const isModelNotFound =
    status === 404 || /NOT_FOUND/i.test(message) || /is not found|model.*not.*found/i.test(message);

  const isRetryable = [429, 500, 502, 503, 504].includes(status);

  return { status, isQuotaError, isInvalidKey, isModelNotFound, isRetryable };
}

/**
 * Mengekstrak JSON dari respons Gemini.
 * Berjaga-jaga jika Gemini masih memberikan JSON
 * di dalam markdown code block.
 */
function extractJson(rawText) {
  let text = (rawText || '').trim();

  // Hapus ```json ... ```
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/i);

  if (fenced) {
    text = fenced[1].trim();
  }

  // Cari awal object JSON
  const firstBrace = text.indexOf('{');

  // Cari awal array JSON
  const firstBracket = text.indexOf('[');

  let start = -1;

  if (firstBrace === -1) {
    start = firstBracket;
  } else if (firstBracket === -1) {
    start = firstBrace;
  } else {
    start = Math.min(firstBrace, firstBracket);
  }

  if (start > 0) {
    text = text.slice(start);
  }

  return JSON.parse(text);
}

/**
 * Helper untuk request Gemini.
 *
 * Semua request Gemini melalui fungsi ini
 * agar konfigurasi terpusat.
 */
async function generateContent(prompt, options = {}) {
  const {
    responseMimeType = 'text/plain',
    maxOutputTokens = 8192,
  } = options;

  const config = {
    maxOutputTokens,
  };

  // Hanya tambahkan responseMimeType jika diperlukan.
  if (responseMimeType) {
    config.responseMimeType = responseMimeType;
  }

  const result = await ai.models.generateContent({
    model: env.gemini.model,
    contents: prompt,
    config,
  });

  return result.text || '';
}

/**
 * FR-2:
 * Generate outline kursus otomatis dari topik bebas teks.
 */
async function generateOutline(topic) {
  const prompt = `
Kamu adalah asisten pembuat kurikulum belajar mandiri untuk mahasiswa Indonesia.

Buatkan outline/kurikulum belajar terstruktur untuk topik berikut:

"${topic}"

Ketentuan:
- Buat 3 sampai 5 level/bab dari dasar ke lebih lanjut.
- Setiap level memiliki 3 sampai 6 sub-topik.
- Gunakan Bahasa Indonesia yang jelas dan mudah dipahami pemula.
- Judul kursus harus singkat dan menarik.
- Setiap sub-topik harus relevan dengan levelnya.
- Jangan memberikan teks di luar JSON.

Kembalikan HANYA JSON valid dengan format persis seperti ini:

{
  "judul_kursus": "string",
  "deskripsi": "string singkat 1-2 kalimat",
  "levels": [
    {
      "judul_level": "string",
      "subtopics": [
        "string",
        "string",
        "string"
      ]
    }
  ]
}
`.trim();

  const rawText = await generateContent(prompt, {
    responseMimeType: 'application/json',
    maxOutputTokens: 8192,
  });

  const parsed = extractJson(rawText);

  if (
    !parsed.judul_kursus ||
    !parsed.deskripsi ||
    !Array.isArray(parsed.levels)
  ) {
    throw new Error(
      'Format outline dari Gemini API tidak sesuai spesifikasi.'
    );
  }

  return parsed;
}

/**
 * FR-3.3 / FR-3.4:
 * Membuat level lanjutan berdasarkan outline yang sudah ada.
 */
async function continueOutlineLevel(existingOutline) {
  const existingLevels = Array.isArray(existingOutline.levels)
    ? existingOutline.levels
    : [];

  const existingLevelTitles = existingLevels
    .map((level) => {
      return level.judul_level || level.level_title || level.title || '';
    })
    .filter(Boolean)
    .join(', ');

  const courseTitle =
    existingOutline.judul_kursus ||
    existingOutline.title ||
    'Kursus';

  const topic =
    existingOutline.topic ||
    existingOutline.topik ||
    courseTitle;

  const prompt = `
Kamu adalah asisten pembuat kurikulum belajar mandiri.

Kursus berjudul:
"${courseTitle}"

Topik:
"${topic}"

Level yang sudah tersedia:
${existingLevelTitles || '(belum ada level)'}

Buatkan 1 sampai 2 level LANJUTAN baru yang logis untuk melanjutkan materi di atas.

Ketentuan:
- Tingkatkan kedalaman dan kompleksitas materi.
- JANGAN mengulang level yang sudah ada.
- Setiap level baru memiliki 3 sampai 6 sub-topik.
- Gunakan Bahasa Indonesia.
- Pastikan setiap level dan sub-topik relevan dengan topik kursus.
- Jangan memberikan teks di luar JSON.

Kembalikan HANYA JSON valid dengan format:

{
  "levels": [
    {
      "judul_level": "string",
      "subtopics": [
        "string",
        "string",
        "string"
      ]
    }
  ]
}
`.trim();

  const rawText = await generateContent(prompt, {
    responseMimeType: 'application/json',
    maxOutputTokens: 8192,
  });

  const parsed = extractJson(rawText);

  if (!Array.isArray(parsed.levels)) {
    throw new Error(
      'Format level lanjutan dari Gemini API tidak sesuai spesifikasi.'
    );
  }

  return parsed.levels;
}

/**
 * FR-4.2:
 * Generate materi teks lengkap untuk satu sub-topik.
 */
async function generateMaterialForSubtopic({
  courseTitle,
  levelTitle,
  subtopicTitle,
}) {
  const prompt = `
Kamu adalah pengajar ahli yang menulis materi belajar mandiri berbahasa Indonesia.

Konteks pembelajaran:

Kursus:
"${courseTitle}"

Level:
"${levelTitle}"

Sub-topik:
"${subtopicTitle}"

Tuliskan materi pembelajaran untuk sub-topik tersebut dengan ketentuan:

- Gunakan format Markdown.
- Gunakan heading jika diperlukan.
- Gunakan bullet list jika diperlukan.
- Sertakan contoh konkret.
- Jika topiknya pemrograman, sertakan contoh kode yang relevan.
- Jelaskan konsep dari dasar.
- Gunakan bahasa yang mudah dipahami mahasiswa/pemula.
- Panjang sekitar 300-600 kata.
- Jangan bertele-tele.
- Tutup dengan ringkasan singkat 2-3 poin.
`.trim();

  const rawText = await generateContent(prompt, {
    responseMimeType: 'text/plain',
    maxOutputTokens: 8192,
  });

  return rawText.trim();
}

/**
 * FR-6.3:
 * Chatbot kontekstual.
 */
async function askChatbot({
  courseTitle,
  materialContext,
  chatHistory,
  question,
}) {
  const historyText = (chatHistory || [])
    .slice(-6)
    .map(
      (h) =>
        `${h.role === 'user' ? 'Mahasiswa' : 'Asisten'}: ${h.message}`
    )
    .join('\n');

  const prompt = `
Kamu adalah asisten belajar (tutor) untuk kursus:

"${courseTitle}"

Berikut konteks materi yang sedang dipelajari mahasiswa:

---
${materialContext || '(materi belum tersedia)'}
---

Riwayat percakapan terakhir:

${historyText || '(belum ada percakapan sebelumnya)'}

Pertanyaan baru dari mahasiswa:

"${question}"

Jawablah dalam Bahasa Indonesia.

Ketentuan:
- Jelaskan dengan jelas.
- Gunakan bahasa yang mudah dipahami.
- Tetap dalam konteks materi kursus.
- Jika relevan, berikan contoh.
- Jika pertanyaan di luar konteks materi, tetap bantu jawab secara umum.
- Jika pertanyaan berada di luar materi kursus, ingatkan dengan sopan bahwa pertanyaan tersebut berada di luar materi.
`.trim();

  const rawText = await generateContent(prompt, {
    responseMimeType: 'text/plain',
    maxOutputTokens: 8192,
  });

  return rawText.trim();
}

module.exports = {
  generateOutline,
  continueOutlineLevel,
  generateMaterialForSubtopic,
  askChatbot,
  getErrorStatus,
  classifyGeminiError,
};