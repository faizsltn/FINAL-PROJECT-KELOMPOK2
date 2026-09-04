/**
 * services/outline.service.js
 * -------------------------------------------------------
 * Logika bisnis untuk fitur "Kelola Outline" (FR-2 & FR-3 pada PRD):
 * generate outline baru, ambil, edit, hapus, regenerasi, dan
 * lanjutkan ke level berikutnya.
 *
 * File ini adalah satu-satunya tempat yang menyentuh tabel:
 * - outlines
 * - outline_levels
 * - outline_subtopics
 * -------------------------------------------------------
 */

const { db } = require('../../../config/database');
const geminiService = require('./gemini.service');

/**
 * Mengambil semua outline milik user.
 */
function getOutlinesByUser(userId) {
  return db
    .prepare(
      `
      SELECT *
      FROM outlines
      WHERE user_id = ?
      ORDER BY updated_at DESC
      `
    )
    .all(userId);
}

/**
 * Mengambil satu outline lengkap beserta:
 * - levels
 * - subtopics
 *
 * Data disusun nested agar siap dipakai oleh view/course service.
 */
function getOutlineDetail(outlineId, userId) {
  const outline = db
    .prepare(
      `
      SELECT *
      FROM outlines
      WHERE id = ?
      AND user_id = ?
      `
    )
    .get(outlineId, userId);

  if (!outline) {
    return null;
  }

  const levels = db
    .prepare(
      `
      SELECT *
      FROM outline_levels
      WHERE outline_id = ?
      ORDER BY level_order ASC
      `
    )
    .all(outlineId);

  outline.levels = levels.map((level) => {
    const subtopics = db
      .prepare(
        `
        SELECT *
        FROM outline_subtopics
        WHERE level_id = ?
        ORDER BY sub_order ASC
        `
      )
      .all(level.id);

    return {
      ...level,
      subtopics,
    };
  });

  return outline;
}

/**
 * Validasi struktur level dari Gemini.
 *
 * Diharapkan:
 *
 * [
 *   {
 *     judul_level: "Level 1",
 *     subtopics: ["Topik A", "Topik B"]
 *   }
 * ]
 */
function validateLevels(levels) {
  if (!Array.isArray(levels) || levels.length === 0) {
    throw new Error(
      'Gemini tidak mengembalikan data level yang valid.'
    );
  }

  for (const level of levels) {
    if (
      !level ||
      typeof level.judul_level !== 'string' ||
      !level.judul_level.trim()
    ) {
      throw new Error(
        'Format judul level dari Gemini tidak valid.'
      );
    }

    if (
      !Array.isArray(level.subtopics) ||
      level.subtopics.length === 0
    ) {
      throw new Error(
        `Sub-topik untuk level "${level.judul_level}" tidak valid.`
      );
    }

    for (const subtopic of level.subtopics) {
      if (
        typeof subtopic !== 'string' ||
        !subtopic.trim()
      ) {
        throw new Error(
          `Format sub-topik pada level "${level.judul_level}" tidak valid.`
        );
      }
    }
  }

  return true;
}

/**
 * Menambahkan levels dan subtopics ke database.
 */
function insertLevelsAndSubtopics(
  outlineId,
  levels,
  startOrder = 1
) {
  validateLevels(levels);

  const insertLevel = db.prepare(
    `
    INSERT INTO outline_levels (
      outline_id,
      level_order,
      level_title
    )
    VALUES (?, ?, ?)
    `
  );

  const insertSubtopic = db.prepare(
    `
    INSERT INTO outline_subtopics (
      level_id,
      title,
      sub_order
    )
    VALUES (?, ?, ?)
    `
  );

  const transaction = db.transaction(
    (levelsToInsert) => {
      levelsToInsert.forEach((level, levelIndex) => {
        const levelTitle = level.judul_level.trim();

        const levelResult = insertLevel.run(
          outlineId,
          startOrder + levelIndex,
          levelTitle
        );

        const levelId = levelResult.lastInsertRowid;

        level.subtopics.forEach(
          (subtopicTitle, subtopicIndex) => {
            insertSubtopic.run(
              levelId,
              subtopicTitle.trim(),
              subtopicIndex + 1
            );
          }
        );
      });
    }
  );

  transaction(levels);
}

/**
 * FR-2:
 * Generate outline baru dari topik bebas teks melalui Gemini API,
 * lalu simpan ke database.
 */
