/**
 * scripts/check-api-keys.js
 * -------------------------------------------------------
 * Script diagnostik MANDIRI — tidak menyentuh Express/database sama
 * sekali. Tujuannya cuma satu: memastikan apakah GEMINI_API_KEY dan
 * YOUTUBE_API_KEY di .env benar-benar bisa dipakai, dan kalau gagal,
 * menunjukkan ALASAN PASTINYA (bukan tebakan) — quota habis, key
 * salah, model salah, region diblokir, dsb.
 *
 * Cara pakai:
 *   node scripts/check-api-keys.js
 * -------------------------------------------------------
 */

require('dotenv').config();
const { GoogleGenAI } = require('@google/genai');

const GEMINI_KEY = process.env.GEMINI_API_KEY || '';
const GEMINI_MODEL = process.env.GEMINI_MODEL || 'gemini-3.6-flash';
const YOUTUBE_KEY = process.env.YOUTUBE_API_KEY || '';

function line() {
  console.log('----------------------------------------------------');
}

async function checkGemini() {
  line();
  console.log('🔎 Mengecek GEMINI_API_KEY...');
  console.log('   Model yang dipakai:', GEMINI_MODEL);
  console.log('   Prefix key:', GEMINI_KEY.slice(0, 6) + '...', '(panjang:', GEMINI_KEY.length, 'karakter)');

  if (!GEMINI_KEY) {
    console.log('❌ GEMINI_API_KEY kosong di .env');
    return;
  }

  const ai = new GoogleGenAI({ apiKey: GEMINI_KEY });

  try {
    const start = Date.now();
    const result = await ai.models.generateContent({
      model: GEMINI_MODEL,
      contents: 'Balas dengan satu kata: OK',
      config: { maxOutputTokens: 10 },
    });
    console.log(`✅ GEMINI BERHASIL (${Date.now() - start}ms). Balasan:`, JSON.stringify(result.text));
  } catch (error) {
    console.log('❌ GEMINI GAGAL');
    console.log('   Status:', error.status || '(tidak ada)');
    console.log('   Pesan asli dari Google:', error.message);
    console.log('');
    diagnoseGeminiError(error);
  }
}

function diagnoseGeminiError(error) {
  const msg = (error.message || '') + ' ' + (error.status || '');

  if (msg.includes('429') || /RESOURCE_EXHAUSTED/i.test(msg) || /quota/i.test(msg)) {
    console.log('🩺 DIAGNOSIS: Kuota/rate limit Gemini API habis (429 / RESOURCE_EXHAUSTED).');
    console.log('   -> Cek pemakaian & kuota di https://aistudio.google.com/app/apikey');
    console.log('   -> Tier gratis Gemini punya limit per menit DAN per hari — coba lagi setelah beberapa menit,');
    console.log('      atau buat API key baru dari project Google Cloud lain.');
  } else if (msg.includes('403') || /PERMISSION_DENIED/i.test(msg)) {
    console.log('🩺 DIAGNOSIS: 403 PERMISSION_DENIED — API key valid tapi tidak punya akses.');
    console.log('   -> Pastikan "Generative Language API" AKTIF di Google Cloud project yang menaungi key ini.');
    console.log('   -> Jika project memakai billing, pastikan billing aktif (beberapa model butuh billing walau ada free tier).');
  } else if (msg.includes('401') || /UNAUTHENTICATED/i.test(msg) || /API_KEY_INVALID/i.test(msg)) {
    console.log('🩺 DIAGNOSIS: API key tidak valid/salah format.');
    console.log('   -> Generate ulang key baru di https://aistudio.google.com/app/apikey dan copy-paste persis (tanpa spasi/kutip).');
  } else if (msg.includes('404') || /NOT_FOUND/i.test(msg) || /is not found/i.test(msg)) {
    console.log('🩺 DIAGNOSIS: Model tidak ditemukan/tidak tersedia untuk key ini.');
    console.log(`   -> Model saat ini: "${GEMINI_MODEL}". Coba ganti GEMINI_MODEL di .env ke model lain,`);
    console.log('      misalnya "gemini-2.5-flash", lalu jalankan script ini lagi.');
  } else {
    console.log('🩺 DIAGNOSIS: Error di luar pola umum di atas — baca "Pesan asli dari Google" di atas apa adanya.');
  }
}

async function checkYoutube() {
  line();
  console.log('🔎 Mengecek YOUTUBE_API_KEY...');
  console.log('   Prefix key:', YOUTUBE_KEY.slice(0, 6) + '...', '(panjang:', YOUTUBE_KEY.length, 'karakter)');

  if (!YOUTUBE_KEY) {
    console.log('❌ YOUTUBE_API_KEY kosong di .env');
    return;
  }

  const url = `https://www.googleapis.com/youtube/v3/search?part=snippet&q=belajar+javascript&type=video&maxResults=1&key=${YOUTUBE_KEY}`;

  try {
    const fetch = require('node-fetch');
    const start = Date.now();
    const res = await fetch(url);
    const body = await res.json();

    if (res.ok) {
      console.log(`✅ YOUTUBE BERHASIL (${Date.now() - start}ms). Video ditemukan:`, body.items?.length || 0);
    } else {
      console.log('❌ YOUTUBE GAGAL. Status HTTP:', res.status);
      console.log('   Pesan asli dari Google:', JSON.stringify(body.error, null, 2));
      diagnoseYoutubeError(res.status, body);
    }
  } catch (error) {
    console.log('❌ YOUTUBE GAGAL (network/exception):', error.message);
  }
}

function diagnoseYoutubeError(status, body) {
  const reason = body?.error?.errors?.[0]?.reason || '';

  if (status === 403 && reason === 'quotaExceeded') {
    console.log('🩺 DIAGNOSIS: Kuota harian YouTube Data API benar-benar habis (quotaExceeded).');
    console.log('   -> Tier gratis cuma 10.000 unit/hari, dan 1x search = 100 unit (~100x pencarian/hari).');
    console.log('   -> Tiap konversi outline ke kursus memanggil search SEKALI PER SUB-TOPIK — kalau outline');
    console.log('      punya 15-20 sub-topik dan kamu coba konversi berkali-kali saat testing, kuota cepat habis.');
    console.log('   -> Kuota reset otomatis tengah malam Pacific Time (siang/sore WIB). Atau buat project GCP baru.');
  } else if (status === 403) {
    console.log('🩺 DIAGNOSIS: 403 tapi bukan quota — kemungkinan "YouTube Data API v3" belum diaktifkan');
    console.log('   di Google Cloud project yang menaungi key ini, atau key dibatasi (API restrictions) sehingga');
    console.log('   tidak boleh memanggil YouTube Data API. Cek di https://console.cloud.google.com/apis/credentials');
  } else if (status === 400) {
    console.log('🩺 DIAGNOSIS: 400 Bad Request — biasanya API key format salah/rusak.');
  } else {
    console.log('🩺 DIAGNOSIS: Error di luar pola umum — baca pesan asli dari Google di atas.');
  }
}

(async () => {
  console.log('======================================================');
  console.log(' DIAGNOSTIK API KEY — AI Course Generator');
  console.log('======================================================');
  await checkGemini();
  await checkYoutube();
  line();
  console.log('Selesai. Jika salah satu GAGAL, baca bagian "DIAGNOSIS" di atasnya untuk tahu langkah perbaikannya.');
})();
