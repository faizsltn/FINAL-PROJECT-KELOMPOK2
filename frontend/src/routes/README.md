# routes/

Tempat definisi semua route/halaman aplikasi, pake `react-router-dom`.

`App.jsx` cuma manggil `<AppRoutes />` dari `routes/index.jsx` - dia gak perlu
tau ada halaman apa aja, itu tanggung jawab folder ini.

## Cara nambah halaman baru

1. Bikin komponen halamannya di `pages/`
2. Import di `routes/index.jsx`
3. Tambahin `<Route path="..." element={<NamaHalaman />} />`

Contoh:
```jsx
import About from '../pages/About';

<Routes>
  <Route path="/" element={<Home />} />
  <Route path="/about" element={<About />} />  {/* baris baru */}
</Routes>
```

Kalo route-nya makin banyak dan butuh nested route atau layout bersama
(misal navbar yang muncul di semua halaman), pertimbangkan pindah ke
`createBrowserRouter` dari `react-router-dom` alih-alih `<Routes>` biasa.
