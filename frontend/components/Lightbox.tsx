'use client';

type Props = { src: string; onClose: () => void };

export default function Lightbox({ src, onClose }: Props) {
  return (
    <div
      className="lightbox"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <button className="lightbox-close" onClick={onClose} aria-label="Tutup">
        ✕
      </button>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={src} alt="Preview" />
    </div>
  );
}
