/**
 * controllers/outline.controller.js
 * -------------------------------------------------------
 * Controller untuk fitur generate & kelola outline (FR-2, FR-3).
 * -------------------------------------------------------
 */

const outlineService = require('../services/outline.service');
const { classifyGeminiError } = require('../services/gemini.service');

function showNewForm(req, res) {
  res.render('outlines/new', {
    title: 'Buat Outline Kursus',
  });
}

function listOutlines(req, res, next) {
  try {
    const outlines = outlineService.getOutlinesByUser(
      req.session.userId
    );

    res.render('outlines/index', {
      title: 'Outline Saya',
      outlines,
    });
  } catch (error) {
    console.error(
      '❌ [controllers/outline] Gagal mengambil daftar outline:',
      error
    );

    next(error);
  }
}

/**
 * FR-2:
 * Generate outline kursus menggunakan Gemini API.
 */
async function createOutline(req, res, next) {
  try {
    const { topic } = req.body;

    console.log(
      '🚀 [controllers/outline] Memulai generate outline'
    );

    console.log(
      '📚 Topik:',
      topic
    );

    console.log(
      '👤 User ID:',
      req.session.userId
    );

    if (!topic || !topic.trim()) {
      req.flash(
        'error',
        'Topik yang ingin dipelajari wajib diisi.'
      );

      return res.redirect('/outlines/new');
    }

    const outline =
      await outlineService.createOutlineFromTopic(
        req.session.userId,
        topic.trim()
      );

    console.log(
      '✅ [controllers/outline] Outline berhasil dibuat:',
      outline.id
    );

    req.flash(
      'success',
      `Outline "${outline.title}" berhasil dibuat!`
    );

    return res.redirect(
      `/outlines/${outline.id}`
    );

  } catch (error) {

    // =====================================================
    // TAMPILKAN ERROR ASLI DI TERMINAL
    // =====================================================

    console.error('\n');
    console.error('==============================================');
    console.error('❌ GAGAL MEMBUAT OUTLINE');
    console.error('==============================================');

    console.error('Message:');
    console.error(error.message);

    console.error('\nFull error:');
    console.error(error);

    console.error('==============================================');
    console.error('\n');

    // =====================================================
    // DETEKSI ERROR GEMINI
    // Pakai classifyGeminiError() dari services/gemini.service.js
    // — sumber kebenaran yang sama dipakai course.service.js untuk
    // keputusan retry, supaya tidak ada dua logic deteksi berbeda.
    // =====================================================

    const classified = classifyGeminiError(error);

    let userMessage =
      'Gagal membuat outline. Terjadi kesalahan saat menghubungi layanan AI.';

    if (classified.isQuotaError) {
      userMessage =
        'Kuota Gemini API sedang habis atau terkena batas penggunaan. Silakan tunggu beberapa saat atau gunakan API key/project dengan kuota tersedia.';
    } else if (classified.isInvalidKey) {
      userMessage =
        'API Key Gemini tidak valid atau tidak punya akses. Periksa kembali konfigurasi GEMINI_API_KEY.';
    } else if (classified.isModelNotFound) {
      userMessage =
        'Model Gemini tidak dapat digunakan. Periksa konfigurasi GEMINI_MODEL.';
    }

    req.flash(
      'error',
      userMessage
    );

    return res.redirect(
      '/outlines/new'
    );
  }
}

function showOutlineDetail(req, res, next) {
  try {
    const outline =
      outlineService.getOutlineDetail(
        req.params.id,
        req.session.userId
      );

    if (!outline) {
      req.flash(
        'error',
        'Outline tidak ditemukan.'
      );

      return res.redirect('/outlines');
    }

    res.render('outlines/show', {
      title: outline.title,
      outline,
    });

  } catch (error) {

    console.error(
      '❌ [controllers/outline] Gagal mengambil detail outline:',
      error
    );

    next(error);
  }
}

/**
 * FR-3.1:
 * Edit judul outline.
 */
function updateOutline(req, res, next) {
  try {
    const { title, description } =
      req.body;

    const outline =
      outlineService.updateOutlineTitle(
        req.params.id,
        req.session.userId,
        {
          title,
          description,
        }
      );

    if (!outline) {
      req.flash(
        'error',
        'Outline tidak ditemukan.'
      );

      return res.redirect('/outlines');
    }

    req.flash(
      'success',
      'Outline berhasil diperbarui.'
    );

    return res.redirect(
      `/outlines/${outline.id}`
    );

  } catch (error) {

    console.error(
      '❌ [controllers/outline] Gagal update outline:',
      error
    );

    next(error);
  }
}

