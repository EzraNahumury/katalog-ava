<?php
declare(strict_types=1);

namespace App\Core;

final class Response
{
    public static function json(mixed $data, int $status = 200): never
    {
        http_response_code($status);
        header('Content-Type: application/json; charset=utf-8');
        echo json_encode($data, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
        exit;
    }

    public static function error(string $message, int $status = 400, array $extra = []): never
    {
        self::json(array_merge(['error' => $message], $extra), $status);
    }

    /** Ambil body request sebagai array. Support JSON dan form-urlencoded. */
    public static function input(): array
    {
        $raw = file_get_contents('php://input') ?: '';
        $ct  = $_SERVER['CONTENT_TYPE'] ?? '';

        if (stripos($ct, 'application/json') !== false) {
            $data = json_decode($raw, true);
            return is_array($data) ? $data : [];
        }

        return $_POST ?: [];
    }
}
