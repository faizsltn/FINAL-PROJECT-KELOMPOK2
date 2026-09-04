/**
 * services/course.service.js
 * -------------------------------------------------------
 * Logika bisnis untuk fitur "Konversi Outline ke Kursus Lengkap"
 * (FR-4) dan "Rekomendasi Video" (FR-5).
 *
 * Gemini dan YouTube dipisahkan error handling-nya agar:
 * - Gagal Gemini tidak menghentikan seluruh proses.
 * - Error sementara Gemini seperti 429 / 503 akan dicoba ulang.
 * - Gagal YouTube tidak membuat materi dianggap gagal.
 * - Error lebih mudah diketahui dari terminal.
 * -------------------------------------------------------
 */

const { db } = require('../config/database');
const geminiService = require('../FINAL-PROJECT-KELOMPOK2/backend/services/gemini.service');
const youtubeService = require('./youtube.service');
const outlineService = require('../FINAL-PROJECT-KELOMPOK2/backend/services/outline.service');


/**
 * Delay async.
 */
function sleep(ms) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}


/**
 * Klasifikasi error Gemini (status, quota, retry, dsb) diambil dari
 * services/gemini.service.js — satu-satunya sumber kebenaran, juga
 * dipakai controllers/outline.controller.js untuk pesan ke pengguna.
 */
const { getErrorStatus, classifyGeminiError } = geminiService;

/**
 * Menentukan apakah error layak dicoba ulang.
 */
function shouldRetryGemini(error) {
  return classifyGeminiError(error).isRetryable;
}


/**
 * Generate materi Gemini dengan retry otomatis.
 *
 * 503 = server/model sedang high demand
 * 429 = quota/rate limit
 *
 * Tidak semua error dicoba ulang.
 * Misalnya API key invalid biasanya tidak akan retry.
 */
async function generateMaterialWithRetry(
  params,
  maxRetries = 4
) {
  let lastError = null;

  for (
    let attempt = 1;
    attempt <= maxRetries;
    attempt++
  ) {

    try {

      console.log(
        `🤖 [course] Gemini attempt ${attempt}/${maxRetries}: "${params.subtopicTitle}"`
      );

      const content =
        await geminiService.generateMaterialForSubtopic(
          params
        );

      if (
        !content ||
        typeof content !== 'string' ||
        !content.trim()
      ) {
        throw new Error(
          'Gemini mengembalikan materi kosong.'
        );
      }

      return content;

    } catch (error) {

      lastError = error;

      const status =
        getErrorStatus(error);

      const canRetry =
        shouldRetryGemini(error);

      console.error(
        `⚠️ [course] Gemini gagal attempt ${attempt}/${maxRetries} untuk "${params.subtopicTitle}". Status: ${status || 'unknown'}`
      );

      console.error(
        error.message
      );


      /**
       * Jika bukan error sementara,
       * jangan retry.
       */
      if (!canRetry) {
        throw error;
      }


      /**
       * Jika sudah percobaan terakhir,
       * lempar error.
       */
      if (attempt === maxRetries) {
        break;
      }


      /**
       * Exponential backoff.
       *
       * Attempt 1 → 2 detik
       * Attempt 2 → 4 detik
       * Attempt 3 → 8 detik
       */
      const waitTime =
        Math.min(
          2000 * Math.pow(2, attempt - 1),
          15000
        );

      console.log(
        `⏳ [course] Menunggu ${waitTime / 1000} detik sebelum mencoba Gemini lagi...`
      );

      await sleep(waitTime);

    }
  }

  throw lastError;
}


/**
 * Mengambil semua kursus lengkap milik user.
 */
function getCoursesByUser(userId) {
  return db
    .prepare(
      `
      SELECT *
      FROM outlines
      WHERE user_id = ?
      AND status = 'lengkap'
      ORDER BY updated_at DESC
      `
    )
    .all(userId);
}


/**
 * Mengambil kursus lengkap:
 * outline + levels + subtopics + materi + video.
 */
function getCourseDetail(
  outlineId,
  userId
) {

  const outline =
    outlineService.getOutlineDetail(
      outlineId,
      userId
    );

  if (!outline) {
    return null;
  }


  outline.levels.forEach(
    (level) => {

      level.subtopics.forEach(
        (subtopic) => {

          /**
           * Ambil materi.
           */
          const material =
            db
              .prepare(
                `
                SELECT *
                FROM course_materials
                WHERE subtopic_id = ?
                `
              )
              .get(
                subtopic.id
              );


          subtopic.material =
            material
              ? material.content
              : null;


          /**
           * Ambil video.
           */
          subtopic.videos =
            db
              .prepare(
                `
                SELECT *
                FROM recommended_videos
                WHERE subtopic_id = ?
                `
              )
              .all(
                subtopic.id
              );

        }
      );

    }
  );


  return outline;
}


/**
 * FR-4 dan FR-5
 *
 * Mengubah outline menjadi kursus lengkap.
 */
