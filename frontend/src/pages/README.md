# pages/

Komponen level-halaman - satu file di sini biasanya mewakili satu route
utuh (yang didaftarin di `routes/index.jsx`).

Bedanya sama `components/`: halaman di sini boleh "tau banyak hal" (manggil
beberapa hook sekaligus, atur layout keseluruhan halaman), sedangkan
`components/` isinya potongan UI kecil yang reusable dan idealnya gak
ngurusin logic data sendiri.

## Contoh yang udah ada

- `Home.jsx` - halaman utama, manggil `useHealthCheck()` dari `hooks/` buat
  ngecek status backend, terus render hasilnya pake `<HealthBadge />` dari
  `components/`.

## Pola yang disaranin

Halaman = compose dari hooks (buat data/logic) + components (buat tampilan).
Hindari nulis fetch/logic bisnis langsung di JSX halaman - taruh di
`hooks/` biar bisa dites & dipake ulang terpisah dari tampilannya.
