'use client';

import type { Product, PriceTier } from '@/lib/types';
import { fmtRupiah } from '@/lib/api';

type Props = {
  product: Product;
  index?: number;
  onImageClick?: (src: string) => void;
};

function Ladder({ tiers }: { tiers: PriceTier[] }) {
  if (!tiers?.length) return null;
  const vals = tiers.map((t) => Number(t.harga_grosir ?? 0));
  const max = Math.max(...vals, 1);
  return (
    <div className="pub-ladder">
      {tiers.map((t, i) => {
        const v = Number(t.harga_grosir ?? 0);
        const h = Math.max(18, (v / max) * 100);
        return (
          <div
            key={i}
            className={`pub-ladder-bar ${i === tiers.length - 1 ? 'min' : ''}`}
            style={{
              height: `${h}%`,
              ['--bi' as string]: i,
            } as React.CSSProperties}
          />
        );
      })}
    </div>
  );
}

export default function PublicProductCard({ product, index = 0, onImageClick }: Props) {
  const { name, category, variants, bandrol, harga_jual, image, tiers } = product;
  const hasBandrol = bandrol != null && bandrol > (harga_jual ?? 0);

  return (
    <div
      className="pub-card"
      style={{ ['--i' as string]: index } as React.CSSProperties}
    >
      <div
        className="pub-card-img"
        onClick={() => image && onImageClick?.(image)}
      >
        {category && <span className="pub-card-cat">{category}</span>}
        {image ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={image} alt={name} loading="lazy" />
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

      <div className="pub-card-body">
        <h3 className="pub-card-name">{name}</h3>
        {variants && (
          <p className="pub-card-variant">
            <b>Varian: </b>
            <span className="list">{variants}</span>
          </p>
        )}

        <div className="pub-price-block">
          {hasBandrol && (
            <div className="pub-price-row">
              <span className="label">Bandrol</span>
              <span className="bandrol">{fmtRupiah(bandrol)}</span>
            </div>
          )}
          <div className="pub-price-row retail">
            <span className="label">Harga Jual</span>
            <span className="val">{fmtRupiah(harga_jual)}</span>
          </div>
          {tiers?.map((t, i) => (
            <div key={i} className="pub-price-row">
              <span className="label">
                <span className="moq">min {t.moq ?? '-'}</span>
              </span>
              <span className="val">{fmtRupiah(t.harga_grosir)}</span>
            </div>
          ))}
          {tiers && tiers.length > 0 && <Ladder tiers={tiers} />}
        </div>
      </div>
    </div>
  );
}
