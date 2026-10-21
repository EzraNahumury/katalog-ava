/**
 * Nomor WhatsApp selalu disimpan sebagai 628xxxxxxxxx (lihat Core/Phone.php).
 * Fungsi di sini dipakai untuk memeriksa input lebih dulu di layar, supaya
 * kasir tidak perlu menunggu balasan server untuk salah ketik yang jelas.
 */

export function normalizePhone(input: string): string | null {
  const digits = (input || '').replace(/\D+/g, '');
  if (!digits) return null;

  let nomor = digits;
  if (nomor.startsWith('0')) nomor = '62' + nomor.slice(1);
  else if (!nomor.startsWith('62')) nomor = '62' + nomor;

  const lokal = nomor.slice(2);
  if (!lokal.startsWith('8')) return null;
  if (lokal.length < 9 || lokal.length > 13) return null;
  return nomor;
}

/** 6281234567890 → 0812-3456-7890 */
export function displayPhone(phone: string): string {
  if (!phone) return '-';
  const lokal = phone.startsWith('62') ? '0' + phone.slice(2) : phone;
  return (lokal.match(/.{1,4}/g) ?? [lokal]).join('-');
}

/** Link chat WhatsApp dengan pesan yang sudah terisi. */
export function waLink(phone: string, pesan: string): string {
  return `https://wa.me/${phone}?text=${encodeURIComponent(pesan)}`;
}

export function ucapanUlangTahun(nama: string): string {
  return (
    `Halo ${nama}! 🎉 Selamat ulang tahun dari Ava Sportivo. ` +
    'Semoga sehat selalu dan makin semangat olahraganya. ' +
    'Mampir ke toko ya, ada kejutan kecil buat kamu 🎁'
  );
}
