# Frontend — Katalog Ava

Next.js 16 (App Router) + Tailwind v4. Deploy target: **Vercel**.

UI di-port dari `../index.html` (prototipe single-file). Data diambil dari backend PHP di `../backend/`. Kalau `NEXT_PUBLIC_API_URL` belum di-set, otomatis fallback ke seed lokal di `public/products.json` (102 produk hasil ekstrak dari `index.html`).

## Struktur

```
frontend/
├── app/
│   ├── layout.tsx        # font (Archivo Black, Inter, JetBrains Mono), metadata
│   ├── page.tsx          # halaman katalog (render <Catalog />)
│   └── globals.css       # port CSS dari index.html
├── components/
│   ├── Catalog.tsx       # main client component (state, filter, search)
│   ├── ProductCard.tsx   # kartu produk (bandrol, harga jual, ladder)
│   └── Lightbox.tsx      # modal gambar
├── lib/
│   ├── api.ts            # fetchProducts() + fmtRupiah()
│   └── types.ts          # Product / PriceTier types
├── public/
│   ├── products.json     # seed data untuk dev tanpa backend
│   └── images/           # (opsional) copy dari root ../images/
└── .env.example
```

## Setup lokal

```bash
cp .env.example .env.local
# Isi NEXT_PUBLIC_API_URL=http://localhost:8080 kalau backend PHP sudah jalan.
# Kalau belum, biarkan kosong — pakai seed.

npm install
npm run dev            # http://localhost:3000
```

Kalau punya folder gambar dari prototipe lama, copy ke `public/images/`:
```bash
cp -r ../images public/images
```
(Kalau tidak, kartu akan menampilkan placeholder "Belum ada gambar".)

## Deploy ke Vercel

1. Push ke GitHub (repo `katalog-ava`).
2. Di Vercel → **New Project** → import repo.
3. **Root Directory** → set ke `frontend`.
4. Environment Variables:
   - `NEXT_PUBLIC_API_URL` = `https://api.katalogava.com` (URL backend PHP di Hostinger)
5. Deploy. Setiap push ke `main` → auto deploy.

## Fitur (v1)

- Grid katalog + kategori chip filter
- Search real-time (nama, kategori, varian)
- Kartu produk: bandrol (coret), harga jual, tier grosir dengan MOQ + ladder visual
- Lightbox gambar
- Tombol print (📱 → menu print browser)
- Responsive (grid mengecil di mobile)

## Belum ada (roadmap)

- `/admin/login` + mode edit (post ke API PHP dengan JWT)
- Upload gambar dari admin
- Import/export JSON

## Catatan Next.js 16

- Layout signature pakai type baru: `LayoutProps<'/'>` (bukan `{ children }: { children: React.ReactNode }`).
- `fetch` **tidak** di-cache secara default — di sini pakai `cache: 'no-store'` eksplisit di `lib/api.ts` karena data katalog perlu fresh saat admin update.
- Kalau nanti mau caching, pertimbangkan `'use cache'` + `cacheLife` di function fetcher (lihat `node_modules/next/dist/docs/01-app/01-getting-started/08-caching.md`).
