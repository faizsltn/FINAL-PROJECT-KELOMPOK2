# hooks/

Custom React hooks - tempat logic yang butuh React state/lifecycle
(`useState`, `useEffect`, dst) tapi bukan bagian dari tampilan.

Kenapa dipisah dari komponen: biar logic-nya (misal "gimana cara ngecek
status backend") bisa dipake ulang di komponen manapun tanpa nulis ulang,
dan komponennya sendiri jadi lebih fokus ke tampilan doang.

## Contoh yang udah ada

- `useHealthCheck.js` - manggil `GET /health` ke backend lewat
  `utils/api.js`, ngembaliin `{ status, data, checkHealth }`. Halaman
  (`pages/Home.jsx`) tinggal pake hook ini, gak perlu tau detail fetch-nya
  gimana.

## Pola penamaan

Semua custom hook diawali `use` (aturan React, biar React tau ini hook dan
nge-apply rules of hooks ke dia). Satu file = satu hook.
