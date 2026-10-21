/**
 * Export sederhana ke CSV yang langsung rapi saat dibuka Excel versi Indonesia:
 * pemisah titik koma dan BOM UTF-8 supaya huruf beraksen tidak rusak.
 */

export type CsvColumn<T> = {
  header: string;
  value: (row: T) => string | number | null | undefined;
};

function escapeCell(v: string | number | null | undefined): string {
  if (v === null || v === undefined) return '';
  const s = String(v);
  // Cegah rumus tidak sengaja dijalankan Excel (=, +, -, @ di awal sel).
  const aman = /^[=+\-@]/.test(s) ? `'${s}` : s;
  return /[";\n\r]/.test(aman) ? `"${aman.replace(/"/g, '""')}"` : aman;
}

export function toCsv<T>(rows: T[], columns: CsvColumn<T>[]): string {
  const head = columns.map((c) => escapeCell(c.header)).join(';');
  const body = rows.map((r) => columns.map((c) => escapeCell(c.value(r))).join(';'));
  return [head, ...body].join('\r\n');
}

export function downloadCsv(filename: string, csv: string): void {
  const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  // Beri jeda supaya unduhan sempat mulai sebelum URL dilepas.
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/** Nama berkas dengan tanggal hari ini: pelanggan-2026-10-21.csv */
export function namaFile(prefix: string): string {
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${prefix}-${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}.csv`;
}
