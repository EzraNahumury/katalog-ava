/**
 * Urutan tampil kategori di katalog publik maupun panel admin.
 *
 * Diminta pemilik toko: merek sendiri lebih dulu, baru merek lain, lalu
 * kategori umum. Kategori yang belum terdaftar di sini muncul sesudahnya
 * (urut abjad), dan "LAINNYA" — penampung produk tanpa kategori — selalu
 * paling akhir. Jadi menambah merek baru di admin tidak perlu ubah kode.
 */

// Satu baris = satu posisi. Beberapa ejaan boleh menempati posisi yang sama
// karena nama kategori diketik manual di admin.
const URUTAN: string[][] = [
  ['AYRES'],
  ['AVA'],
  ['FOX'],
  ['AOLIKES'],
  ['AVO'],
  ['FISIO'],
  ['ACCESORIES', 'ACCESSORIES', 'ACCEORIES', 'ACCESORIS', 'ACSESORIS', 'AKSESORIS', 'AKSESORIES'],
];

const RANK_TIDAK_TERDAFTAR = URUTAN.length + 100;
const RANK_LAINNYA = URUTAN.length + 200;

/** Samakan ejaan sebelum dibandingkan: huruf besar, tanpa spasi/tanda baca. */
function normalkan(name: string): string {
  return name.toUpperCase().replace(/[^A-Z0-9]/g, '');
}

export function categoryRank(name: string): number {
  const key = normalkan(name);
  if (key === 'LAINNYA') return RANK_LAINNYA;

  const idx = URUTAN.findIndex((ejaan) => ejaan.some((e) => normalkan(e) === key));
  return idx >= 0 ? idx : RANK_TIDAK_TERDAFTAR;
}

/** Urutkan nama kategori sesuai urutan di atas (tidak mengubah array asli). */
export function sortCategories(names: string[]): string[] {
  return [...names].sort((a, b) => {
    const diff = categoryRank(a) - categoryRank(b);
    if (diff !== 0) return diff;
    return a.localeCompare(b, 'id');
  });
}
