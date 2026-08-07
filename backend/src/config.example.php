<?php
// Copy file ini menjadi config.php lalu isi kredensial asli.
// config.php TIDAK di-commit (lihat .gitignore).

return [
    // --- Database ---
    'db' => [
        'host'    => 'localhost',
        'name'    => 'u123456_katalog',
        'user'    => 'u123456_admin',
        'pass'    => 'GANTI_PASSWORD',
        'charset' => 'utf8mb4',
    ],

    // --- Auth ---
    // Ganti dengan random string minimal 32 karakter. Contoh:
    //   php -r "echo bin2hex(random_bytes(32));"
    'jwt_secret'   => 'GANTI_DENGAN_RANDOM_STRING_MIN_32_CHAR',
    'jwt_ttl'      => 60 * 60 * 24 * 7, // 7 hari

    // --- CORS ---
    // Daftar origin frontend yang boleh akses API.
    // Contoh: ['https://katalogava.com', 'https://katalog-ava.vercel.app']
    // Pakai ['*'] untuk buka semua (tidak disarankan di production).
    'cors_allowed_origins' => [
        'http://localhost:3000',
        'https://katalog-ava.vercel.app',
    ],

    // --- Upload ---
    // upload_dir: path FISIK untuk simpan file gambar.
    //   - PRODUCTION Hostinger: '/home/uXXXXXX/private/uploads' (di luar public_html)
    //     agar tidak terhapus saat "Memindahkan" (git redeploy fresh-clone).
    //   - LOCAL DEV: __DIR__ . '/../public/uploads' (di dalam backend/public/)
    // upload_url_base: URL publik untuk akses gambar via HTTP.
    //   Semua request /uploads/{file} akan di-serve oleh UploadController
    //   (baca file dari upload_dir, stream dengan cache headers).
    'upload_dir'      => __DIR__ . '/../public/uploads',
    'upload_url_base' => 'https://katalogava.ayreslab.id/uploads',
    'upload_max_size' => 3 * 1024 * 1024,                  // 3 MB
    'upload_allowed_mime' => ['image/jpeg', 'image/png', 'image/webp'],

    // --- Lain-lain ---
    'timezone' => 'Asia/Jakarta',
    'debug'    => false, // set true saat development lokal
];
