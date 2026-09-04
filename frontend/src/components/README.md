# components/

Komponen UI kecil yang reusable - bisa dipake di banyak halaman berbeda.

Prinsipnya: komponen di sini **berbasis data** (props masuk, tampilan
keluar), gak nyimpen logic fetch/state kompleks sendiri. Kalo butuh data
dari server, itu tanggung jawab `hooks/`, bukan komponen ini.

## Contoh yang udah ada

- `HealthBadge.jsx` - badge kecil yang tampilannya (warna & teks) berubah
  sesuai prop `status` (`'checking'` | `'ok'` | `'error'`). Semua kemungkinan
  tampilan didefinisikan di satu tempat (`STATUS_CONFIG`), jadi nambah status
  baru cukup nambah 1 baris, gak perlu if-else berantai di JSX.

## Kapan bikin komponen baru di sini

Kalo ada potongan UI yang dipake di lebih dari 1 halaman, atau kalo satu
halaman udah kepanjangan dan bisa dipecah jadi bagian-bagian yang lebih
kecil dan jelas namanya (misal `ProductCard`, `Navbar`, `LoadingSpinner`).
