/**
 * Varian disimpan admin sebagai satu string bebas, contoh:
 *   "TERSEDIA WARNA : BIRU MUDA, BIRU TUA, CREAM, HITAM, MERAH"
 *   "S, M, L, XL"
 *   "AS"
 * Helper ini memecahnya jadi label (opsional) + daftar item supaya kartu bisa
 * menampilkan ringkasan dan modal detail bisa menampilkan semuanya.
 */

export type ParsedVariants = {
  label: string | null;
  items: string[];
};

const SPLIT_RE = /[,;\n|·•]+/;

export function parseVariants(raw: string | null | undefined): ParsedVariants {
  const text = (raw ?? '').replace(/\s+/g, ' ').trim();
  if (!text) return { label: null, items: [] };

  let label: string | null = null;
  let list = text;

  // "TERSEDIA WARNA : A, B, C" → label "Tersedia warna", list "A, B, C"
  const colon = text.indexOf(':');
  if (colon > 0 && colon <= 40) {
    const head = text.slice(0, colon).trim();
    const tail = text.slice(colon + 1).trim();
    if (head && tail && !SPLIT_RE.test(head)) {
      label = head;
      list = tail;
    }
  }

  const items = list
    .split(SPLIT_RE)
    .map((s) => s.trim().replace(/^[-–—]\s*/, ''))
    .filter(Boolean);

  return { label, items: items.length ? items : [list] };
}

/** Kata benda buat penghitung: "12 warna" / "4 ukuran" / "3 varian". */
export function variantUnit(label: string | null): string {
  const l = (label ?? '').toLowerCase();
  if (l.includes('warna')) return 'warna';
  if (l.includes('ukuran') || l.includes('size')) return 'ukuran';
  return 'varian';
}
