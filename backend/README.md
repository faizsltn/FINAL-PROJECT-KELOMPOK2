# Backend

Template backend pake Express - starting point buat project baru. Sengaja
cuma dikasih 1 endpoint (`/health`), tinggal tambahin routes/controllers lain
sesuai kebutuhan project.

## Struktur
```
backend/
├── app.js                     # entry point, setup Express + CORS
├── config/
│   └── env.js                  # centralize semua env variable di 1 tempat
├── routes/
│   └── health.routes.js        # daftar endpoint /health
├── controllers/
│   └── health.controller.js    # logic buat endpoint /health
├── utils/
│   └── response.js             # format response seragam {code, success, message, data}
├── .env.example
└── package.json
```

Kalo mau nambah fitur baru, ikutin pola yang sama: bikin
`routes/<nama>.routes.js` + `controllers/<nama>.controller.js`, terus daftarin
route barunya di `app.js` (`app.use('/<path>', <nama>Routes)`). Controller
selalu balikin response lewat `sendResponse()` dari `utils/response.js`,
bukan `res.json()` langsung, biar bentuk response-nya konsisten di semua
endpoint.

## Cara jalanin

```bash
cp .env.example .env
npm install
npm run dev
```

Server jalan di `http://localhost:3000` (atau sesuai `PORT` di `.env`).

## Endpoint

| Method | Endpoint | Keterangan |
|---|---|---|
| GET | /health | Cek backend hidup atau enggak - dipake frontend buat nunjukin status koneksi |

Contoh respons:
```json
{
  "code": 200,
  "success": true,
  "message": "Backend jalan normal",
  "data": {
    "status": "ok",
    "timestamp": "2026-08-28T10:00:00.000Z"
  }
}
```

## config/env.js

Semua env variable dibaca lewat file ini, bukan `process.env` langsung
tersebar di banyak file. Kalo nambah env variable baru (misal `DB_HOST`
pas nambah database), tambahin di `config/env.js`, terus import
`const config = require('../config/env')` di file yang butuh - jadi ada
1 tempat yang jelasin env apa aja yang dipake project ini.

## utils/response.js

Helper `sendResponse(res, { code, success, message, data })` dipake di
SEMUA controller, biar frontend selalu bisa asumsiin bentuk response API-nya
sama persis di endpoint manapun - gak perlu handling beda-beda tiap fetch.

## CORS

`FRONTEND_URL` di `.env` (dibaca lewat `config/env.js`) nentuin origin mana
yang boleh akses API ini. Default-nya `http://localhost:5173` (port default
Vite dev server). Kalo frontend-nya dijalanin di port/domain lain, ubah
value ini.
