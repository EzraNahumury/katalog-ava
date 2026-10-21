<?php
declare(strict_types=1);

namespace App\Core;

/**
 * Normalisasi nomor WhatsApp Indonesia ke bentuk 628xxxxxxxxx.
 *
 * Kasir mengetik nomor dengan gaya macam-macam (0812…, +62 812…, 62812-3456),
 * sementara nomor dipakai sebagai kunci unik pelanggan dan sebagai kata kunci
 * di halaman pembeli. Jadi semua disimpan dalam satu bentuk.
 */
final class Phone
{
    /**
     * @return string nomor dalam bentuk 628xxxxxxxxx
     * @throws \InvalidArgumentException kalau nomornya tidak masuk akal
     */
    public static function normalize(string $input): string
    {
        $digits = preg_replace('/\D+/', '', $input);
        if ($digits === '' || $digits === null) {
            throw new \InvalidArgumentException('Nomor WhatsApp wajib diisi');
        }

        // 0812… → 62812…, 812… → 62812…, 62812… tetap
        if (strpos($digits, '0') === 0) {
            $digits = '62' . substr($digits, 1);
        } elseif (strpos($digits, '62') !== 0) {
            $digits = '62' . $digits;
        }

        // 62 + nomor operator (minimal 9 digit, maksimal 13)
        $lokal = substr($digits, 2);
        if (strpos($lokal, '8') !== 0) {
            throw new \InvalidArgumentException('Nomor WhatsApp harus nomor HP (08… atau 628…)');
        }
        if (strlen($lokal) < 9 || strlen($lokal) > 13) {
            throw new \InvalidArgumentException('Panjang nomor WhatsApp tidak wajar');
        }

        return $digits;
    }

    /** Bentuk enak dibaca: 0812-3456-7890 */
    public static function display(string $phone): string
    {
        $lokal = strpos($phone, '62') === 0 ? '0' . substr($phone, 2) : $phone;
        return trim(chunk_split($lokal, 4, '-'), '-');
    }
}
