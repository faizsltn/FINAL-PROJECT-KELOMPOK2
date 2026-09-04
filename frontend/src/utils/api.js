const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

/**
 * Wrapper kecil buat GET request ke backend, biar gak nulis ulang
 * fetch() + error handling di tiap komponen/hook yang butuh data.
 */
export async function apiGet(path) {
  const res = await fetch(`${BASE_URL}${path}`);

  if (!res.ok) {
    throw new Error(`Request gagal: ${res.status} ${res.statusText}`);
  }

  return res.json();
}
