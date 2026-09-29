<?php
declare(strict_types=1);

// --- Autoloader sederhana (PSR-4 mini) ---
// Namespace App\ → src/
spl_autoload_register(function (string $class): void {
    $prefix = 'App\\';
    if (strncmp($class, $prefix, strlen($prefix)) !== 0) return;
    $relative = str_replace('\\', '/', substr($class, strlen($prefix)));
    $file = __DIR__ . '/' . $relative . '.php';
    if (is_file($file)) require $file;
});

// --- Config ---
// Cari config.php di beberapa lokasi (urutan prioritas):
// 1. ~/private/config.php   → PRODUCTION di Hostinger (di luar git deploy area,
//                              aman dari wipe saat "Memindahkan")
// 2. __DIR__/config.php     → LOCAL DEV (gitignored)
$configPaths = [
    dirname(__DIR__, 5) . '/private/config.php',   // ~/private/ (from public_html/backend/src)
    dirname(__DIR__, 4) . '/private/config.php',   // fallback bila struktur folder berbeda
    __DIR__ . '/config.php',                        // local dev fallback
];

$configFile = null;
foreach ($configPaths as $p) {
    if (is_file($p)) { $configFile = $p; break; }
}

if (!$configFile) {
    http_response_code(500);
    header('Content-Type: application/json');
    echo json_encode([
        'error'   => 'Server misconfigured: config.php not found',
        'tried'   => $configPaths,
    ]);
    exit;
}
$config = require $configFile;

// Expose via constant supaya bisa diambil dari mana saja
define('APP_CONFIG', $config);

// --- CORS ---
$origin = $_SERVER['HTTP_ORIGIN'] ?? '';
$allowed = $config['cors_allowed_origins'] ?? [];
if (in_array('*', $allowed, true) || in_array($origin, $allowed, true)) {
    header('Access-Control-Allow-Origin: ' . ($origin ?: '*'));
    header('Vary: Origin');
}
header('Access-Control-Allow-Headers: Content-Type, Authorization');
// X-Refresh-Token harus di-expose, kalau tidak JS lintas origin (Vercel → API)
// tidak bisa membacanya dan sliding session tidak akan pernah jalan.
header('Access-Control-Expose-Headers: X-Refresh-Token');
header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');
header('Access-Control-Max-Age: 86400');

// Preflight
if (($_SERVER['REQUEST_METHOD'] ?? '') === 'OPTIONS') {
    http_response_code(204);
    exit;
}

// --- Error handling: kembalikan JSON, jangan HTML ---
set_exception_handler(function (\Throwable $e): void {
    http_response_code(500);
    header('Content-Type: application/json');
    $payload = ['error' => 'Internal server error'];
    if (!empty(APP_CONFIG['debug'])) {
        $payload['message'] = $e->getMessage();
        $payload['trace']   = $e->getTraceAsString();
    }
    echo json_encode($payload);
});

// Timezone
date_default_timezone_set($config['timezone'] ?? 'Asia/Jakarta');
