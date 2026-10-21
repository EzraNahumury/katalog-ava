'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import ProductsView from './ProductsView';
import CategoriesView from './CategoriesView';
import UsersView from './UsersView';
import MembersView from './poin/MembersView';
import NewTransactionView from './poin/NewTransactionView';
import BirthdaysView from './poin/BirthdaysView';
import HistoryView from './poin/HistoryView';

type View =
  | 'products'
  | 'categories'
  | 'users'
  | 'members'
  | 'new-tx'
  | 'birthdays'
  | 'tx-history';

const VIEW_POIN: View[] = ['members', 'new-tx', 'birthdays', 'tx-history'];

type Props = { token: string; onLogout: () => void };

export default function AdminDashboard({ token, onLogout }: Props) {
  const [view, setView] = useState<View>('products');
  const [masterOpen, setMasterOpen] = useState(false);
  const [poinOpen, setPoinOpen] = useState(false);
  const masterRef = useRef<HTMLDivElement>(null);
  const poinRef = useRef<HTMLDivElement>(null);

  // Tutup dropdown ketika klik di luar
  useEffect(() => {
    function onDocClick(e: MouseEvent) {
      if (masterRef.current && !masterRef.current.contains(e.target as Node)) {
        setMasterOpen(false);
      }
      if (poinRef.current && !poinRef.current.contains(e.target as Node)) {
        setPoinOpen(false);
      }
    }
    document.addEventListener('click', onDocClick);
    return () => document.removeEventListener('click', onDocClick);
  }, []);

  const isMasterView = view === 'categories' || view === 'users';
  const isPoinView = VIEW_POIN.includes(view);

  const pilihView = (v: View) => {
    setView(v);
    setMasterOpen(false);
    setPoinOpen(false);
  };

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
              onClick={() => pilihView('products')}
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
                  onClick={() => pilihView('categories')}
                >
                  Kategori
                </button>
                <button
                  className={view === 'users' ? 'active' : ''}
                  onClick={() => pilihView('users')}
                >
                  Akun Admin
                </button>
              </div>
            )}
          </div>

          <div
            className="admin-nav-item"
            ref={poinRef}
            onClick={(e) => e.stopPropagation()}
          >
            <button
              className={`admin-nav-btn ${isPoinView ? 'active' : ''}`}
              onClick={() => setPoinOpen((v) => !v)}
            >
              Poin Member <span className="caret">▼</span>
            </button>
            {poinOpen && (
              <div className="admin-submenu">
                <button
                  className={view === 'members' ? 'active' : ''}
                  onClick={() => pilihView('members')}
                >
                  Pelanggan
                </button>
                <button
                  className={view === 'new-tx' ? 'active' : ''}
                  onClick={() => pilihView('new-tx')}
                >
                  Transaksi Baru
                </button>
                <button
                  className={view === 'birthdays' ? 'active' : ''}
                  onClick={() => pilihView('birthdays')}
                >
                  Ulang Tahun
                </button>
                <button
                  className={view === 'tx-history' ? 'active' : ''}
                  onClick={() => pilihView('tx-history')}
                >
                  Riwayat
                </button>
              </div>
            )}
          </div>
        </nav>
      </header>

      {view === 'products' && <ProductsView token={token} />}
      {view === 'categories' && <CategoriesView token={token} />}
      {view === 'users' && <UsersView token={token} />}
      {view === 'members' && <MembersView token={token} />}
      {view === 'new-tx' && <NewTransactionView token={token} />}
      {view === 'birthdays' && <BirthdaysView token={token} />}
      {view === 'tx-history' && <HistoryView token={token} />}
    </>
  );
}
