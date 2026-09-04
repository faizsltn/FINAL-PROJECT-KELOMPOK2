# 🎓 AI Course Generator

Platform pembelajaran mandiri berbasis web yang mengintegrasikan **Gemini API** (generate outline & materi kursus), **YouTube Data API** (rekomendasi video edukatif), dan **chatbot interaktif** kontekstual — dibangun untuk Final Project mata kuliah **PAW (Pengembangan Aplikasi Web)**, Kelompok 2.

Dokumen acuan: `PRD-AI-Course-Generator-Kelompok-2.md` dan jurnal *"Implementasi Gemini API Pada Aplikasi AI Course Generator Untuk Pembelajaran Personal"* (Jurnal Algoritma, ITG).

---

## ✨ Fitur Utama

| Fitur | Referensi PRD |
|---|---|
| Autentikasi (daftar, masuk, reset password) | FR-1 |
| Generate outline kursus otomatis (Gemini API) | FR-2 |
| Kelola outline: edit, hapus, regenerasi, lanjutkan level | FR-3 |
| Konversi outline → kursus lengkap (materi + video) | FR-4 |
| Rekomendasi video pembelajaran (YouTube Data API) | FR-5 |
| Chatbot interaktif kontekstual per kursus | FR-6 |
| Riwayat interaksi chatbot per kursus & manajemen profil | FR-7 |

## 🛠️ Tech Stack

- **Backend**: Node.js + Express.js
- **View Engine**: EJS + `express-ejs-layouts`
- **Styling**: Tailwind CSS (CDN)
- **Database**: SQLite (`better-sqlite3`) — dipilih agar proyek dapat langsung dijalankan dosen penguji tanpa setup server database eksternal (setara Supabase/PostgreSQL pada rancangan awal)
- **AI Engine**: Google Gemini API (`@google/generative-ai`, model `gemini-2.0-flash-001`)
- **Video**: YouTube Data API v3
- **Auth**: `bcryptjs` (hash password) + `express-session`

## 📁 Struktur Folder

```
ai-course-generator/
├── app.js                  # Entry point aplikasi
├── config/                 # Konfigurasi env & database
│   ├── env.js
│   └── database.js
├── controllers/             # Logika kontroler per fitur
│   ├── auth.controller.js
│   ├── outline.controller.js
│   ├── course.controller.js
│   ├── chatbot.controller.js
│   └── profile.controller.js
├── services/                # Logika bisnis & integrasi API eksternal
│   ├── gemini.service.js    # Semua panggilan ke Gemini API
│   ├── youtube.service.js   # Semua panggilan ke YouTube Data API (dengan cache)
│   ├── auth.service.js
│   ├── outline.service.js
│   ├── course.service.js
│   └── chatbot.service.js
├── middlewares/
│   ├── auth.middleware.js   # requireAuth, redirectIfAuthenticated
│   ├── error.middleware.js  # Penanganan error terpusat
│   └── validate.middleware.js
├── routes/                  # Routing per fitur
├── seeders/                 # Data awal (akun demo)
├── views/
│   ├── layouts/main.ejs     # Layout utama
│   ├── partials/            # navbar, footer, flash-messages, chatbot-widget
│   ├── auth/                # login, register, forgot/reset password
│   ├── outlines/            # index, new, show
│   ├── courses/             # index, show, chat-history
│   └── profile/             # edit
├── public/                  # CSS & JS statis
└── database/                # File SQLite (dibuat otomatis)
```

## 🚀 Cara Menjalankan

### 1. Prasyarat
- Node.js versi 18 ke atas
- API Key **Gemini** — buat di [Google AI Studio](https://aistudio.google.com/app/apikey)
- API Key **YouTube Data API v3** — buat di [Google Cloud Console](https://console.cloud.google.com/apis/credentials) (aktifkan "YouTube Data API v3" terlebih dahulu)

### 2. Instalasi

```bash
# Masuk ke folder proyek
cd ai-course-generator

# Install dependencies
npm install

# Salin file environment
cp .env.example .env
```

Buka file `.env` lalu isi:

```env
GEMINI_API_KEY=isi_dengan_api_key_gemini_asli
YOUTUBE_API_KEY=isi_dengan_api_key_youtube_asli
SESSION_SECRET=ganti_dengan_string_acak_yang_panjang
```

### 3. (Opsional) Buat Akun Demo

```bash
npm run seed
```

Akan membuat akun: `mahasiswa.demo@example.com` / password `password123`.

### 4. Jalankan Aplikasi

```bash
npm start
```

Buka `http://localhost:3000` di browser.

Untuk mode development dengan auto-reload (perlu `nodemon`, sudah termasuk di devDependencies):

```bash
npm run dev
```

## 🔄 Alur Penggunaan

1. **Daftar/Masuk** ke aplikasi.
2. Di halaman **Outline Baru**, masukkan topik bebas (mis. "Belajar Dasar Machine Learning") → Gemini API menyusun outline terstruktur (level + sub-topik).
3. Di halaman **detail outline**, kamu bisa **edit** judul/level/sub-topik, **regenerasi** seluruh outline, atau **lanjutkan level** untuk menambah level baru.
4. Klik **"Konversi Jadi Kursus Lengkap"** → sistem men-generate materi teks (Gemini API) dan mencari video relevan (YouTube Data API) untuk setiap sub-topik. Jika sebagian sub-topik gagal, kursus tetap dibuat dengan bagian yang berhasil (tidak gagal total).
5. Buka halaman **Belajar** — baca materi, tonton video, lalu klik ikon 💬 di pojok kanan bawah untuk bertanya ke **chatbot** seputar materi yang sedang dipelajari.
6. Riwayat percakapan chatbot bisa dilihat kembali di menu **Riwayat Chatbot**, dikelompokkan per kursus.
7. Kelola data akun di menu **Profil**.

## ⚠️ Catatan Penting

- **Reset password** pada versi demo ini menampilkan tautan reset langsung di halaman (bukan dikirim lewat email sungguhan) karena tidak ada server SMTP yang dikonfigurasi — namun mekanisme token dengan masa berlaku 30 menit tetap berjalan nyata dan aman, sehingga mudah diganti ke pengiriman email asli (mis. via Nodemailer) tanpa mengubah `services/auth.service.js`.
- **Kuota YouTube Data API** bersifat terbatas untuk tier gratis. Hasil pencarian video di-cache selama 6 jam di memori server (`services/youtube.service.js`) untuk mengurangi pemanggilan berulang.
- Jika **YouTube API gagal/kuota habis**, materi teks tetap tampil tanpa video (tidak gagal total) — sesuai FR-5.4.
- Jika **Gemini API gagal** saat generate/konversi, pengguna akan melihat pesan error yang jelas dan dapat mencoba lagi.
- Database SQLite (`database/aicourse.sqlite`) dibuat otomatis saat aplikasi pertama kali dijalankan — tidak perlu setup manual.

## 👥 Tim — Kelompok 2

| Nama | NIM |
|---|---|
| Faiz Sulthon Daud Muhammad | 20240140258 |
| Zahwa Rezi Fadhilah Yasyfi' | 20240140237 |
| Radiva Galih Nofriyanto | 20240140279 |

---
