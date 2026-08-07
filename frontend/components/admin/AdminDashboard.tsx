'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import ProductsView from './ProductsView';
import CategoriesView from './CategoriesView';
import UsersView from './UsersView';

type View = 'products' | 'categories' | 'users';

type Props = { token: string; onLogout: () => void };

export default function AdminDashboard({ token, onLogout }: Props) {
  const [view, setView] = useState<View>('products');
  const [masterOpen, setMasterOpen] = useState(false);
  const masterRef = useRef<HTMLDivElement>(null);

  // Tutup dropdown ketika klik di luar
  useEffect(() => {
    function onDocClick(e: MouseEvent) {
      if (masterRef.current && !masterRef.current.contains(e.target as Node)) {
        setMasterOpen(false);
      }
    }
    document.addEventListener('click', onDocClick);
    return () => document.removeEventListener('click', onDocClick);
  }, []);

  const isMasterView = view === 'categories' || view === 'users';

  return (
    <>
      <header className="topbar">
        <div className="topbar-inner">
          <div className="brand">
            <span className="brand-mark">A</span>
            <div className="brand-text">
              <h1>ADMIN — KATALOG</h1>
              <p>Kelola produk & master data</p>
            </div>
          </div>
          <div className="admin-topbar-actions">
            <Link href="/" className="link-btn" target="_blank">
              Lihat Publik
            </Link>
            <button className="link-btn" onClick={onLogout}>
              Keluar
            </button>
          </div>
        </div>

        <nav className="admin-nav">
          <div className="admin-nav-item">
            <button
              className={`admin-nav-btn ${view === 'products' ? 'active' : ''}`}
              onClick={() => {
                setView('products');
                setMasterOpen(false);
              }}
            >
              Produk
            </button>
          </div>

          <div
            className="admin-nav-item"
            ref={masterRef}
            onClick={(e) => e.stopPropagation()}
          >
            <button
              className={`admin-nav-btn ${isMasterView ? 'active' : ''}`}
              onClick={() => setMasterOpen((v) => !v)}
            >
              Master <span className="caret">▼</span>
            </button>
            {masterOpen && (
              <div className="admin-submenu">
                <button
                  className={view === 'categories' ? 'active' : ''}
                  onClick={() => {
                    setView('categories');
                    setMasterOpen(false);
                  }}
                >
                  Kategori
                </button>
                <button
                  className={view === 'users' ? 'active' : ''}
                  onClick={() => {
                    setView('users');
                    setMasterOpen(false);
                  }}
                >
                  Akun Admin
                </button>
              </div>
            )}
          </div>
        </nav>
      </header>

      {view === 'products' && <ProductsView token={token} onUnauthorized={onLogout} />}
      {view === 'categories' && <CategoriesView token={token} onUnauthorized={onLogout} />}
      {view === 'users' && <UsersView token={token} onUnauthorized={onLogout} />}
    </>
  );
}
