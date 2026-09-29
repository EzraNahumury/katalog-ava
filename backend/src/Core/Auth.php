<?php
declare(strict_types=1);

namespace App\Core;

/**
 * JWT HS256 minimal (tanpa dependency Composer).
 * Header: {"alg":"HS256","typ":"JWT"}
 * Payload: {sub, iat, exp, ...}
 */
final class Auth
{
    /** Umur token default kalau config.php tidak menyebut jwt_ttl. */
    public const DEFAULT_TTL = 60 * 60 * 24 * 7; // 7 hari

    /** Payload user yang sedang login pada request ini (di-set oleh requireAuth). */
    private static ?array $current = null;

    /** Ambil payload user aktif — null kalau belum lewat requireAuth. */
    public static function current(): ?array
    {
        return self::$current;
    }

    public static function issue(array $claims): string
    {
        $secret = APP_CONFIG['jwt_secret'];
        $ttl    = self::ttl();

        $now = time();
        // iat/exp lama (kalau $claims berasal dari payload token) selalu ditimpa
        unset($claims['iat'], $claims['exp']);
        $payload = array_merge($claims, ['iat' => $now, 'exp' => $now + $ttl]);

        $header  = self::b64url(json_encode(['alg' => 'HS256', 'typ' => 'JWT']));
        $body    = self::b64url(json_encode($payload));
        $sig     = self::b64url(hash_hmac('sha256', "$header.$body", $secret, true));

        return "$header.$body.$sig";
    }

    /** Return payload jika valid, throw jika tidak. */
    public static function verify(string $token): array
    {
        $parts = explode('.', $token);
        if (count($parts) !== 3) {
            throw new \RuntimeException('Malformed token');
        }
        [$header, $body, $sig] = $parts;

        $expected = self::b64url(hash_hmac('sha256', "$header.$body", APP_CONFIG['jwt_secret'], true));
        if (!hash_equals($expected, $sig)) {
            throw new \RuntimeException('Invalid signature');
        }

        $payload = json_decode(self::b64urlDecode($body), true);
        if (!is_array($payload)) {
            throw new \RuntimeException('Invalid payload');
        }
        if (($payload['exp'] ?? 0) < time()) {
            throw new \RuntimeException('Token expired');
        }
        return $payload;
    }

    /** Umur token aktif (detik). */
    public static function ttl(): int
    {
        $ttl = (int)(APP_CONFIG['jwt_ttl'] ?? self::DEFAULT_TTL);
        return $ttl > 0 ? $ttl : self::DEFAULT_TTL;
    }

    /**
     * Cek Authorization header. Kalau invalid → 401 + exit. Return payload.
     * Respons 401 selalu membawa field "code" supaya frontend bisa membedakan
     * sesi habis dari error lain tanpa menebak-nebak isi pesan.
     */
    public static function requireAuth(): array
    {
        $header = $_SERVER['HTTP_AUTHORIZATION']
            ?? $_SERVER['REDIRECT_HTTP_AUTHORIZATION']
            ?? '';
        if (!preg_match('/^Bearer\s+(.+)$/i', $header, $m)) {
            Response::error('Missing bearer token', 401, ['code' => 'missing_token']);
        }

        try {
            $payload = self::verify($m[1]);
        } catch (\Throwable $e) {
            $msg  = $e->getMessage();
            $code = $msg === 'Token expired' ? 'token_expired' : 'invalid_token';
            Response::error('Unauthorized: ' . $msg, 401, ['code' => $code]);
        }

        self::$current = $payload;
        self::maybeRefresh($payload);
        return $payload;
    }

    /**
     * Sliding session: kalau sisa umur token tinggal di bawah setengah TTL,
     * terbitkan token baru dan kirim lewat header X-Refresh-Token. Admin yang
     * masih aktif tidak akan kena "Token expired" di tengah pekerjaan; yang
     * benar-benar menganggur sampai exp tetap harus login lagi.
     */
    private static function maybeRefresh(array $payload): void
    {
        $ttl = self::ttl();
        $exp = (int)($payload['exp'] ?? 0);
        if ($exp - time() > intdiv($ttl, 2)) {
            return; // masih segar, tidak perlu token baru
        }
        if (headers_sent()) {
            return;
        }
        header('X-Refresh-Token: ' . self::issue($payload));
    }

    private static function b64url(string $s): string
    {
        return rtrim(strtr(base64_encode($s), '+/', '-_'), '=');
    }

    private static function b64urlDecode(string $s): string
    {
        $pad = 4 - (strlen($s) % 4);
        if ($pad < 4) $s .= str_repeat('=', $pad);
        return base64_decode(strtr($s, '-_', '+/'));
    }
}
