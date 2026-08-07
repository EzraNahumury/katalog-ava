'use client';

import { useEffect, useState, useCallback } from 'react';
import {
  fetchCategories,
  createCategory,
  deleteCategory,
  type Category,
} from '@/lib/api';

type Props = { token: string; onUnauthorized: () => void };

export default function CategoriesView({ token, onUnauthorized }: Props) {
  const [items, setItems] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [name, setName] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setItems(await fetchCategories());
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      setError(msg);
      if (msg.includes('401')) onUnauthorized();
    } finally {
      setLoading(false);
    }
  }, [onUnauthorized]);

  useEffect(() => {
    load();
  }, [load]);

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    const n = name.trim().toUpperCase();
    if (!n) return;
    setSaving(true);
    setError(null);
    try {
      await createCategory(token, n);
      setName('');
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(c: Category) {
    if (c.product_count > 0) {
      if (
        !confirm(
          `Kategori "${c.name}" masih dipakai ${c.product_count} produk. Produk tidak akan terhapus tapi kategorinya jadi kosong. Lanjut?`
        )
      )
        return;
    } else if (!confirm(`Hapus kategori "${c.name}"?`)) {
      return;
    }
    try {
      await deleteCategory(token, c.id);
      await load();
    } catch (e) {
      alert('Gagal hapus: ' + (e instanceof Error ? e.message : String(e)));
    }
  }

  return (
    <>
      <div className="page-head">
        <div>
          <h2>Kategori</h2>
          <p className="sub">Kelola kategori produk</p>
        </div>
      </div>

      <div className="list-wrap">
        {error && <div className="form-error" style={{ marginBottom: 12 }}>{error}</div>}

        <div className="list-card">
          <form className="inline-form" onSubmit={handleAdd}>
            <input
              type="text"
              placeholder="Nama kategori baru (mis: PAKAIAN)"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
            <button className="btn-primary" type="submit" disabled={saving}>
              {saving ? 'Menyimpan…' : '+ Tambah Kategori'}
            </button>
          </form>

          {loading ? (
            <div className="list-empty">Memuat…</div>
          ) : items.length === 0 ? (
            <div className="list-empty">Belum ada kategori.</div>
          ) : (
            items.map((c) => (
              <div className="list-row" key={c.id}>
                <div className="info">
                  <div className="primary">{c.name}</div>
                </div>
                <span className="badge">{c.product_count} produk</span>
                <div className="actions">
                  <button
                    className="icon-btn danger"
                    onClick={() => handleDelete(c)}
                    title="Hapus"
                  >
                    ✕
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </>
  );
}
