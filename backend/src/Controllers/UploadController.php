<?php
declare(strict_types=1);

namespace App\Controllers;

/**
 * Serve file gambar dari upload_dir (yang lokasinya di luar public_html
 * agar tidak terhapus saat Hostinger redeploy git).
 *
 * Route: GET /uploads/{file}
 * Contoh: GET /uploads/p2-e6f8b0c7.png
 */
final class UploadController
{
    public function serve(array $params): void
    {
        $file = basename((string)($params['file'] ?? '')); // strip path traversal
        $dir  = rtrim((string)(APP_CONFIG['upload_dir'] ?? ''), '/\\');
        $path = $dir . '/' . $file;

        if ($file === '' || $dir === '' || !is_file($path)) {
            http_response_code(404);
            header('Content-Type: text/plain');
            echo 'Not found';
            exit;
        }

        // Deteksi MIME
        $mime = @mime_content_type($path) ?: null;
        if (!$mime) {
            $ext = strtolower(pathinfo($path, PATHINFO_EXTENSION));
            $mime = [
                'jpg'  => 'image/jpeg',
                'jpeg' => 'image/jpeg',
                'png'  => 'image/png',
                'webp' => 'image/webp',
                'gif'  => 'image/gif',
            ][$ext] ?? 'application/octet-stream';
        }

        header('Content-Type: ' . $mime);
        header('Content-Length: ' . filesize($path));
        header('Cache-Control: public, max-age=31536000, immutable');
        header('X-Content-Type-Options: nosniff');
        readfile($path);
        exit;
    }
}
