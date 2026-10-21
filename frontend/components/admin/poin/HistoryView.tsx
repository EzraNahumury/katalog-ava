'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { deleteTransaction, fetchTransactions, type PointTx } from '@/lib/api';
import { fmtRp, fmtTanggal } from '@/lib/points';
import { downloadCsv, namaFile, toCsv } from '@/lib/csv';
import { useConfirm, useToast } from '../../ui/UIProvider';

type Props = { token: string };

export default function HistoryView({ token }: Props) {
  const confirm = useConfirm();
  const toast = useToast();
  const [items, setItems] = useState<PointTx[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setItems(await fetchTransactions(token, { limit: 1000 }));
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    let aktif = true;
    fetchTransactions(token, { limit: 1000 })
      .then((rows) => aktif && setItems(rows))
      .catch((e) => aktif && setError(e instanceof Error ? e.message : String(e)))
      .finally(() => aktif && setLoading(false));
    return () => {
      aktif = false;
    };
  }, [token]);

  const filtered = useMemo(() => {
    const s = search.trim().toLowerCase();
    if (!s) return items;
    const digits = s.replace(/\D+/g, '');
    return items.filter((t) => {
      if ((t.member_name ?? '').toLowerCase().includes(s)) return true;
      if (digits && (t.member_phone ?? '').includes(digits.replace(/^0+/, ''))) return true;
      if ((t.catatan ?? '').toLowerCase().includes(s)) return true;
      return false;
    });
  }, [items, search]);

  const ringkasan = useMemo(() => {
    return filtered.reduce(
      (acc, t) => ({
        bayar: acc.bayar + t.total_bayar,
        masuk: acc.masuk + t.poin_didapat,
        keluar: acc.keluar + t.poin_dipakai,
      }),
      { bayar: 0, masuk: 0, keluar: 0 }
    );
  }, [filtered]);

  async function handleDelete(t: PointTx) {
    const ok = await confirm({
      title: 'Hapus transaksi?',
      message: (
        <>
          Transaksi <b>{fmtRp(t.total_bayar)}</b> milik <b>{t.member_name}</b> akan dihapus.
          Saldo poin pelanggan otomatis dikoreksi:{' '}
          {t.poin_didapat > 0 && <>−{t.poin_didapat} poin yang didapat</>}
          {t.poin_didapat > 0 && t.poin_dipakai > 0 && ', '}
          {t.poin_dipakai > 0 && <>+{t.poin_dipakai} poin yang dulu ditukar</>}.
        </>
      ),
      confirmText: 'Ya, Hapus',
    });
    if (!ok) return;
    try {
      const res = await deleteTransaction(token, t.id);
      toast.success('Transaksi dihapus', `Saldo ${t.member_name} sekarang ${res.saldo_akhir} poin.`);
      await load();
    } catch (e) {
      toast.error('Gagal hapus transaksi', e instanceof Error ? e.message : String(e));
    }
  }

  function handleExport() {
    if (!filtered.length) {
      toast.info('Belum ada data', 'Tidak ada transaksi untuk diexport.');
      return;
    }
    const csv = toCsv(filtered, [
      { header: 'Tanggal', value: (t) => t.created_at },
      { header: 'Nama', value: (t) => t.member_name ?? '' },
      { header: 'No. WhatsApp', value: (t) => t.member_phone ?? '' },
      { header: 'Total Belanja', value: (t) => t.total_belanja },
      { header: 'Poin Dipakai', value: (t) => t.poin_dipakai },
      { header: 'Potongan', value: (t) => t.potongan },
      { header: 'Total Bayar', value: (t) => t.total_bayar },
      { header: 'Poin Didapat', value: (t) => t.poin_didapat },
      { header: 'Catatan', value: (t) => t.catatan ?? '' },
      { header: 'Kasir', value: (t) => t.created_by ?? '' },
    ]);
    downloadCsv(namaFile('transaksi-avasport'), csv);
    toast.success('Export selesai', `${filtered.length} transaksi diunduh sebagai CSV.`);
  }

  return (
    <>
      <div className="page-head">
        <div>
          <h2>Riwayat</h2>
          <p className="sub">
            {filtered.length} transaksi · {fmtRp(ringkasan.bayar)} · +{ringkasan.masuk} poin masuk ·
            −{ringkasan.keluar} poin ditukar
          </p>
        </div>
        <div className="head-actions">
          <button className="btn-secondary" onClick={handleExport}>
            Export CSV
          </button>
        </div>
      </div>

      <div className="searchbar" style={{ background: 'transparent', padding: '4px 28px 12px' }}>
        <input
          type="text"
          placeholder="Cari nama, nomor WA, atau catatan…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={{ background: '#fff', color: 'var(--ink)', border: '1px solid var(--line)' }}
        />
      </div>

      <div className="poin-wrap">
        {loading ? (
          <p className="poin-empty">Memuat riwayat…</p>
        ) : error ? (
          <p className="poin-empty">{error}</p>
        ) : !items.length ? (
          <p className="poin-empty">Belum ada transaksi tercatat.</p>
        ) : !filtered.length ? (
          <p className="poin-empty">Tidak ada transaksi yang cocok.</p>
        ) : (
          <div className="poin-table-wrap">
            <table className="poin-table">
              <thead>
                <tr>
                  <th>Tanggal</th>
                  <th>Pelanggan</th>
                  <th className="num">Belanja</th>
                  <th className="num">Bayar</th>
                  <th className="num">Poin</th>
                  <th className="aksi">Aksi</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((t) => (
                  <tr key={t.id}>
                    <td className="mono-sm">
                      {fmtTanggal(t.created_at)}
                      {t.created_by && <span className="sub-cell">oleh {t.created_by}</span>}
                    </td>
                    <td>
                      <span className="nama">{t.member_name}</span>
                      <span className="sub-cell mono">{t.member_phone_display}</span>
                      {t.catatan && <span className="sub-cell">{t.catatan}</span>}
                    </td>
                    <td className="num">
                      {fmtRp(t.total_belanja)}
                      {t.potongan > 0 && (
                        <span className="sub-cell potongan">− {fmtRp(t.potongan)}</span>
                      )}
                    </td>
                    <td className="num">
                      <b>{fmtRp(t.total_bayar)}</b>
                    </td>
                    <td className="num">
                      {t.poin_didapat > 0 && <span className="poin-plus">+{t.poin_didapat}</span>}
                      {t.poin_dipakai > 0 && <span className="poin-minus">−{t.poin_dipakai}</span>}
                      {t.poin_didapat === 0 && t.poin_dipakai === 0 && <span>0</span>}
                    </td>
                    <td className="aksi">
                      <button className="btn-mini danger" onClick={() => handleDelete(t)}>
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
    </>
  );
}