async function createOutlineFromTopic(
  userId,
  topic
) {
  try {
    if (
      !topic ||
      typeof topic !== 'string' ||
      !topic.trim()
    ) {
      throw new Error(
        'Topik pembelajaran tidak boleh kosong.'
      );
    }

    console.log(
      `🤖 [services/outline] Meminta Gemini membuat outline untuk topik: "${topic.trim()}"`
    );

    /**
     * Request ke Gemini.
     */
    const generated =
      await geminiService.generateOutline(
        topic.trim()
      );

    /**
     * Validasi hasil Gemini sebelum masuk database.
     */
    if (
      !generated ||
      typeof generated.judul_kursus !== 'string' ||
      !generated.judul_kursus.trim()
    ) {
      throw new Error(
        'Gemini tidak mengembalikan judul kursus yang valid.'
      );
    }

    if (
      !Array.isArray(generated.levels) ||
      generated.levels.length === 0
    ) {
      throw new Error(
        'Gemini tidak mengembalikan level kursus.'
      );
    }

    validateLevels(generated.levels);

    /**
     * Semua proses penyimpanan dilakukan dalam transaksi.
     *
     * Jika insert outline / level / subtopic gagal,
     * seluruh perubahan database akan dibatalkan. Insert level +
     * subtopic memakai insertLevelsAndSubtopics() (helper di atas)
     * alih-alih ditulis ulang di sini — satu-satunya tempat yang
     * tahu cara insert level/subtopic.
     */
    const transaction = db.transaction(() => {
      const insertOutline = db.prepare(
        `
        INSERT INTO outlines (
          user_id,
          topic,
          title,
          description,
          status
        )
        VALUES (?, ?, ?, ?, 'draft')
        `
      );

      const result = insertOutline.run(
        userId,
        topic.trim(),
        generated.judul_kursus.trim(),
        typeof generated.deskripsi === 'string'
          ? generated.deskripsi.trim()
          : ''
      );

      const outlineId = result.lastInsertRowid;

      insertLevelsAndSubtopics(outlineId, generated.levels, 1);

      return outlineId;
    });

    const outlineId = transaction();

    console.log(
      `✅ [services/outline] Outline berhasil dibuat. ID: ${outlineId}`
    );

    return getOutlineDetail(
      outlineId,
      userId
    );

  } catch (error) {
    /**
     * CETAK ERROR ASLI.
     *
     * Ini penting karena sebelumnya controller hanya
     * menampilkan pesan umum di website.
     */
    console.error(
      '❌ [services/outline] Gagal membuat outline.'
    );

    console.error(
      'Nama error:',
      error.name
    );

    console.error(
      'Pesan error:',
      error.message
    );

    if (error.stack) {
      console.error(
        'Stack error:',
        error.stack
      );
    }

    /**
     * Lempar kembali agar controller menangani redirect
     * dan flash message.
     */
    throw error;
  }
}

/**
 * FR-3.1:
 * Edit judul dan deskripsi outline secara manual.
 */
function updateOutlineTitle(
  outlineId,
  userId,
  {
    title,
    description,
  }
) {
  const outline = db
    .prepare(
      `
      SELECT *
      FROM outlines
      WHERE id = ?
      AND user_id = ?
      `
    )
    .get(
      outlineId,
      userId
    );

  if (!outline) {
    return null;
  }

  db.prepare(
    `
    UPDATE outlines
    SET
      title = ?,
      description = ?,
      updated_at = datetime('now')
    WHERE id = ?
    `
  ).run(
    title,
    description || '',
    outlineId
  );

  return getOutlineDetail(
    outlineId,
    userId
  );
}

/**
 * Update judul level.
 */
function updateLevelTitle(
  levelId,
  outlineId,
  userId,
  newTitle
) {
  const owned = db
    .prepare(
      `
      SELECT ol.id
      FROM outline_levels ol
      JOIN outlines o
        ON o.id = ol.outline_id
      WHERE ol.id = ?
      AND o.id = ?
      AND o.user_id = ?
      `
    )
    .get(
      levelId,
      outlineId,
      userId
    );

  if (!owned) {
    return false;
  }

  db.prepare(
    `
    UPDATE outline_levels
    SET level_title = ?
    WHERE id = ?
    `
  ).run(
    newTitle,
    levelId
  );

  db.prepare(
    `
    UPDATE outlines
    SET updated_at = datetime('now')
    WHERE id = ?
    `
  ).run(outlineId);

  return true;
}

/**
 * Update judul sub-topic.
 */
