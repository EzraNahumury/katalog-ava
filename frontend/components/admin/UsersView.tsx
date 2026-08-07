'use client';

import { useEffect, useState, useCallback } from 'react';
import {
  fetchUsers,
  createUser,
  deleteUser,
  type AdminUser,
} from '@/lib/api';
import { useConfirm, useToast } from '../ui/UIProvider';

type Props = { token: string; onUnauthorized: () => void };

export default function UsersView({ token, onUnauthorized }: Props) {
  const confirm = useConfirm();
  const toast = useToast();
  const [items, setItems] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setItems(await fetchUsers(token));
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      setError(msg);
      if (msg.includes('401')) onUnauthorized();
    } finally {
      setLoading(false);
    }
  }, [token, onUnauthorized]);

  useEffect(() => {
    load();
  }, [load]);

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    const u = username.trim();
    if (!u || password.length < 6) {
      setError('Username wajib & password minimal 6 karakter.');
      return;
    }
    setSaving(true);
    setError(null);
    try {
      await createUser(token, u, password);
      setUsername('');
      setPassword('');
      toast.success('Akun ditambahkan', `${u} sekarang bisa login sebagai admin.`);
      await load();
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      setError(msg);
      toast.error('Gagal tambah akun', msg);
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(u: AdminUser) {
    const ok = await confirm({
      title: 'Hapus akun admin?',
      message: (
        <>
          Akun <b>&quot;{u.username}&quot;</b> tidak akan bisa login lagi setelah ini.
        </>
      ),
      confirmText: 'Ya, Hapus',
    });
    if (!ok) return;
    try {
      await deleteUser(token, u.id);
      toast.success('Akun dihapus', `${u.username} berhasil dihapus.`);
      await load();
    } catch (e) {
      toast.error('Gagal hapus akun', e instanceof Error ? e.message : String(e));
    }
  }

  return (
    <>
      <div className="page-head">
        <div>
          <h2>Akun Admin</h2>
          <p className="sub">Kelola akun yang bisa login ke admin panel</p>
        </div>
      </div>

      <div className="list-wrap">
        {error && <div className="form-error" style={{ marginBottom: 12 }}>{error}</div>}

        <div className="list-card">
          <form className="inline-form" onSubmit={handleAdd}>
            <input
              type="text"
              placeholder="Username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
            />
            <input
              type="password"
              placeholder="Password (min 6 karakter)"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={6}
            />
            <button className="btn-primary" type="submit" disabled={saving}>
              {saving ? 'Menyimpan…' : '+ Tambah Akun'}
            </button>
          </form>

          {loading ? (
            <div className="list-empty">Memuat…</div>
          ) : items.length === 0 ? (
            <div className="list-empty">Belum ada akun.</div>
          ) : (
            items.map((u) => (
              <div className="list-row" key={u.id}>
                <div className="info">
                  <div className="primary">{u.username}</div>
                  <div className="secondary">
                    Dibuat {new Date(u.created_at).toLocaleString('id-ID')}
                  </div>
                </div>
                <span className="badge">{u.role}</span>
                <div className="actions">
                  <button
                    className="icon-btn danger"
                    onClick={() => handleDelete(u)}
                    title="Hapus"
                  >
                    ✕
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </>
  );
}
