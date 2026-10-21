<?php
declare(strict_types=1);

namespace App\Core;

/**
 * Aturan poin Avasport — satu-satunya sumber kebenaran untuk hitungan poin.
 *
 *   - belanja Rp10.000 = 1 poin, dibulatkan ke bawah
 *   - poin dihitung dari TOTAL BAYAR (sesudah potongan), bukan total belanja
 *   - 1 poin = potongan Rp500
 *   - poin yang ditukar tidak boleh melebihi saldo, dan potongannya tidak
 *     boleh melebihi total belanja
 *
 * Frontend punya salinan aturan ini untuk pratinjau (lib/points.ts), tapi
 * angka yang disimpan selalu hasil hitungan di sini.
 */
final class Points
{
    /** Rupiah belanja yang menghasilkan 1 poin. */
    const RUPIAH_PER_POIN = 10000;

    /** Nilai potongan untuk 1 poin, dalam rupiah. */
    const NILAI_POIN = 500;

    /** Poin yang didapat dari sejumlah rupiah yang dibayar. */
    public static function poinDari(int $totalBayar): int
    {
        if ($totalBayar <= 0) return 0;
        return intdiv($totalBayar, self::RUPIAH_PER_POIN);
    }

    /** Potongan rupiah dari sejumlah poin. */
    public static function potongan(int $poin): int
    {
        if ($poin <= 0) return 0;
        return $poin * self::NILAI_POIN;
    }

    /** Poin terbanyak yang masih masuk akal dipakai untuk satu transaksi. */
    public static function maksPoinDipakai(int $totalBelanja, int $saldo): int
    {
        if ($totalBelanja <= 0 || $saldo <= 0) return 0;
        $batasBelanja = intdiv($totalBelanja, self::NILAI_POIN);
        return (int)min($saldo, $batasBelanja);
    }

    /**
     * Hitung satu transaksi. Melempar InvalidArgumentException kalau
     * masukannya tidak valid — pemanggil yang menerjemahkan jadi HTTP 422.
     *
     * @return array{potongan:int,total_bayar:int,poin_didapat:int,saldo_akhir:int}
     */
    public static function hitung(int $totalBelanja, int $poinDipakai, int $saldo): array
    {
        if ($totalBelanja <= 0) {
            throw new \InvalidArgumentException('Total belanja harus lebih dari 0');
        }
        if ($poinDipakai < 0) {
            throw new \InvalidArgumentException('Poin yang ditukar tidak boleh negatif');
        }
        if ($saldo < 0) {
            throw new \InvalidArgumentException('Saldo poin tidak valid');
        }
        if ($poinDipakai > $saldo) {
            throw new \InvalidArgumentException(
                "Poin yang ditukar ($poinDipakai) melebihi saldo pelanggan ($saldo)"
            );
        }

        $potongan = self::potongan($poinDipakai);
        if ($potongan > $totalBelanja) {
            throw new \InvalidArgumentException(
                'Potongan poin (Rp' . number_format($potongan, 0, ',', '.') .
                ') melebihi total belanja (Rp' . number_format($totalBelanja, 0, ',', '.') . ')'
            );
        }

        $totalBayar  = $totalBelanja - $potongan;
        $poinDidapat = self::poinDari($totalBayar);

        return [
            'potongan'     => $potongan,
            'total_bayar'  => $totalBayar,
            'poin_didapat' => $poinDidapat,
            'saldo_akhir'  => $saldo - $poinDipakai + $poinDidapat,
        ];
    }
}
