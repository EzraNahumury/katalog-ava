<?php
declare(strict_types=1);

namespace App\Core;

use PDO;

/**
 * Potongan SQL yang berbeda antara MySQL (produksi) dan SQLite (dipakai tes
 * lokal supaya logika query bisa diuji tanpa MySQL).
 */
final class Sql
{
    public static function isSqlite(PDO $pdo): bool
    {
        return $pdo->getAttribute(PDO::ATTR_DRIVER_NAME) === 'sqlite';
    }

    /** Ekspresi "bulan dari kolom tanggal" sebagai angka 1-12. */
    public static function monthOf(PDO $pdo, string $col): string
    {
        return self::isSqlite($pdo)
            ? "CAST(strftime('%m', $col) AS INTEGER)"
            : "MONTH($col)";
    }

    /** Ekspresi "hari dari kolom tanggal" sebagai angka 1-31. */
    public static function dayOf(PDO $pdo, string $col): string
    {
        return self::isSqlite($pdo)
            ? "CAST(strftime('%d', $col) AS INTEGER)"
            : "DAY($col)";
    }

    /** Ekspresi waktu "sekian menit yang lalu". */
    public static function minutesAgo(PDO $pdo, int $minutes): string
    {
        $m = max(1, $minutes);
        return self::isSqlite($pdo)
            ? "datetime('now', '-$m minutes')"
            : "(NOW() - INTERVAL $m MINUTE)";
    }

    /** Kunci baris saat transaksi (SQLite tidak punya SELECT ... FOR UPDATE). */
    public static function forUpdate(PDO $pdo): string
    {
        return self::isSqlite($pdo) ? '' : ' FOR UPDATE';
    }
}
