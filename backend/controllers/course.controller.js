/**
 * controllers/course.controller.js
 * -------------------------------------------------------
 * Controller untuk konversi outline -> kursus lengkap (FR-4)
 * dan tampilan belajar materi + video (FR-5).
 * -------------------------------------------------------
 */

const courseService = require('../../../services/course.service');

function listCourses(req, res, next) {
  try {
    const courses = courseService.getCoursesByUser(req.session.userId);
    res.render('courses/index', { title: 'Kursus Saya', courses });
  } catch (error) {
    next(error);
  }
}

/**
 * FR-4.1 s.d. FR-4.4: memicu konversi outline menjadi kursus lengkap.
 * Karena bisa memanggil Gemini API berkali-kali (per sub-topik),
 * proses ini berjalan sinkron di server namun pengguna diberi
 * progress indicator di sisi klien (lihat views/outlines/show.ejs).
 */
async function convertToCourse(req, res, next) {
  try {
    const { outline, results } = await courseService.convertOutlineToCourse(
      req.params.id,
      req.session.userId
    );
    if (!outline) {
      req.flash('error', 'Outline tidak ditemukan.');
      return res.redirect('/outlines');
    }

    if (results.failed > 0) {
      req.flash(
        'error',
        `Kursus dibuat, namun ${results.failed} sub-topik gagal digenerate (${results.failedSubtopics.join(
          ', '
        )}). Kamu bisa coba regenerasi outline lalu konversi ulang.`
      );
    } else {
      req.flash('success', 'Kursus lengkap berhasil dibuat!');
    }

    res.redirect(`/courses/${outline.id}`);
  } catch (error) {
    req.flash('error', 'Gagal mengonversi outline ke kursus. Silakan coba lagi.');
    res.redirect(`/outlines/${req.params.id}`);
  }
}

function showCourseDetail(req, res, next) {
  try {
    const course = courseService.getCourseDetail(req.params.id, req.session.userId);
    if (!course) {
      req.flash('error', 'Kursus tidak ditemukan.');
      return res.redirect('/courses');
    }
    res.render('courses/show', { title: course.title, course });
  } catch (error) {
    next(error);
  }
}

module.exports = { listCourses, convertToCourse, showCourseDetail };
