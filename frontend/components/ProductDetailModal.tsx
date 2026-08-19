'use client';

import { useEffect } from 'react';
import type { Product } from '@/lib/types';
import { fmtRupiah } from '@/lib/api';
import { parseVariants, variantUnit } from '@/lib/variants';

type Props = {
  product: Product;
  onClose: () => void;
  onZoom?: (src: string) => void;
};

export default function ProductDetailModal({ product, onClose, onZoom }: Props) {
  const { name, category, variants, bandrol, harga_jual, image, tiers } = product;
  const { label, items } = parseVariants(variants);
  const unit = variantUnit(label);

  const hasBandrol = bandrol != null && bandrol > (harga_jual ?? 0);
  const disc =
    hasBandrol && bandrol
      ? Math.round((1 - (harga_jual ?? 0) / bandrol) * 100)
      : 0;

  // Esc untuk tutup + kunci scroll body selama modal terbuka
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = prev;
    };
  }, [onClose]);

  return (
    <div
      className="pub-modal"
      role="dialog"
      aria-modal="true"
      aria-label={name}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="pub-modal-panel">
        <button className="pub-modal-close" onClick={onClose} aria-label="Tutup detail">
          ✕
        </button>

        <div
          className={`pub-modal-media ${image ? 'zoomable' : ''}`}
          onClick={() => image && onZoom?.(image)}
        >
          {image ? (
            <>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={image} alt={name} />
              <span className="pub-modal-zoomhint">Klik gambar untuk perbesar</span>
            </>
          ) : (
            <div className="pub-card-noimg">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                <rect x="3" y="3" width="18" height="18" rx="2" />
                <circle cx="8.5" cy="8.5" r="1.5" />
                <path d="M21 15l-5-5L5 21" />
              </svg>
              <span>Belum ada gambar</span>
            </div>
          )}
        </div>

        <div className="pub-modal-info">
          {category && <span className="pub-modal-cat">{category}</span>}
          <h2 className="pub-modal-name">{name}</h2>

          <div className="pub-modal-headline">
            <span className="now">{fmtRupiah(harga_jual)}</span>
            {hasBandrol && (
              <>
                <span className="was">{fmtRupiah(bandrol)}</span>
                {disc > 0 && <span className="disc">-{disc}%</span>}
              </>
            )}
          </div>

          {items.length > 0 && (
            <section className="pub-modal-sec">
              <h3 className="pub-modal-sec-title">
                {label ?? 'Varian'}
                <span className="count">
                  {items.length} {unit}
                </span>
              </h3>
              <ul className="pub-var-chips">
                {items.map((v, i) => (
                  <li key={i} className="pub-var-chip">
                    {v}
                  </li>
                ))}
              </ul>
            </section>
          )}

          {tiers && tiers.length > 0 && (
            <section className="pub-modal-sec">
              <h3 className="pub-modal-sec-title">
                Harga grosir
                <span className="count">{tiers.length} tingkat</span>
              </h3>
              <table className="pub-modal-tiers">
                <thead>
                  <tr>
                    <th>Minimal</th>
                    <th>Harga / pcs</th>
                    <th>Hemat</th>
                  </tr>
                </thead>
                <tbody>
                  {tiers.map((t, i) => {
                    const g = Number(t.harga_grosir ?? 0);
                    const base = Number(harga_jual ?? 0);
                    const save = base > 0 && g > 0 && g < base ? Math.round((1 - g / base) * 100) : 0;
                    return (
                      <tr key={i}>
                        <td>
                          <span className="moq">min {t.moq ?? '-'}</span>
                        </td>
                        <td className="price">{fmtRupiah(t.harga_grosir)}</td>
                        <td className="save">{save > 0 ? `-${save}%` : '—'}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </section>
          )}

          <p className="pub-modal-note">
            Harga dapat berubah sewaktu-waktu. Hubungi admin untuk stok &amp; pemesanan.
          </p>
        </div>
      </div>
    </div>
  );
}