function updateLevel(req, res, next) {
  try {
    const { levelTitle } =
      req.body;

    const ok =
      outlineService.updateLevelTitle(
        req.params.levelId,
        req.params.id,
        req.session.userId,
        levelTitle
      );

    if (!ok) {
      req.flash(
        'error',
        'Level tidak ditemukan.'
      );
    } else {
      req.flash(
        'success',
        'Judul level berhasil diperbarui.'
      );
    }

    return res.redirect(
      `/outlines/${req.params.id}`
    );

  } catch (error) {

    console.error(
      '❌ [controllers/outline] Gagal update level:',
      error
    );

    next(error);
  }
}

function updateSubtopic(req, res, next) {
  try {
    const { subtopicTitle } =
      req.body;

    const ok =
      outlineService.updateSubtopicTitle(
        req.params.subtopicId,
        req.params.id,
        req.session.userId,
        subtopicTitle
      );

    if (!ok) {
      req.flash(
        'error',
        'Sub-topik tidak ditemukan.'
      );
    } else {
      req.flash(
        'success',
        'Sub-topik berhasil diperbarui.'
      );
    }

    return res.redirect(
      `/outlines/${req.params.id}`
    );

  } catch (error) {

    console.error(
      '❌ [controllers/outline] Gagal update sub-topik:',
      error
    );

    next(error);
  }
}

/**
 * FR-3.2:
 * Hapus outline.
 */
function deleteOutline(req, res, next) {
  try {
    const ok =
      outlineService.deleteOutline(
        req.params.id,
        req.session.userId
      );

    req.flash(
      ok ? 'success' : 'error',
      ok
        ? 'Outline berhasil dihapus.'
        : 'Outline tidak ditemukan.'
    );

    return res.redirect(
      '/outlines'
    );

  } catch (error) {

    console.error(
      '❌ [controllers/outline] Gagal menghapus outline:',
      error
    );

    next(error);
  }
}

/**
 * FR-3.3:
 * Regenerasi outline.
 */
async function regenerateOutline(req, res, next) {
  try {

    console.log(
      '🔄 [controllers/outline] Regenerate outline:',
      req.params.id
    );

    const outline =
      await outlineService.regenerateOutline(
        req.params.id,
        req.session.userId
      );

    if (!outline) {
      req.flash(
        'error',
        'Outline tidak ditemukan.'
      );

      return res.redirect(
        '/outlines'
      );
    }

    req.flash(
      'success',
      'Outline berhasil diregenerasi dengan konten baru.'
    );

    return res.redirect(
      `/outlines/${outline.id}`
    );

  } catch (error) {

    console.error(
      '❌ [controllers/outline] Gagal regenerate outline:',
      error
    );

    req.flash(
      'error',
      error.message ||
        'Gagal meregenerasi outline. Silakan coba lagi.'
    );

    return res.redirect(
      `/outlines/${req.params.id}`
    );
  }
}

/**
 * FR-3.4:
 * Lanjutkan outline ke level berikutnya.
 */
async function continueLevel(req, res, next) {
  try {

    const outline =
      await outlineService.continueOutlineLevel(
        req.params.id,
        req.session.userId
      );

    if (!outline) {
      req.flash(
        'error',
        'Outline tidak ditemukan.'
      );

      return res.redirect(
        '/outlines'
      );
    }

    req.flash(
      'success',
      'Level lanjutan berhasil dibuat.'
    );

    return res.redirect(
      `/outlines/${outline.id}`
    );

  } catch (error) {

    console.error(
      '❌ [controllers/outline] Gagal membuat level lanjutan:',
      error
    );

    req.flash(
      'error',
      error.message ||
        'Gagal membuat level lanjutan. Silakan coba lagi.'
    );

    return res.redirect(
      `/outlines/${req.params.id}`
    );
  }
}

module.exports = {
  showNewForm,
  listOutlines,
  createOutline,
  showOutlineDetail,
  updateOutline,
  updateLevel,
  updateSubtopic,
  deleteOutline,
  regenerateOutline,
  continueLevel,
};