async function convertOutlineToCourse(
  outlineId,
  userId
) {

  console.log(
    `🚀 [course] Memulai konversi outline ${outlineId}`
  );


  const outline =
    outlineService.getOutlineDetail(
      outlineId,
      userId
    );


  if (!outline) {
    console.log(
      `❌ [course] Outline ${outlineId} tidak ditemukan.`
    );

    return null;
  }


  /**
   * Statement database.
   */
  const insertMaterial =
    db.prepare(
      `
      INSERT INTO course_materials (
        subtopic_id,
        content
      )
      VALUES (?, ?)

      ON CONFLICT(subtopic_id)
      DO UPDATE SET
        content = excluded.content
      `
    );


  const insertVideo =
    db.prepare(
      `
      INSERT INTO recommended_videos (
        subtopic_id,
        title,
        video_id_youtube,
        thumbnail_url,
        url
      )
      VALUES (?, ?, ?, ?, ?)
      `
    );


  const clearVideos =
    db.prepare(
      `
      DELETE FROM recommended_videos
      WHERE subtopic_id = ?
      `
    );


  /**
   * Hasil proses.
   */
  const results = {
    success: 0,
    failed: 0,
    failedSubtopics: [],
  };


  /**
   * Hitung jumlah seluruh sub-topic.
   */
  const totalSubtopics =
    outline.levels.reduce(
      (total, level) => {
        return (
          total +
          level.subtopics.length
        );
      },
      0
    );


  console.log(
    `📚 [course] Total sub-topik: ${totalSubtopics}`
  );


  let currentSubtopic = 0;


  /**
   * Loop semua level.
   */
  for (
    const level of outline.levels
  ) {

    console.log(
      `\n📖 [course] Memproses level: "${level.level_title}"`
    );


    /**
     * Loop semua sub-topic.
     */
    for (
      const subtopic of level.subtopics
    ) {

      currentSubtopic++;


      console.log(
        `\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`
      );

      console.log(
        `📌 [course] Sub-topik ${currentSubtopic}/${totalSubtopics}: "${subtopic.title}"`
      );

      console.log(
        `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`
      );


      /**
       * =====================================
       * STEP 1
       * GENERATE MATERI DARI GEMINI
       * =====================================
       */

      try {

        const content =
          await generateMaterialWithRetry({
            courseTitle:
              outline.title,

            levelTitle:
              level.level_title,

            subtopicTitle:
              subtopic.title,
          });


        /**
         * Simpan materi.
         */
        insertMaterial.run(
          subtopic.id,
          content
        );


        console.log(
          `✅ [course] Materi berhasil disimpan: "${subtopic.title}"`
        );


        /**
         * Jeda kecil sebelum request berikutnya.
         *
         * Tujuannya mengurangi kemungkinan
         * Gemini terkena high demand/rate limit.
         */
        await sleep(1000);


      } catch (error) {

        const status =
          getErrorStatus(error);


        console.error(
          `❌ [course] Materi gagal setelah semua retry untuk "${subtopic.title}"`
        );

        console.error(
          `Status: ${status || 'unknown'}`
        );

        console.error(
          error.message
        );


        results.failed += 1;

        results.failedSubtopics.push(
          subtopic.title
        );


        /**
         * Lanjut ke sub-topic berikutnya.
         */
        continue;
      }


      /**
       * =====================================
       * STEP 2
       * CARI VIDEO DARI YOUTUBE
       * =====================================
       */

      try {

        console.log(
          `🎥 [course] Mencari video: "${subtopic.title}"`
        );


        const videos =
          await youtubeService.searchEducationalVideos(
            subtopic.title,
            3
          );


        /**
         * Hapus video lama.
         */
        clearVideos.run(
          subtopic.id
        );


        /**
         * Simpan video baru.
         */
        videos.forEach(
          (video) => {

            insertVideo.run(
              subtopic.id,
              video.title,
              video.videoId,
              video.thumbnailUrl,
              video.url
            );

          }
        );


        console.log(
          `✅ [course] ${videos.length} video ditemukan untuk "${subtopic.title}"`
        );


      } catch (error) {

        /**
         * YouTube gagal,
         * tetapi materi tetap berhasil.
         */
        console.error(
          `⚠️ [course] YouTube gagal untuk "${subtopic.title}":`
        );

        console.error(
          error.message
        );

      }


      /**
       * Gemini berhasil,
       * sehingga sub-topic dianggap sukses.
       */
      results.success += 1;


      /**
       * Jeda kecil sebelum pindah ke
       * sub-topic berikutnya.
       */
      await sleep(500);

    }
  }


  /**
   * Update status outline.
   *
   * Jika minimal satu materi berhasil,
   * outline tetap menjadi kursus lengkap.
   */
  if (
    results.success > 0
  ) {

    db
      .prepare(
        `
        UPDATE outlines
        SET
          status = 'lengkap',
          updated_at = datetime('now')
        WHERE id = ?
        `
      )
      .run(
        outlineId
      );


    console.log(
      `🎉 [course] Konversi selesai.`
    );

    console.log(
      `✅ Berhasil: ${results.success}`
    );

    console.log(
      `❌ Gagal: ${results.failed}`
    );

  } else {

    console.log(
      `❌ [course] Tidak ada materi yang berhasil dibuat.`
    );

  }


  /**
   * Ambil kursus terbaru.
   */
  return {
    outline:
      getCourseDetail(
        outlineId,
        userId
      ),

    results,
  };
}


/**
 * Mengambil konteks materi untuk chatbot.
 */
function getCourseContextText(
  outlineId,
  userId,
  maxChars = 6000
) {

  const course =
    getCourseDetail(
      outlineId,
      userId
    );


  if (!course) {
    return '';
  }


  let context =
    `Kursus: ${course.title}\n` +
    `${course.description || ''}\n\n`;


  for (
    const level of course.levels
  ) {

    context +=
      `## ${level.level_title}\n`;


    for (
      const sub of level.subtopics
    ) {

      context +=
        `- ${sub.title}` +
        (
          sub.material
            ? `: ${sub.material.slice(0, 300)}...`
            : ''
        ) +
        '\n';

    }
  }


  return context.slice(
    0,
    maxChars
  );
}


module.exports = {
  getCoursesByUser,
  getCourseDetail,
  convertOutlineToCourse,
  getCourseContextText,
};