function updateSubtopicTitle(
  subtopicId,
  outlineId,
  userId,
  newTitle
) {
  const owned = db
    .prepare(
      `
      SELECT ost.id
      FROM outline_subtopics ost
      JOIN outline_levels ol
        ON ol.id = ost.level_id
      JOIN outlines o
        ON o.id = ol.outline_id
      WHERE ost.id = ?
      AND o.id = ?
      AND o.user_id = ?
      `
    )
    .get(
      subtopicId,
      outlineId,
      userId
    );

  if (!owned) {
    return false;
  }

  db.prepare(
    `
    UPDATE outline_subtopics
    SET title = ?
    WHERE id = ?
    `
  ).run(
    newTitle,
    subtopicId
  );

  db.prepare(
    `
    UPDATE outlines
    SET updated_at = datetime('now')
    WHERE id = ?
    `
  ).run(outlineId);

  return true;
}

/**
 * FR-3.2:
 * Hapus outline milik pengguna.
 */
function deleteOutline(
  outlineId,
  userId
) {
  const result = db
    .prepare(
      `
      DELETE FROM outlines
      WHERE id = ?
      AND user_id = ?
      `
    )
    .run(
      outlineId,
      userId
    );

  return result.changes > 0;
}

/**
 * FR-3.3:
 * Regenerasi ulang outline.
 *
 * Menggunakan topik yang sama,
 * lalu mengganti level dan sub-topik lama.
 */
async function regenerateOutline(
  outlineId,
  userId
) {
  try {
    const outline = db
      .prepare(
        `
        SELECT *
        FROM outlines
        WHERE id = ?
        AND user_id = ?
        `
      )
      .get(
        outlineId,
        userId
      );

    if (!outline) {
      return null;
    }

    console.log(
      `🤖 [services/outline] Meregenerasi outline ID ${outlineId}`
    );

    const generated =
      await geminiService.generateOutline(
        outline.topic
      );

    if (
      !generated ||
      !generated.judul_kursus ||
      !Array.isArray(generated.levels)
    ) {
      throw new Error(
        'Hasil regenerasi Gemini tidak valid.'
      );
    }

    validateLevels(
      generated.levels
    );

    /**
     * Hapus dan insert ulang dilakukan dalam transaksi. Insert level +
     * subtopic memakai insertLevelsAndSubtopics() (helper di atas),
     * sama seperti createOutlineFromTopic() dan continueOutlineLevel().
     */
    const transaction = db.transaction(() => {
      db.prepare(
        `
        DELETE FROM outline_levels
        WHERE outline_id = ?
        `
      ).run(outlineId);

      db.prepare(
        `
        UPDATE outlines
        SET
          title = ?,
          description = ?,
          status = 'draft',
          updated_at = datetime('now')
        WHERE id = ?
        `
      ).run(
        generated.judul_kursus.trim(),
        typeof generated.deskripsi === 'string'
          ? generated.deskripsi.trim()
          : '',
        outlineId
      );

      insertLevelsAndSubtopics(outlineId, generated.levels, 1);
    });

    transaction();

    console.log(
      `✅ [services/outline] Outline ID ${outlineId} berhasil diregenerasi.`
    );

    return getOutlineDetail(
      outlineId,
      userId
    );

  } catch (error) {
    console.error(
      `❌ [services/outline] Gagal meregenerasi outline ID ${outlineId}:`,
      error
    );

    throw error;
  }
}

/**
 * FR-3.4:
 * Menambahkan level lanjutan tanpa menghapus level lama.
 */
async function continueOutlineLevel(
  outlineId,
  userId
) {
  try {
    const outline =
      getOutlineDetail(
        outlineId,
        userId
      );

    if (!outline) {
      return null;
    }

    console.log(
      `🤖 [services/outline] Membuat level lanjutan untuk outline ID ${outlineId}`
    );

    const newLevels =
      await geminiService.continueOutlineLevel(
        outline
      );

    validateLevels(
      newLevels
    );

    const nextOrder =
      outline.levels.length + 1;

    insertLevelsAndSubtopics(
      outlineId,
      newLevels,
      nextOrder
    );

    db.prepare(
      `
      UPDATE outlines
      SET updated_at = datetime('now')
      WHERE id = ?
      `
    ).run(outlineId);

    console.log(
      `✅ [services/outline] Level lanjutan berhasil ditambahkan ke outline ID ${outlineId}`
    );

    return getOutlineDetail(
      outlineId,
      userId
    );

  } catch (error) {
    console.error(
      `❌ [services/outline] Gagal melanjutkan outline ID ${outlineId}:`,
      error
    );

    throw error;
  }
}

module.exports = {
  getOutlinesByUser,
  getOutlineDetail,
  createOutlineFromTopic,
  updateOutlineTitle,
  updateLevelTitle,
  updateSubtopicTitle,
  deleteOutline,
  regenerateOutline,
  continueOutlineLevel,
};