'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import type { Product } from '@/lib/types';
import { fetchProducts } from '@/lib/api';
import ProductCard from './ProductCard';
import Lightbox from './Lightbox';

export default function Catalog() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [activeCat, setActiveCat] = useState<string>('ALL');
  const [lightbox, setLightbox] = useState<string | null>(null);

  useEffect(() => {
    fetchProducts()
      .then((data) => setProducts(data))
      .catch((e) => setError(String(e)))
      .finally(() => setLoading(false));
  }, []);

  const categories = useMemo(() => {
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

  return (
    <>
      <header className="topbar">
        <div className="topbar-inner">
          <div className="brand">
            <span className="brand-mark">K</span>
            <div className="brand-text">
              <h1>KATALOG PRODUK</h1>
              <p>Perlengkapan Olahraga &amp; Fisioterapi</p>
            </div>
          </div>
          <div className="topbar-actions">
            <button
              className="btn btn-ghost"
              onClick={() => window.print()}
              title="Cetak katalog"
            >
              🖶
            </button>
          </div>
        </div>

        <div className="searchbar">
          <input
            type="text"
            placeholder="Cari produk... (nama, kategori, varian)"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <span className="result-count">{filtered.length} produk</span>
        </div>

        <nav className="cat-nav">
          <button
            className={`cat-chip ${activeCat === 'ALL' ? 'active' : ''}`}
            onClick={() => setActiveCat('ALL')}
          >
            Semua <span className="n">{products.length}</span>
          </button>
          {Object.keys(categories)
            .sort()
            .map((cat) => (
              <button
                key={cat}
                className={`cat-chip ${activeCat === cat ? 'active' : ''}`}
                onClick={() => setActiveCat(cat)}
              >
                {cat} <span className="n">{categories[cat]}</span>
              </button>
            ))}
        </nav>
      </header>

      <main className="grid">
        {loading ? (
          <div className="empty-state" style={{ gridColumn: '1 / -1' }}>
            Memuat katalog…
          </div>
        ) : error ? (
          <div className="empty-state" style={{ gridColumn: '1 / -1' }}>
            Gagal memuat data: {error}
            <br />
            <Link href="/admin" style={{ color: 'var(--accent)', fontWeight: 700 }}>
              Login sebagai admin →
            </Link>
          </div>
        ) : products.length === 0 ? (
          <div className="empty-state" style={{ gridColumn: '1 / -1' }}>
            Belum ada produk.{' '}
            <Link href="/admin" style={{ color: 'var(--accent)', fontWeight: 700 }}>
              Login sebagai admin
            </Link>{' '}
            untuk menambahkan.
          </div>
        ) : filtered.length === 0 ? (
          <div className="empty-state" style={{ gridColumn: '1 / -1' }}>
            Tidak ada produk yang cocok dengan pencarian.
          </div>
        ) : (
          filtered.map((p) => (
            <ProductCard key={p.id} product={p} onImageClick={setLightbox} />
          ))
        )}
      </main>

      <footer className="footer">
        <p>
          © {new Date().getFullYear()} Katalog Ava — Perlengkapan Olahraga &amp;
          Fisioterapi
        </p>
      </footer>

      {lightbox && <Lightbox src={lightbox} onClose={() => setLightbox(null)} />}
    </>
  );
}
