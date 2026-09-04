# utils/

Fungsi bantu murni (pure functions) yang gak nyangkut React sama sekali -
gak ada `useState`, gak ada JSX, cuma logic biasa yang bisa dipanggil dari
mana aja (termasuk dari `hooks/`).

## Contoh yang udah ada

- `api.js` - wrapper kecil di atas `fetch()`, isinya `apiGet(path)` yang
  otomatis nambahin base URL backend (`VITE_API_URL` dari `.env`) dan
  nge-throw error kalo response-nya gagal. Dipake di `hooks/useHealthCheck.js`.

## Bedanya sama hooks/

Kalo butuh `useState`/`useEffect`/hook React lain → taruh di `hooks/`.
Kalo cuma fungsi biasa (format tanggal, validasi, panggil API, hitung
sesuatu) yang gak nyangkut React state → taruh di sini.
