/**
 * Salinan aturan poin untuk pratinjau di layar kasir.
 * Angka yang disimpan tetap hasil hitungan backend (Core/Points.php) —
 * di sini hanya supaya kasir melihat hasilnya sebelum menekan Simpan.
 */

export const RUPIAH_PER_POIN = 10000;
export const NILAI_POIN = 500;

export function poinDari(totalBayar: number): number {
  if (!Number.isFinite(totalBayar) || totalBayar <= 0) return 0;
  return Math.floor(totalBayar / RUPIAH_PER_POIN);
}

export function potonganDari(poin: number): number {
  if (!Number.isFinite(poin) || poin <= 0) return 0;
  return Math.floor(poin) * NILAI_POIN;
}

/** Poin terbanyak yang masih boleh ditukar pada satu transaksi. */
export function maksPoinDipakai(totalBelanja: number, saldo: number): number {
  if (totalBelanja <= 0 || saldo <= 0) return 0;
  return Math.min(Math.floor(saldo), Math.floor(totalBelanja / NILAI_POIN));
}

export type HitungTransaksi = {
  potongan: number;
  totalBayar: number;
  poinDidapat: number;
  saldoAkhir: number;
  /** Pesan kenapa transaksi belum bisa disimpan, null kalau sudah beres. */
  error: string | null;
};

export function hitungTransaksi(
  totalBelanja: number,
  poinDipakai: number,
  saldo: number
): HitungTransaksi {
  const belanja = Math.max(0, Math.floor(totalBelanja || 0));
  const poin = Math.max(0, Math.floor(poinDipakai || 0));
  const potongan = potonganDari(poin);

  let error: string | null = null;
  if (belanja <= 0) error = 'Total belanja belum diisi.';
  else if (poin > saldo) error = `Poin yang ditukar melebihi saldo (${saldo} poin).`;
  else if (potongan > belanja) error = 'Potongan poin melebihi total belanja.';

  const totalBayar = Math.max(0, belanja - potongan);
  const poinDidapat = error ? 0 : poinDari(totalBayar);

  return {
    potongan,
    totalBayar,
    poinDidapat,
    saldoAkhir: error ? saldo : saldo - poin + poinDidapat,
    error,
  };
}

export function fmtRp(n: number | null | undefined): string {
  if (n === null || n === undefined || !Number.isFinite(n)) return 'Rp0';
  return 'Rp' + Math.round(n).toLocaleString('id-ID');
}

/** "25 Okt 2026, 14.30" dari timestamp MySQL. */
export function fmtTanggal(iso: string | null | undefined): string {
  if (!iso) return '-';
  const normal = iso.includes('T') ? iso : iso.replace(' ', 'T');
  const d = new Date(normal);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleString('id-ID', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}
