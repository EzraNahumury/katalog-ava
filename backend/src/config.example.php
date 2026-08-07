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
    'upload_dir'      => __DIR__ . '/../uploads',          // path fisik
    'upload_url_base' => 'https://api.katalogava.com/uploads', // URL publik
    'upload_max_size' => 3 * 1024 * 1024,                  // 3 MB
    'upload_allowed_mime' => ['image/jpeg', 'image/png', 'image/webp'],

    // --- Lain-lain ---
    'timezone' => 'Asia/Jakarta',
    'debug'    => false, // set true saat development lokal
];
