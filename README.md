# Katalog Ava

Website katalog produk dengan arsitektur **terpisah (decoupled)**:

- **Frontend**: Next.js (App Router) — di-deploy ke **Vercel**
- **Backend**: PHP + MySQL — di-hosting di **Hostinger Cloud Startup** (paket aktif s/d 2027-04-13)
- **Storage gambar**: folder `/public_html/uploads` di Hostinger (dilayani langsung via URL)

> **Paket Hostinger yang dipakai: Cloud Startup**
> - PHP 8.x (bisa dipilih di hPanel → Advanced → PHP Configuration)
> - MySQL / MariaDB unlimited databases
> - Dedicated IP + free SSL (Let's Encrypt)
> - SSH access (berguna untuk `composer install`, Git pull, dsb.)
> - Cukup untuk beberapa website, jadi domain `katalogava.com` bisa dijadikan subdomain terpisah untuk API: `api.katalogava.com`.

Prototipe UI awal ada di `index.html` (single-file HTML/JS dengan `localStorage`). File tersebut akan dijadikan referensi desain saat membangun ulang di Next.js.

---

## 1. Fitur

### Publik (pengunjung)
- Grid katalog produk dengan gambar, nama, varian, kategori
- Filter berdasarkan kategori (chip)
- Pencarian (nama, kategori, varian)
- Detail harga: **bandrol**, **harga jual (retail)**, dan **harga grosir bertingkat** dengan MOQ
- Lightbox gambar produk
- Cetak/print katalog

### Admin (mode edit, butuh login)
- Tambah / edit / hapus produk (inline editing)
- Kelola kategori (tambah kategori baru dari dropdown)
- Upload gambar produk
- Kelola tingkatan harga (MOQ + harga grosir per tier)
- Import / export data JSON (backup)
- Reset ke data awal

---

## 2. Arsitektur

```
┌──────────────────────┐        HTTPS / JSON        ┌───────────────────────────┐
│  Next.js (Vercel)    │  ───────────────────────▶  │  PHP REST API (Hostinger) │
│  - Server Components │  ◀───────────────────────  │  - /api/*.php             │
│  - Client Components │                            │  - MySQL                  │
│  - Image via <img>   │  ◀─── /uploads/*.jpg ───   │  - /uploads/*             │
└──────────────────────┘                            └───────────────────────────┘
```

- Frontend memanggil API PHP dengan `fetch`. Untuk endpoint publik (list produk / kategori) bisa di-*cache* di Next.js (`revalidate`) supaya cepat & hemat kuota Hostinger.
- Endpoint admin (POST/PUT/DELETE) diamankan dengan **JWT** atau **API key** di header `Authorization`.
- Gambar disajikan langsung oleh Apache Hostinger (URL statis), bukan di-proxy lewat Next.js.

---

## 3. Struktur Folder

```
katalog-ava/
├── frontend/                     # Next.js app (deploy ke Vercel)
│   ├── app/
│   │   ├── page.tsx              # Halaman katalog publik
│   │   ├── admin/
│   │   │   ├── login/page.tsx
│   │   │   └── page.tsx          # Dashboard edit produk
│   │   └── api/                  # (opsional) route handler untuk proxy/cache
│   ├── components/
│   │   ├── ProductCard.tsx
│   │   ├── CategoryNav.tsx
│   │   ├── SearchBar.tsx
│   │   └── PriceLadder.tsx
│   ├── lib/
│   │   ├── api.ts                # wrapper fetch ke backend PHP
│   │   └── auth.ts               # helper token
│   ├── public/
│   ├── .env.local                # NEXT_PUBLIC_API_URL, dll
│   └── package.json
│
├── backend/                      # PHP API (upload ke Hostinger via FTP/Git)
│   ├── public/                   # ← mapped ke public_html/api
│   │   ├── index.php             # front controller (router)
│   │   └── .htaccess             # rewrite → index.php
│   ├── src/
│   │   ├── Controllers/
│   │   │   ├── ProductController.php
│   │   │   ├── CategoryController.php
│   │   │   └── AuthController.php
│   │   ├── Models/
│   │   │   ├── Product.php
│   │   │   └── Category.php
│   │   ├── Core/
│   │   │   ├── Router.php
│   │   │   ├── Database.php      # PDO connection
│   │   │   ├── Response.php      # JSON + CORS helper
│   │   │   └── Auth.php          # JWT verify
│   │   └── config.php            # dibaca dari ENV / file rahasia
│   ├── database/
│   │   └── schema.sql
│   └── uploads/                  # ← mapped ke public_html/uploads
│
├── index.html                    # prototipe lama (referensi UI)
└── README.md
```

---

## 4. Skema Database (MySQL)

```sql
CREATE TABLE categories (
  id         INT AUTO_INCREMENT PRIMARY KEY,
  name       VARCHAR(80) NOT NULL UNIQUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE products (
  id          INT AUTO_INCREMENT PRIMARY KEY,
  category_id INT NULL,
  name        VARCHAR(200) NOT NULL,
  variants    TEXT NULL,
  bandrol     INT NULL,
  harga_jual  INT NULL,
  image       VARCHAR(255) NULL,       -- nama file di /uploads
  sort_order  INT DEFAULT 0,
  created_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE SET NULL
);

CREATE TABLE price_tiers (
  id            INT AUTO_INCREMENT PRIMARY KEY,
  product_id    INT NOT NULL,
  moq           INT NOT NULL,
  harga_grosir  INT NOT NULL,
  sort_order    INT DEFAULT 0,
  FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE
);

CREATE TABLE users (
  id            INT AUTO_INCREMENT PRIMARY KEY,
  username      VARCHAR(60) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  role          ENUM('admin') DEFAULT 'admin',
  created_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

---

## 5. Kontrak API (draft)

Base URL: `https://katalogava.com/api`

| Method | Endpoint               | Auth  | Deskripsi                          |
|--------|------------------------|-------|------------------------------------|
| POST   | `/auth/login`          | -     | Login admin → response `{token}`   |
| GET    | `/products`            | -     | List semua produk (+ tiers, kategori) |
| GET    | `/products/{id}`       | -     | Detail 1 produk                    |
| POST   | `/products`            | admin | Buat produk baru                   |
| PUT    | `/products/{id}`       | admin | Update produk                      |
| DELETE | `/products/{id}`       | admin | Hapus produk                       |
| POST   | `/products/{id}/image` | admin | Upload gambar (multipart)          |
| GET    | `/categories`          | -     | List kategori                      |
| POST   | `/categories`          | admin | Tambah kategori                    |
| DELETE | `/categories/{id}`     | admin | Hapus kategori                     |

Contoh response `GET /products`:

```json
[
  {
    "id": 1,
    "name": "Kaos Polos Cotton Combed 30s",
    "category": "PAKAIAN",
    "variants": "S, M, L, XL",
    "bandrol": 75000,
    "harga_jual": 55000,
    "image": "https://katalogava.com/uploads/kaos-1.jpg",
    "tiers": [
      { "moq": 12, "harga_grosir": 50000 },
      { "moq": 50, "harga_grosir": 45000 },
      { "moq": 100, "harga_grosir": 42000 }
    ]
  }
]
```

---

## 6. Setup Lokal

### Prasyarat
- Node.js ≥ 20
- PHP ≥ 8.1 + ekstensi `pdo_mysql`, `gd`
- MySQL / MariaDB
- Composer (opsional, kalau pakai library JWT)

### Frontend
```bash
cd frontend
npm install
cp .env.example .env.local        # isi NEXT_PUBLIC_API_URL=http://localhost:8080
npm run dev                       # http://localhost:3000
```

### Backend
```bash
cd backend
cp src/config.example.php src/config.php   # isi DB credential
mysql -u root -p < database/schema.sql
php -S localhost:8080 -t public            # dev server
```

---

## 7. Deploy

### Frontend → Vercel
1. Push repo ke GitHub.
2. Di dashboard Vercel: **New Project** → pilih repo → set root directory `frontend`.
3. Set environment variable:
   - `NEXT_PUBLIC_API_URL` = `https://katalogava.com/api`
4. Deploy. Setiap `git push` ke `main` = auto deploy.

### Backend → Hostinger (Cloud Startup)

**Rekomendasi**: pakai **subdomain** `api.katalogava.com` khusus untuk API, biar CORS & routing lebih rapi.

1. **Buat subdomain**
   hPanel → **Domains → Subdomains** → tambahkan `api` → document root otomatis `public_html/api/`.

2. **Set versi PHP**
   hPanel → **Advanced → PHP Configuration** → pilih **PHP 8.1** (atau lebih baru). Aktifkan ekstensi `pdo_mysql`, `gd`, `mbstring`, `openssl`.

3. **Buat database MySQL**
   hPanel → **Databases → Management** → **Create Database**. Catat: host (biasanya `localhost`), nama db, user, password.
   Import `database/schema.sql` via **phpMyAdmin**.

4. **Upload kode**
   Dua opsi:
   - **File Manager / FTP** (FileZilla): upload isi `backend/public/*` ke `public_html/api/`, dan isi `backend/src/*` ke `~/backend-src/` (di *home directory*, **di luar** public_html).
   - **SSH + Git** (lebih cepat untuk update): hPanel → **Advanced → SSH Access** → aktifkan → `ssh -p 65002 u123456@<server>` → `git clone` repo → symlink folder `public/` ke `public_html/api/`.

5. **Konfigurasi kredensial**
   Copy `backend/src/config.example.php` → `~/backend-src/config.php`, isi DB credential dari langkah 3. **Jangan** commit file ini ke Git.

6. **Bootstrap entry point**
   Pastikan `public_html/api/index.php` me-`require __DIR__ . '/../../backend-src/bootstrap.php';` — supaya kode utama tidak bisa diakses langsung dari browser.

7. **Folder uploads**
   `mkdir public_html/uploads` → chmod `755`. Simpan gambar produk di sini, akses via `https://katalogava.com/uploads/<file>.jpg`.

8. **`.htaccess` rewrite** (di `public_html/api/.htaccess`):
   ```apache
   RewriteEngine On
   RewriteCond %{REQUEST_FILENAME} !-f
   RewriteCond %{REQUEST_FILENAME} !-d
   RewriteRule ^ index.php [QSA,L]
   ```

9. **CORS**
   Di bootstrap PHP, kirim header:
   ```php
   header('Access-Control-Allow-Origin: https://katalogava.com'); // atau domain Vercel
   header('Access-Control-Allow-Headers: Content-Type, Authorization');
   header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');
   ```

10. **SSL**
    hPanel → **Security → SSL** → install gratis untuk `api.katalogava.com`. Wajib biar tidak kena mixed-content dari Vercel (HTTPS).

11. **Test**
    Buka `https://api.katalogava.com/products` di browser — harus balas JSON.

---

## 8. Roadmap Migrasi

- [ ] **v0**: Prototipe HTML/JS + localStorage (sudah — `index.html`)
- [ ] **v1**: Scaffold Next.js + porting UI dari `index.html` ke komponen React
- [ ] **v2**: PHP API + MySQL, ganti sumber data dari localStorage → fetch API
- [ ] **v3**: Auth admin (JWT), halaman `/admin` untuk edit
- [ ] **v4**: Upload gambar ke Hostinger (bukan base64 di DB)
- [ ] **v5**: Optimasi — image resize otomatis (PHP `gd`), pagination, caching
- [ ] **v6**: (opsional) Migrasi ke Next.js Image + CDN, SEO metadata, sitemap

---

## 9. Catatan

- Data awal dari `index.html` (`RAW_DATA` di dalam `<script>`) bisa di-export via tombol **Export** dan dijadikan seed database.
- Selama backend belum siap, frontend Next.js bisa pakai file `products.json` statis di `public/` untuk development.
- Domain: dokumentasikan di sini kalau sudah punya (mis. `katalogava.com`).
