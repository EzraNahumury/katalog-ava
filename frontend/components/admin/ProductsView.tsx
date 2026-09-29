'use client';

import { useEffect, useMemo, useState, useCallback } from 'react';
import type { Product } from '@/lib/types';
import {
  fetchProducts,
  fetchCategories,
  deleteProduct,
  type Category,
} from '@/lib/api';
import ProductCard from '../ProductCard';
import ProductForm from './ProductForm';
import { useConfirm, useToast } from '../ui/UIProvider';

type Props = { token: string };

export default function ProductsView({ token }: Props) {
  const confirm = useConfirm();
  const toast = useToast();
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [activeCat, setActiveCat] = useState<string>('ALL');
  const [editing, setEditing] = useState<Product | null | undefined>(undefined);
  // undefined = form tertutup, null = tambah baru, Product = edit

  const loadAll = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [p, c] = await Promise.all([fetchProducts(), fetchCategories()]);
      setProducts(p);
      setCategories(c);
    } catch (e) {
      // 401 ditangani terpusat di lib/api (modal login ulang) — di sini cukup
      // tampilkan pesannya.
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadAll();
  }, [loadAll]);

  const catCounts = useMemo(() => {
    const c: Record<string, number> = {};
    products.forEach((p) => {
      const k = (p.category || 'LAINNYA').trim();
      c[k] = (c[k] || 0) + 1;
    });
    return c;
  }, [products]);

  const filtered = useMemo(() => {
    const s = search.trim().toLowerCase();
    return products.filter((p) => {
      const cat = (p.category || 'LAINNYA').trim();
      if (activeCat !== 'ALL' && cat !== activeCat) return false;
      if (s) {
        const hay = `${p.name} ${p.category ?? ''} ${p.variants ?? ''}`.toLowerCase();
        if (!hay.includes(s)) return false;
      }
      return true;
    });
  }, [products, search, activeCat]);

  async function handleDelete(p: Product) {
    const ok = await confirm({
      title: 'Hapus produk?',
      message: (
        <>
          Produk <b>&quot;{p.name}&quot;</b> akan dihapus permanen beserta semua data harga dan gambarnya.
        </>
      ),
      confirmText: 'Ya, Hapus',
    });
    if (!ok) return;
    try {
      await deleteProduct(token, p.id);
      toast.success('Produk dihapus', `"${p.name}" berhasil dihapus dari katalog.`);
      await loadAll();
    } catch (e) {
      toast.error('Gagal hapus produk', e instanceof Error ? e.message : String(e));
    }
  }

  return (
    <>
      <div className="page-head">
        <div>
          <h2>Produk</h2>
          <p className="sub">{filtered.length} dari {products.length} produk</p>
        </div>
        <button className="btn-primary" style={{ width: 'auto', padding: '10px 18px' }} onClick={() => setEditing(null)}>
          + Tambah Produk
        </button>
      </div>

      <div className="searchbar" style={{ background: 'transparent', padding: '4px 28px 12px' }}>
        <input
          type="text"
          placeholder="Cari produk…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={{ background: '#fff', color: 'var(--ink)', border: '1px solid var(--line)' }}
        />
      </div>

      <nav className="cat-nav" style={{ paddingBottom: 8 }}>
        <button
          className={`cat-chip ${activeCat === 'ALL' ? 'active' : ''}`}
          style={{ background: activeCat === 'ALL' ? 'var(--accent)' : 'var(--card)', color: activeCat === 'ALL' ? '#fff' : 'var(--muted)', borderColor: 'var(--line)' }}
          onClick={() => setActiveCat('ALL')}
        >
          Semua <span className="n">{products.length}</span>
        </button>
        {Object.keys(catCounts)
          .sort()
          .map((cat) => (
            <button
              key={cat}
              className={`cat-chip ${activeCat === cat ? 'active' : ''}`}
              style={{ background: activeCat === cat ? 'var(--accent)' : 'var(--card)', color: activeCat === cat ? '#fff' : 'var(--muted)', borderColor: 'var(--line)' }}
              onClick={() => setActiveCat(cat)}
            >
              {cat} <span className="n">{catCounts[cat]}</span>
            </button>
          ))}
      </nav>

      <main className="grid">
        {loading ? (
          <div className="empty-state" style={{ gridColumn: '1 / -1' }}>Memuat…</div>
        ) : error ? (
          <div className="empty-state" style={{ gridColumn: '1 / -1' }}>Gagal memuat: {error}</div>
        ) : products.length === 0 ? (
          <div className="empty-state" style={{ gridColumn: '1 / -1' }}>
            Belum ada produk. Klik <b>+ Tambah Produk</b> di atas.
          </div>
        ) : (
          filtered.map((p) => (
            <div key={p.id} style={{ position: 'relative' }}>
              <div className="card-actions">
                <button title="Edit" onClick={() => setEditing(p)}>✎</button>
                <button className="del" title="Hapus" onClick={() => handleDelete(p)}>✕</button>
              </div>
              <ProductCard product={p} />
            </div>
          ))
        )}
      </main>

      {editing !== undefined && (
        <ProductForm
          token={token}
          product={editing}
          categories={categories}
          onSaved={async () => {
            setEditing(undefined);
            await loadAll();
          }}
          onClose={() => setEditing(undefined)}
        />
      )}
    </>
  );
}
