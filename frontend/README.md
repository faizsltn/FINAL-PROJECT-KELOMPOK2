# Frontend

Template frontend pake Vite + React (JSX) + Tailwind CSS. Arsitektur folder
simple: `hooks`, `components`, `pages`, `routes`, `utils` - masing-masing
punya README sendiri yang jelasin isinya.

## Alur render-nya

```
main.jsx
  └── App.jsx
        └── routes/index.jsx   (AppRoutes)
              └── pages/Home.jsx
                    ├── hooks/useHealthCheck.js   (ambil data)
                    ├── components/HealthBadge.jsx (tampilin data)
                    └── utils/api.js               (dipake hook buat fetch)
```

`main.jsx` cuma manggil `<App />`. `App.jsx` bungkus `<BrowserRouter>` dan
manggil `<AppRoutes />` dari `routes/index.jsx`. Route itu yang nentuin
halaman mana yang dirender - di template ini baru ada 1 halaman (`Home`).

## Struktur
```
frontend/
├── index.html
├── vite.config.js
├── tailwind.config.js
├── postcss.config.js
├── .env.example
└── src/
    ├── main.jsx           # entry point, manggil App.jsx
    ├── App.jsx            # bungkus router, manggil routes/index.jsx
    ├── index.css          # import tailwind
    ├── routes/            # definisi semua route (README sendiri)
    ├── pages/             # komponen level-halaman (README sendiri)
    ├── components/        # komponen UI reusable (README sendiri)
    ├── hooks/             # custom hooks (README sendiri)
    └── utils/             # fungsi bantu non-React (README sendiri)
```

## Cara install & jalanin

```bash
cp .env.example .env
npm install
npm run dev
```

Buka `http://localhost:5173`. Pastiin backend-nya juga jalan (`http://localhost:3000`)
biar halaman utama bisa nampilin status "Backend Aktif".

## Yang udah didemoin di template ini

Halaman `Home` manggil `useHealthCheck()` (custom hook) yang fetch ke
`GET /health` di backend lewat `apiGet()` (util), terus hasilnya
ditampilin pake `<HealthBadge />` (komponen reusable) yang warnanya
berubah sesuai status (`checking` abu-abu, `ok` hijau, `error` merah).

Ini contoh kecil pola: **hooks buat data, components buat tampilan, pages
buat nyatuin keduanya** - pola yang sama bisa diikutin buat nambah fitur
baru di project ini.

## Environment variable

`VITE_API_URL` di `.env` nentuin backend-nya di mana. Semua env variable
buat Vite WAJIB diawali `VITE_`, kalo enggak gak bakal ke-expose ke kode
frontend (ini fitur keamanan bawaan Vite, biar env variable sensitif gak
ke-bundle ke JS yang dikirim ke browser).
