/**
 * services/youtube.service.js
 * -------------------------------------------------------
 * Modul untuk komunikasi dengan YouTube Data API v3.
 *
 * Video hasil pencarian akan diberi skor relevansi.
 * Video dengan skor terlalu rendah tidak akan ditampilkan.
 * -------------------------------------------------------
 */

const fetch = require('node-fetch');
const env = require('../config/env');


/**
 * Cache sederhana.
 */
const searchCache = new Map();


/**
 * Cache 6 jam.
 */
const CACHE_TTL_MS = 1000 * 60 * 60 * 6;


/**
 * Kata yang terlalu umum dan tidak boleh terlalu
 * mempengaruhi relevansi video.
 */
const stopWords = [
  'yang',
  'dan',
  'untuk',
  'dengan',
  'cara',
  'dari',
  'pada',
  'agar',
  'dalam',
  'atau',
  'serta',
  'sebuah',
  'tentang',

  // Kata umum pembelajaran
  'tutorial',
  'belajar',
  'pemula',
  'dasar',
  'teknik',
  'mengenal',
  'membuat',
  'praktis',
  'materi',
  'panduan',
];


/**
 * Mengambil kata penting dari query.
 */
function getImportantWords(text) {
  return (text || '')
    .toLowerCase()
    .replace(/[^\w\s]/g, ' ')
    .split(/\s+/)
    .map((word) => word.trim())
    .filter(
      (word) =>
        word.length >= 4 &&
        !stopWords.includes(word)
    );
}


/**
 * Menghitung relevansi video terhadap query.
 */
function scoreVideo(video, query) {

  const queryWords =
    getImportantWords(query);


  const searchableText =
    `
    ${video.title || ''}
    ${video.description || ''}
    `
      .toLowerCase();


  let score = 0;


  /**
   * Hitung jumlah kata penting
   * yang ditemukan pada video.
   */
  for (const word of queryWords) {

    if (searchableText.includes(word)) {

      score += 1;

    }

  }


  return score;
}


/**
 * Menentukan apakah video cukup relevan.
 */
function isRelevantVideo(video, query) {

  const queryWords =
    getImportantWords(query);


  /**
   * Jika hanya ada sedikit keyword penting,
   * minimal satu keyword harus cocok.
   */
  if (queryWords.length <= 2) {

    return video.relevanceScore >= 1;

  }


  /**
   * Jika query cukup panjang,
   * minimal dua keyword penting harus cocok.
   */
  return video.relevanceScore >= 2;
}


/**
 * Cari video edukatif.
 */
async function searchEducationalVideos(
  query,
  maxResults = 3
) {

  const cacheKey =
    `${query}::${maxResults}`;


  /**
   * Cek cache.
   */
  const cached =
    searchCache.get(cacheKey);


  if (
    cached &&
    cached.expiresAt > Date.now()
  ) {

    return cached.data;

  }


  /**
   * Validasi API key.
   */
  if (!env.youtube.apiKey) {

    console.warn(
      '⚠️ [services/youtube] YOUTUBE_API_KEY belum diisi.'
    );

    return [];

  }


  try {

    /**
     * Query yang dikirim ke YouTube.
     *
     * Tidak perlu memaksa "bahasa Indonesia".
     */
    const searchQuery =
      `${query} tutorial`;


    const searchUrl =
      `https://www.googleapis.com/youtube/v3/search` +
      `?part=snippet` +
      `&q=${encodeURIComponent(searchQuery)}` +
      `&type=video` +
      `&maxResults=15` +
      `&order=relevance` +
      `&relevanceLanguage=id` +
      `&regionCode=ID` +
      `&safeSearch=strict` +
      `&videoEmbeddable=true` +
      `&key=${env.youtube.apiKey}`;


    console.log(
      `🔎 [youtube] Query: "${searchQuery}"`
    );


    const response =
      await fetch(searchUrl);


    if (!response.ok) {

      const errorData =
        await response.text();


      console.error(
        `⚠️ [services/youtube] Status ${response.status}:`,
        errorData
      );


      return [];

    }


    const data =
      await response.json();


    /**
     * Ubah hasil API menjadi format aplikasi.
     */
    const allVideos =
      (data.items || [])
        .filter(
          (item) =>
            item.id &&
            item.id.videoId
        )
        .map(
          (item) => ({
            title:
              item.snippet.title || '',

            description:
              item.snippet.description || '',

            videoId:
              item.id.videoId,

            thumbnailUrl:
              item.snippet.thumbnails?.medium?.url ||
              item.snippet.thumbnails?.high?.url ||
              item.snippet.thumbnails?.default?.url ||
              '',

            url:
              `https://www.youtube.com/watch?v=${item.id.videoId}`,
          })
        )
        .map(
          (video) => ({
            ...video,

            relevanceScore:
              scoreVideo(
                video,
                query
              ),
          })
        );


    /**
     * Tampilkan hasil scoring di terminal.
     *
     * Ini penting untuk debugging.
     */
    console.log(
      '📊 [youtube] Hasil scoring:',
      allVideos.map(
        (video) => ({
          title: video.title,
          score: video.relevanceScore,
        })
      )
    );


    /**
     * HANYA ambil video yang memenuhi
     * syarat relevansi.
     */
    const relevantVideos =
      allVideos
        .filter(
          (video) =>
            isRelevantVideo(
              video,
              query
            )
        )
        .sort(
          (a, b) =>
            b.relevanceScore -
            a.relevanceScore
        )
        .slice(
          0,
          maxResults
        );


    console.log(
      `✅ [youtube] Video relevan ditemukan: ${relevantVideos.length}`
    );


    /**
     * Simpan cache.
     */
    searchCache.set(
      cacheKey,
      {
        data:
          relevantVideos,

        expiresAt:
          Date.now() +
          CACHE_TTL_MS,
      }
    );


    return relevantVideos;


  } catch (error) {

    console.error(
      '⚠️ [services/youtube] Gagal mengambil data video:',
      error.message
    );


    return [];

  }

}


module.exports = {
  searchEducationalVideos,
};