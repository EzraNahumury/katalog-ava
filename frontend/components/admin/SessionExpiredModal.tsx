'use client';

import { useEffect, useRef, useState } from 'react';
import { login } from '@/lib/api';
import { getLastUsername } from '@/lib/auth';

type Props = {
  /** Dipanggil dengan token baru setelah login ulang berhasil. */
  onRelogin: (token: string) => void;
  /** Keluar sepenuhnya — dashboard ditutup, kembali ke halaman login. */
  onLogout: () => void;
};

/**
 * Muncul ketika backend menolak request admin dengan 401 (token habis atau
 * tidak valid). Dashboard sengaja dibiarkan tetap hidup di belakangnya supaya
 * form yang sedang diisi tidak hilang — admin cukup masuk lagi lalu menyimpan.
 */
export default function SessionExpiredModal({ onRelogin, onLogout }: Props) {
  const [username, setUsername] = useState(() => getLastUsername());
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const passwordRef = useRef<HTMLInputElement>(null);
  const usernameRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    // Kalau username sudah terisi dari login sebelumnya, langsung ke password.
    const el = username ? passwordRef.current : usernameRef.current;
    el?.focus();
  }, [username]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const u = username.trim();
    if (!u || !password) {
      setError('Username & password wajib diisi.');
      return;
    }
    setError(null);
    setLoading(true);
    try {
      const { token } = await login(u, password);
      setPassword('');
      onRelogin(token);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
      setLoading(false);
    }
  }

  return (
    <div className="modal-backdrop session-backdrop">
      <form className="modal session-modal" onSubmit={handleSubmit}>
        <div className="modal-header">
          <h3>Sesi login berakhir</h3>
        </div>

        <p className="session-note">
          Token login sudah kedaluwarsa, jadi perubahan terakhir belum tersimpan.
          Masuk lagi untuk melanjutkan — isian yang sedang terbuka tetap ada.
        </p>

        {error && <div className="form-error">{error}</div>}

        <div className="form-field">
          <label htmlFor="session-user">Username</label>
          <input
            id="session-user"
            ref={usernameRef}
            type="text"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            autoComplete="username"
          />
        </div>

        <div className="form-field">
          <label htmlFor="session-pass">Password</label>
          <input
            id="session-pass"
            ref={passwordRef}
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="current-password"
          />
        </div>

        <div className="modal-footer">
          <button type="button" className="btn-secondary" onClick={onLogout}>
            Keluar
          </button>
          <button className="btn-primary" type="submit" disabled={loading}>
            {loading ? 'Memproses…' : 'Masuk lagi'}
          </button>
        </div>
      </form>
    </div>
  );
}
