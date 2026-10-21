'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { deleteMember, fetchMembers, type Member } from '@/lib/api';
import { fmtRp, fmtTanggal } from '@/lib/points';
import { downloadCsv, namaFile, toCsv } from '@/lib/csv';
import { useConfirm, useToast } from '../../ui/UIProvider';
import MemberForm from './MemberForm';

type Props = { token: string };

export default function MembersView({ token }: Props) {
  const confirm = useConfirm();
  const toast = useToast();
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [editing, setEditing] = useState<Member | null | undefined>(undefined);
  // undefined = form tertutup, null = tambah baru, Member = ubah

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setMembers(await fetchMembers(token));
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }, [token]);

  // Muat pertama kali tanpa memanggil setState langsung di badan efek:
  // semua perubahan state terjadi di callback promise.
  useEffect(() => {
    let aktif = true;
    fetchMembers(token)
      .then((rows) => aktif && setMembers(rows))
      .catch((e) => aktif && setError(e instanceof Error ? e.message : String(e)))
      .finally(() => aktif && setLoading(false));
    return () => {
      aktif = false;
    };
  }, [token]);

  // Pencarian dilakukan di layar supaya langsung terasa; daftar pelanggan
  // satu toko masih jauh di bawah ukuran yang bikin berat.
  const filtered = useMemo(() => {
    const s = search.trim().toLowerCase();
    if (!s) return members;
    const digits = s.replace(/\D+/g, '');
    return members.filter((m) => {
      if (m.name.toLowerCase().includes(s)) return true;
      if (digits && m.phone.includes(digits.replace(/^0+/, ''))) return true;
      return false;
    });
  }, [members, search]);

  const totalPoin = useMemo(
    () => members.reduce((n, m) => n + m.saldo_poin, 0),
    [members]
  );

  async function handleDelete(m: Member) {
    const ok = await confirm({
      title: 'Hapus pelanggan?',
      message: (
        <>
          <b>{m.name}</b> ({m.phone_display}) akan dihapus beserta{' '}
          <b>{m.jumlah_transaksi} transaksi</b> dan {m.saldo_poin} poinnya. Tindakan ini
          tidak bisa dibatalkan.
        </>
      ),
      confirmText: 'Ya, Hapus',
    });
    if (!ok) return;
    try {
      await deleteMember(token, m.id);
      toast.success('Pelanggan dihapus', `${m.name} sudah tidak ada di daftar.`);
      await load();
    } catch (e) {
      toast.error('Gagal hapus pelanggan', e instanceof Error ? e.message : String(e));
    }
  }

  function handleExport() {
    if (!members.length) {
      toast.info('Belum ada data', 'Tambahkan pelanggan dulu sebelum export.');
      return;
    }
    const csv = toCsv(members, [
      { header: 'Nama', value: (m) => m.name },
      { header: 'No. WhatsApp', value: (m) => m.phone },
      { header: 'Tanggal Lahir', value: (m) => m.birthdate ?? '' },
      { header: 'Alamat', value: (m) => m.address ?? '' },
      { header: 'Saldo Poin', value: (m) => m.saldo_poin },
      { header: 'Jumlah Transaksi', value: (m) => m.jumlah_transaksi },
      { header: 'Total Belanja', value: (m) => m.total_belanja },
      { header: 'Transaksi Terakhir', value: (m) => m.transaksi_terakhir ?? '' },
    ]);
    downloadCsv(namaFile('pelanggan-avasport'), csv);
    toast.success('Export selesai', `${members.length} pelanggan diunduh sebagai CSV.`);
  }

  return (
    <>
      <div className="page-head">
        <div>
          <h2>Pelanggan</h2>
          <p className="sub">
            {filtered.length} dari {members.length} pelanggan · {totalPoin} poin beredar
          </p>
        </div>
        <div className="head-actions">
          <button className="btn-secondary" onClick={handleExport}>
            Export CSV
          </button>
          <button
            className="btn-primary"
            style={{ width: 'auto', padding: '10px 18px' }}
            onClick={() => setEditing(null)}
          >
            + Tambah Pelanggan
          </button>
        </div>
      </div>

      <div className="searchbar" style={{ background: 'transparent', padding: '4px 28px 12px' }}>
        <input
          type="text"
          placeholder="Cari nama atau nomor WA…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={{ background: '#fff', color: 'var(--ink)', border: '1px solid var(--line)' }}
        />
      </div>

      <div className="poin-wrap">
        {loading ? (
          <p className="poin-empty">Memuat pelanggan…</p>
        ) : error ? (
          <p className="poin-empty">{error}</p>
        ) : !members.length ? (
          <p className="poin-empty">Belum ada pelanggan. Tambahkan lewat tombol di atas.</p>
        ) : !filtered.length ? (
          <p className="poin-empty">Tidak ada pelanggan yang cocok dengan pencarian itu.</p>
        ) : (
          <div className="poin-table-wrap">
            <table className="poin-table">
              <thead>
                <tr>
                  <th>Nama</th>
                  <th>No. WhatsApp</th>
                  <th className="num">Saldo Poin</th>
                  <th className="num">Transaksi</th>
                  <th>Terakhir Belanja</th>
                  <th className="aksi">Aksi</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((m) => (
                  <tr key={m.id}>
                    <td>
                      <span className="nama">{m.name}</span>
                      {m.birthdate && (
                        <span className="sub-cell">Lahir {fmtTanggal(m.birthdate).split(',')[0]}</span>
                      )}
                    </td>
                    <td className="mono">{m.phone_display}</td>
                    <td className="num">
                      <span className="poin-badge">{m.saldo_poin} poin</span>
                    </td>
                    <td className="num">
                      {m.jumlah_transaksi}
                      <span className="sub-cell">{fmtRp(m.total_belanja)}</span>
                    </td>
                    <td className="mono-sm">{fmtTanggal(m.transaksi_terakhir)}</td>
                    <td className="aksi">
                      <button className="btn-mini" onClick={() => setEditing(m)}>
                        Ubah
                      </button>
                      <button className="btn-mini danger" onClick={() => handleDelete(m)}>
                        Hapus
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {editing !== undefined && (
        <MemberForm
          token={token}
          member={editing}
          onClose={() => setEditing(undefined)}
          onSaved={async () => {
            toast.success(editing ? 'Pelanggan diperbarui' : 'Pelanggan ditambahkan');
            setEditing(undefined);
            await load();
          }}
        />
      )}
    </>
  );
}
