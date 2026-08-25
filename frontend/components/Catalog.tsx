'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import type { Product } from '@/lib/types';
import { fetchProducts } from '@/lib/api';
import PublicProductCard from './PublicProductCard';
import ProductDetailModal from './ProductDetailModal';
import Lightbox from './Lightbox';

const MARQUEE_TEXT = 'PREMIUM QUALITY  ·  GROSIR & RETAIL  ·  KIRIM DARI JOGJAKARTA  ·  KATALOG TERBARU  ·  PARTNER OLAHRAGA & FISIOTERAPI';

export default function Catalog() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [activeCat, setActiveCat] = useState<string>('ALL');
  const [lightbox, setLightbox] = useState<string | null>(null);
  const [detail, setDetail] = useState<Product | null>(null);
  const [preparing, setPreparing] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  const footerRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    fetchProducts()
      .then((data) => setProducts(data))
      .catch((e) => setError(String(e)))
      .finally(() => setLoading(false));
  }, []);

  // Header mobile: garis + bayangan baru muncul setelah halaman digeser
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 6);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  // IntersectionObserver — reveal footer huge title saat masuk viewport
  useEffect(() => {
    const el = footerRef.current;
    if (!el) return;
    const targets = el.querySelectorAll('.pub-brand-huge, .pub-footer-meta');
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting) {
            e.target.classList.add('in-view');
            io.unobserve(e.target);
          }
        });
      },
      { threshold: 0.15 }
    );
    targets.forEach((t) => io.observe(t));
    return () => io.disconnect();
  }, [loading]);

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

  const year = new Date().getFullYear();

  // Ringkasan di bawah judul: jadi penunjuk hasil filter, bukan sekadar hiasan
  const heroSub = (() => {
    if (loading) return 'MEMUAT KATALOG…';
    if (!products.length) return 'BELUM ADA PRODUK';
    if (filtered.length !== products.length)
      return `${filtered.length} DARI ${products.length} PRODUK`;
    return `${products.length} PRODUK · GROSIR & RETAIL`;
  })();

  const catKeys = Object.keys(categories).sort();

  // Key untuk memicu re-render + re-animate grid ketika filter berubah
  const gridKey = `${activeCat}::${search}`;

  /**
   * Gambar kartu pakai loading="lazy" — kalau langsung window.print() gambar
   * yang belum masuk viewport bisa kosong di PDF. Jadi paksa eager + tunggu
   * decode dulu, baru buka dialog print.
   */
  // Rail kategori: chip yang dipilih digeser ke tengah supaya tetap kelihatan
  const pickCat = (cat: string, el: HTMLElement) => {
    setActiveCat(cat);
    el.scrollIntoView({ inline: 'center', block: 'nearest', behavior: 'smooth' });
  };

  const handlePrint = async () => {
    if (preparing) return;
    setPreparing(true);
    try {
      const imgs = Array.from(
        document.querySelectorAll<HTMLImageElement>('.pub-card-img img')
      );
      imgs.forEach((img) => {
        img.loading = 'eager';
      });
      await Promise.all(
        imgs.map((img) =>
          img.complete ? Promise.resolve() : img.decode().catch(() => undefined)
        )
      );
    } finally {
      setPreparing(false);
    }
    window.print();
  };

  return (
    <div className="pub-page">
      {/* Top mini-header dengan logo */}
      <header className={`pub-container pub-topbar ${scrolled ? 'scrolled' : ''}`}>
        <Link href="/" className="pub-brand-row pub-logo-wrap" aria-label="Ava Sportivo — beranda">
          <span className="pub-logo-circle">
            <Image
              src="/logo.png"
              alt="Ava Sportivo"
              width={520}
              height={337}
              priority
            />
          </span>
          <div className="pub-brand-text">
            <span className="name">
              <span className="pub-live-dot" />
              AVA SPORTIVO
            </span>
            <span className="tagline">Olahraga &amp; Fisioterapi</span>
          </div>
        </Link>
        <button
          className="pub-pdf-btn"
          onClick={handlePrint}
          disabled={preparing}
          title="Simpan katalog sebagai PDF"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
            <polyline points="7 10 12 15 17 10" />
            <line x1="12" y1="15" x2="12" y2="3" />
          </svg>
          <span className="label">{preparing ? 'MENYIAPKAN…' : 'DOWNLOAD PDF'}</span>
        </button>
      </header>

      {/* Marquee — nilai jual */}
      <div className="pub-marquee">
        <div className="pub-marquee-track">
          <span>{MARQUEE_TEXT}</span>
          <span>{MARQUEE_TEXT}</span>
        </div>
      </div>

      {/* Hero: breadcrumb + title + chips */}
      <section className="pub-container pub-hero">
        <div className="pub-hero-row">
          <div>
            <div className="pub-crumb">/ KATALOG</div>
            <h1 className="pub-title">Koleksi terbaru</h1>
            <p className="pub-hero-sub">{heroSub}</p>
          </div>

          <div className="pub-chips">
            <button
              className={`pub-chip ${activeCat === 'ALL' ? 'active' : ''}`}
              style={{ ['--i' as string]: 0 } as React.CSSProperties}
              onClick={(e) => pickCat('ALL', e.currentTarget)}
            >
              ALL
            </button>
            {catKeys.map((cat, i) => (
              <button
                key={cat}
                className={`pub-chip ${activeCat === cat ? 'active' : ''}`}
                style={{ ['--i' as string]: i + 1 } as React.CSSProperties}
                onClick={(e) => pickCat(cat, e.currentTarget)}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* Search — di bawah chips */}
      <section className="pub-container pub-search">
        <div className="pub-search-inner">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="11" cy="11" r="7" />
            <path d="m21 21-3.5-3.5" />
          </svg>
          <input
            type="text"
            placeholder="Cari produk atau varian…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          {search && (
            <button
              className="pub-search-clear"
              onClick={() => setSearch('')}
              aria-label="Hapus pencarian"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
                <path d="M18 6 6 18M6 6l12 12" />
              </svg>
            </button>
          )}
          <span className="pub-search-count">
            {filtered.length.toString().padStart(2, '0')} / {products.length.toString().padStart(2, '0')}
          </span>
        </div>
      </section>

      {/* Grid */}
      <section className="pub-container pub-grid-wrap">
        {loading ? (
          <div className="pub-grid" aria-hidden="true">
            {Array.from({ length: 6 }).map((_, i) => (
              <div className="pub-skel" key={i}>
                <div className="pub-skel-img" />
                <div className="pub-skel-body">
                  <div className="pub-skel-line" />
                  <div className="pub-skel-line short" />
                  <div className="pub-skel-line tall" />
                </div>
              </div>
            ))}
          </div>
        ) : error ? (
          <p className="pub-empty">
            Gagal memuat data. <Link href="/admin" style={{ color: 'var(--pub-accent)' }}>Login sebagai admin →</Link>
          </p>
        ) : products.length === 0 ? (
          <p className="pub-empty">
            Belum ada produk.{' '}
            <Link href="/admin" style={{ color: 'var(--pub-accent)' }}>
              Tambahkan di admin panel
            </Link>
            .
          </p>
        ) : filtered.length === 0 ? (
          <p className="pub-empty">
            Tidak ada produk yang cocok. Coba kata kunci atau kategori lain.
          </p>
        ) : (
          <div className="pub-grid" key={gridKey}>
            {filtered.map((p, i) => (
              <PublicProductCard
                key={p.id}
                product={p}
                index={i}
                onOpen={setDetail}
              />
            ))}
          </div>
        )}
      </section>

      {/* Footer raksasa */}
      <footer className="pub-container pub-footer" ref={footerRef}>
        <div className="pub-footer-row">
          <h2 className="pub-brand-huge">
            Ava<br />Sportivo
          </h2>
          <div className="pub-footer-meta">
            <div className="pub-footer-meta-line">© {year} AVA SPORTIVO</div>
            <div className="pub-footer-meta-line">JOGJAKARTA — INDONESIA</div>
            <button
              className="pub-pdf-btn wide"
              onClick={handlePrint}
              disabled={preparing}
              style={{ marginTop: 14 }}
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                <polyline points="7 10 12 15 17 10" />
                <line x1="12" y1="15" x2="12" y2="3" />
              </svg>
              <span className="label">{preparing ? 'MENYIAPKAN…' : 'DOWNLOAD PDF'}</span>
            </button>
          </div>
        </div>
      </footer>

      {detail && (
        <ProductDetailModal
          product={detail}
          onClose={() => setDetail(null)}
          onZoom={setLightbox}
        />
      )}

      {lightbox && (
        <Lightbox src={lightbox} onClose={() => setLightbox(null)} />
      )}
    </div>
  );
}
