'use client';

import type { Product } from '@/lib/types';
import { fmtRupiah } from '@/lib/api';

type Props = {
  product: Product;
  onImageClick?: (src: string) => void;
};

function Ladder({ tiers }: { tiers: Product['tiers'] }) {
  if (!tiers?.length) return null;
  const vals = tiers.map((t) => Number(t.harga_grosir ?? 0));
  const max = Math.max(...vals, 1);
  return (
    <div className="ladder">
      {tiers.map((t, i) => {
        const v = Number(t.harga_grosir ?? 0);
        const h = Math.max(18, (v / max) * 100);
        return (
          <div
            key={i}
            className={`ladder-bar ${i === tiers.length - 1 ? 'min' : ''}`}
            style={{ height: `${h}%` }}
          />
        );
      })}
    </div>
  );
}

export default function ProductCard({ product, onImageClick }: Props) {
  const { name, category, variants, bandrol, harga_jual, image, tiers } = product;

  return (
    <div className="card">
      <div
        className="card-img-wrap"
        onClick={() => image && onImageClick?.(image)}
      >
        <span className="cat-badge">{category || 'LAINNYA'}</span>
        {image ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={image} alt={name} loading="lazy" />
        ) : (
          <div className="no-img">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <rect x="3" y="3" width="18" height="18" rx="2" />
              <circle cx="8.5" cy="8.5" r="1.5" />
              <path d="M21 15l-5-5L5 21" />
            </svg>
            <span>Belum ada gambar</span>
          </div>
        )}
      </div>

      <div className="card-body">
        <div className="card-name">{name}</div>
        {variants ? (
          <div className="card-variant">
            <b>Varian: </b>
            {variants}
          </div>
        ) : (
          <div className="card-variant" />
        )}

        <div className="price-block">
          {bandrol != null && (
            <div className="price-row">
              <span className="label">Bandrol</span>
              <span className="bandrol">{fmtRupiah(bandrol)}</span>
            </div>
          )}
          <div className="price-row">
            <span className="label">Harga Jual</span>
            <span className="retail-price">{fmtRupiah(harga_jual)}</span>
          </div>
          {tiers?.map((t, i) => (
            <div key={i} className="price-row">
              <span className="label">
                <span className="moq">min {t.moq ?? '-'}</span>
              </span>
              <span className="val">{fmtRupiah(t.harga_grosir)}</span>
            </div>
          ))}
          <Ladder tiers={tiers} />
        </div>
      </div>
    </div>
  );
}
