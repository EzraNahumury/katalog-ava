'use client';

import { useState, useEffect, useRef } from 'react';
import type { Product, PriceTier } from '@/lib/types';
import {
  createProduct,
  updateProduct,
  uploadImage,
  type Category,
  type ProductInput,
} from '@/lib/api';

type Props = {
  token: string;
  product: Product | null;
  categories: Category[];
  onSaved: () => void;
  onClose: () => void;
};

type FormState = {
  name: string;
  category: string;
  newCategory: string;
  variants: string;
  bandrol: string;
  harga_jual: string;
  tiers: { moq: string; harga_grosir: string }[];
};

function initFrom(p: Product | null): FormState {
  return {
    name: p?.name ?? '',
    category: p?.category ?? '',
    newCategory: '',
    variants: p?.variants ?? '',
    bandrol: p?.bandrol != null ? String(p.bandrol) : '',
    harga_jual: p?.harga_jual != null ? String(p.harga_jual) : '',
    tiers: p?.tiers?.length
      ? p.tiers.map((t) => ({
          moq: t.moq != null ? String(t.moq) : '',
          harga_grosir: t.harga_grosir != null ? String(t.harga_grosir) : '',
        }))
      : [{ moq: '', harga_grosir: '' }],
  };
}

function numOrNull(s: string): number | null {
  const n = parseInt(s.replace(/[^0-9]/g, ''), 10);
  return isNaN(n) ? null : n;
}

export default function ProductForm({
  token,
  product,
  categories,
  onSaved,
  onClose,
}: Props) {
  const [form, setForm] = useState<FormState>(() => initFrom(product));
  const [file, setFile] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // Produk sudah terlanjur dibuat tapi langkah berikutnya gagal (mis. sesi
  // habis saat upload gambar). Simpan id-nya supaya percobaan berikutnya
  // meng-update baris yang sama, bukan membuat produk kembar.
  const createdIdRef = useRef<number | null>(null);

  useEffect(() => {
    setForm(initFrom(product));
    createdIdRef.current = null;
  }, [product]);

  function updateTier(i: number, key: 'moq' | 'harga_grosir', val: string) {
    setForm((f) => {
      const tiers = f.tiers.slice();
      tiers[i] = { ...tiers[i], [key]: val };
      return { ...f, tiers };
    });
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSaving(true);
    try {
      const category =
        form.category === '__new__' ? form.newCategory.trim() : form.category.trim();

      const tiers: PriceTier[] = form.tiers
        .filter((t) => t.moq && t.harga_grosir)
        .map((t) => ({
          moq: numOrNull(t.moq),
          harga_grosir: numOrNull(t.harga_grosir),
        }));

      const input: ProductInput = {
        name: form.name.trim(),
        category: category || null,
        variants: form.variants.trim() || null,
        bandrol: numOrNull(form.bandrol),
        harga_jual: numOrNull(form.harga_jual),
        tiers,
      };

      if (!input.name) throw new Error('Nama produk wajib');

      const existingId = product?.id ?? createdIdRef.current;
      const saved = existingId
        ? await updateProduct(token, existingId, input)
        : await createProduct(token, input);
      if (!product) createdIdRef.current = saved.id;

      if (file) {
        await uploadImage(token, saved.id, file);
      }

      createdIdRef.current = null;
      onSaved();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
      setSaving(false);
    }
  }

  return (
    <div className="modal-backdrop" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <form className="modal" onSubmit={handleSubmit}>
        <div className="modal-header">
          <h3>{product ? 'Edit Produk' : 'Tambah Produk'}</h3>
          <button type="button" className="modal-close" onClick={onClose} aria-label="Tutup">
            ✕
          </button>
        </div>

        {error && <div className="form-error">{error}</div>}

        <div className="form-field">
          <label>Nama produk *</label>
          <input
            type="text"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            required
          />
        </div>

        <div className="form-row-2">
          <div className="form-field">
            <label>Kategori</label>
            <select
              value={form.category}
              onChange={(e) => setForm({ ...form, category: e.target.value })}
            >
              <option value="">(Tidak ada)</option>
              {categories.map((c) => (
                <option key={c.id} value={c.name}>
                  {c.name}
                </option>
              ))}
              {form.category && !categories.some((c) => c.name === form.category) && (
                <option value={form.category}>{form.category}</option>
              )}
              <option value="__new__">+ Kategori baru…</option>
            </select>
          </div>
          {form.category === '__new__' && (
            <div className="form-field">
              <label>Nama kategori baru</label>
              <input
                type="text"
                value={form.newCategory}
                onChange={(e) => setForm({ ...form, newCategory: e.target.value.toUpperCase() })}
                placeholder="MISAL: FISIO"
                required
              />
            </div>
          )}
        </div>

        <div className="form-field">
          <label>Varian / deskripsi</label>
          <textarea
            value={form.variants}
            onChange={(e) => setForm({ ...form, variants: e.target.value })}
            placeholder="S, M, L, XL — atau warna, ukuran, dsb."
          />
        </div>

        <div className="form-row-2">
          <div className="form-field">
            <label>Bandrol (opsional)</label>
            <input
              type="text"
              inputMode="numeric"
              value={form.bandrol}
              onChange={(e) => setForm({ ...form, bandrol: e.target.value })}
              placeholder="49000"
            />
          </div>
          <div className="form-field">
            <label>Harga Jual (retail)</label>
            <input
              type="text"
              inputMode="numeric"
              value={form.harga_jual}
              onChange={(e) => setForm({ ...form, harga_jual: e.target.value })}
              placeholder="35000"
            />
          </div>
        </div>

        <div className="form-field">
          <label>Tingkat harga grosir (MOQ → harga)</label>
          {form.tiers.map((t, i) => (
            <div className="tier-row" key={i}>
              <input
                type="text"
                inputMode="numeric"
                value={t.moq}
                onChange={(e) => updateTier(i, 'moq', e.target.value)}
                placeholder="MOQ (12)"
              />
              <input
                type="text"
                inputMode="numeric"
                value={t.harga_grosir}
                onChange={(e) => updateTier(i, 'harga_grosir', e.target.value)}
                placeholder="Harga grosir (25000)"
              />
              <button
                type="button"
                className="rm"
                onClick={() =>
                  setForm((f) => ({ ...f, tiers: f.tiers.filter((_, idx) => idx !== i) }))
                }
                title="Hapus tier"
              >
                ✕
              </button>
            </div>
          ))}
          <button
            type="button"
            className="tier-add"
            onClick={() =>
              setForm((f) => ({ ...f, tiers: [...f.tiers, { moq: '', harga_grosir: '' }] }))
            }
          >
            + Tambah tingkat harga
          </button>
        </div>

        <div className="form-field">
          <label>Gambar {product?.image ? '(ganti — kosongkan untuk tetap)' : '(opsional)'}</label>
          <input
            type="file"
            accept="image/jpeg,image/png,image/webp"
            onChange={(e) => setFile(e.target.files?.[0] ?? null)}
          />
        </div>

        <div className="modal-footer">
          <button type="button" className="btn-secondary" onClick={onClose} disabled={saving}>
            Batal
          </button>
          <button className="btn-primary" type="submit" disabled={saving}>
            {saving ? 'Menyimpan…' : product ? 'Simpan Perubahan' : 'Tambah Produk'}
          </button>
        </div>
      </form>
    </div>
  );
}
