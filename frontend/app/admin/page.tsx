'use client';

import { useCallback, useEffect, useState } from 'react';
import LoginForm from '@/components/admin/LoginForm';
import AdminDashboard from '@/components/admin/AdminDashboard';
import SessionExpiredModal from '@/components/admin/SessionExpiredModal';
import { UIProvider } from '@/components/ui/UIProvider';
import { getToken, setToken, clearToken, isTokenExpired, tokenExpiresAt } from '@/lib/auth';
import { setUnauthorizedHandler, setTokenRefreshHandler } from '@/lib/api';

// setTimeout melimpah di atas nilai ini; sisanya ditangani pengecekan saat fokus.
const MAX_TIMEOUT = 2_147_483_647;

export default function AdminPage() {
  const [token, setTokenState] = useState<string | null>(null);
  const [ready, setReady] = useState(false);
  const [expired, setExpired] = useState(false);

  useEffect(() => {
    // getToken() sudah membuang token yang kedaluwarsa, jadi dashboard tidak
    // pernah terbuka dengan sesi mati.
    setTokenState(getToken());
    setReady(true);
  }, []);

  const logout = useCallback(() => {
    clearToken();
    setTokenState(null);
    setExpired(false);
  }, []);

  // Satu pintu untuk semua 401 dari endpoint admin (lihat adminFetch di lib/api).
  useEffect(() => {
    setUnauthorizedHandler(() => setExpired(true));
    setTokenRefreshHandler((fresh) => setTokenState((prev) => (prev === fresh ? prev : fresh)));
    return () => {
      setUnauthorizedHandler(null);
      setTokenRefreshHandler(null);
    };
  }, []);

  // Jatuhkan sesi tepat saat token habis, dan cek ulang setiap tab kembali
  // aktif — timer tidak jalan selama laptop tidur.
  useEffect(() => {
    if (!token) return;

    // Token bisa sudah diperpanjang diam-diam (header X-Refresh-Token) atau
    // diganti dari tab lain, jadi selalu bandingkan dengan isi localStorage
    // sebelum memutuskan sesi berakhir.
    const settle = () => {
      const current = getToken();
      if (!current) {
        setExpired(true);
        return;
      }
      if (current !== token) {
        setTokenState(current); // efek ini dijalankan ulang dengan exp yang baru
        return;
      }
      if (isTokenExpired(current)) setExpired(true);
    };

    window.addEventListener('focus', settle);
    window.addEventListener('storage', settle);
    document.addEventListener('visibilitychange', settle);

    let timer: number | undefined;
    const at = tokenExpiresAt(token);
    if (at !== null) {
      const delay = at - Date.now();
      if (delay <= MAX_TIMEOUT) {
        timer = window.setTimeout(settle, Math.max(0, delay));
      }
    }

    return () => {
      window.removeEventListener('focus', settle);
      window.removeEventListener('storage', settle);
      document.removeEventListener('visibilitychange', settle);
      if (timer !== undefined) window.clearTimeout(timer);
    };
  }, [token]);

  if (!ready) return null;

  return (
    <UIProvider>
      {!token ? (
        <LoginForm onLoggedIn={() => setTokenState(getToken())} />
      ) : (
        <>
          <AdminDashboard token={token} onLogout={logout} />
          {expired && (
            <SessionExpiredModal
              onRelogin={(fresh) => {
                setToken(fresh);
                setTokenState(fresh);
                setExpired(false);
              }}
              onLogout={logout}
            />
          )}
        </>
      )}
    </UIProvider>
  );
}
