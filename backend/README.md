# Backend — Katalog Ava

REST API PHP untuk katalog produk. **Tanpa dependency Composer** — cukup PHP ≥ 8.1 + PDO MySQL.

## Struktur

```
backend/
├── public/              # ← document root (mapped ke public_html/api/ di Hostinger)
│   ├── index.php        # front controller — semua request masuk sini
│   └── .htaccess        # rewrite ke index.php
├── src/                 # ← simpan DI LUAR public_html di Hostinger
│   ├── bootstrap.php    # autoloader, CORS, error handler
│   ├── config.php       # (gitignored) kredensial DB & JWT secret
│   ├── config.example.php
│   ├── Core/
│   │   ├── Router.php
│   │   ├── Database.php
│   │   ├── Response.php
│   │   └── Auth.php     # JWT HS256 hand-rolled
│   └── Controllers/
│       ├── AuthController.php
│       ├── ProductController.php
│       └── CategoryController.php
├── database/
│   ├── schema.sql
│   └── seed_admin.php   # buat user admin
└── uploads/             # (gitignored) file gambar produk
```

## Setup lokal

```bash
# 1. Copy config template
cp src/config.example.php src/config.php
# edit src/config.php — isi DB credential

# 2. Import schema
mysql -u root -p katalog_ava < database/schema.sql

# 3. Buat user admin
php database/seed_admin.php admin admin123

# 4. Jalankan built-in PHP server
php -S localhost:8080 -t public
```

Test: `curl http://localhost:8080/products` → harus `[]`.

## Endpoint

| Method | Endpoint               | Auth  |
|--------|------------------------|-------|
| POST   | `/auth/login`          | -     |
| GET    | `/products`            | -     |
| GET    | `/products/{id}`       | -     |
| POST   | `/products`            | admin |
| PUT    | `/products/{id}`       | admin |
| DELETE | `/products/{id}`       | admin |
| POST   | `/products/{id}/image` | admin |
| GET    | `/categories`          | -     |
| POST   | `/categories`          | admin |
| DELETE | `/categories/{id}`     | admin |

Header untuk endpoint admin: `Authorization: Bearer <token>`

### Contoh: login

```bash
curl -X POST http://localhost:8080/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"admin123"}'
```

Response:
```json
{
  "token": "eyJhbGciOi...",
  "user": { "id": 1, "username": "admin", "role": "admin" }
}
```

### Contoh: buat produk

```bash
TOKEN="eyJhbGciOi..."
curl -X POST http://localhost:8080/products \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "name": "Kaos Combed 30s",
    "category": "PAKAIAN",
    "variants": "S, M, L, XL",
    "bandrol": 75000,
    "harga_jual": 55000,
    "tiers": [
      {"moq": 12, "harga_grosir": 50000},
      {"moq": 50, "harga_grosir": 45000}
    ]
  }'
```

Field `category` boleh string (nama) atau int (id). Kalau string dan belum ada, kategori dibuat otomatis.

### Contoh: upload gambar

```bash
curl -X POST http://localhost:8080/products/1/image \
  -H "Authorization: Bearer $TOKEN" \
  -F "image=@/path/to/photo.jpg"
```

Response: `{"image": "https://api.katalogava.com/uploads/p1-a1b2c3d4.jpg"}`

## Deploy ke Hostinger (Cloud Startup)

Ringkasan (detail di README utama):

1. **Subdomain**: buat `api.katalogava.com` → doc root `public_html/api/`
2. **PHP 8.1+** dengan `pdo_mysql`, `gd` (via hPanel → PHP Configuration)
3. **Upload**:
   - Isi `public/*` → `public_html/api/`
   - Isi `src/*` → `~/backend-src/` (**di luar** public_html!)
   - Isi `database/*` → `~/backend-database/` (opsional, cuma untuk run seed)
4. **Config**:
   - Copy `~/backend-src/config.example.php` → `~/backend-src/config.php`
   - Edit: DB credential dari hPanel, `jwt_secret` (random 32+ char), `cors_allowed_origins` (URL Vercel)
5. **Entry point**: edit `public_html/api/index.php`, ganti:
   ```php
   $srcPath = getenv('KATALOG_SRC_PATH') ?: __DIR__ . '/../src';
   ```
   menjadi:
   ```php
   $srcPath = '/home/u123456/backend-src';
   ```
6. **Uploads folder**: `mkdir public_html/uploads && chmod 755 public_html/uploads`
   - Update `upload_dir` di config → path absolut ke folder ini
   - Update `upload_url_base` → `https://katalogava.com/uploads`
7. **DB**: import `schema.sql` via phpMyAdmin
8. **Admin**: SSH ke Hostinger → `php ~/backend-database/seed_admin.php admin <password>`
9. **SSL**: aktifkan Let's Encrypt untuk `api.katalogava.com`
10. **Test**: `curl https://api.katalogava.com/products`

## Keamanan

- `config.php` **wajib di luar public_html** — kalau tidak, credential bisa terbaca.
- Ganti `jwt_secret` dengan random string: `php -r "echo bin2hex(random_bytes(32));"`
- Set `debug => false` di production.
- `cors_allowed_origins` jangan `['*']` di production — batasi ke domain Vercel & custom domain saja.
- Password admin di-hash pakai `password_hash()` (bcrypt), aman.
