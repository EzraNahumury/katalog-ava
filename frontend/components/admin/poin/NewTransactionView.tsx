'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  createTransaction,
  fetchMembers,
  type HasilTransaksi,
  type Member,
} from '@/lib/api';
import { fmtRp, hitungTransaksi, maksPoinDipakai, NILAI_POIN, RUPIAH_PER_POIN } from '@/lib/points';
import { useToast } from '../../ui/UIProvider';

type Props = { token: string };

export default function NewTransactionView({ token }: Props) {
  const toast = useToast();
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [cari, setCari] = useState('');
  const [dipilih, setDipilih] = useState<Member | null>(null);
  const [belanja, setBelanja] = useState('');
  const [poin, setPoin] = useState('');
  const [catatan, setCatatan] = useState('');
  const [saving, setSaving] = useState(false);
  const [hasil, setHasil] = useState<HasilTransaksi | null>(null);

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

  const kandidat = useMemo(() => {
    const s = cari.trim().toLowerCase();
    if (!s) return members.slice(0, 8);
    const digits = s.replace(/\D+/g, '');
    return members
      .filter((m) => {
        if (m.name.toLowerCase().includes(s)) return true;
        if (digits && m.phone.includes(digits.replace(/^0+/, ''))) return true;
        return false;
      })
      .slice(0, 8);
  }, [members, cari]);

  const nBelanja = Number(belanja.replace(/\D+/g, '')) || 0;
  const nPoin = Number(poin.replace(/\D+/g, '')) || 0;
  const saldo = dipilih?.saldo_poin ?? 0;
  const maksPoin = maksPoinDipakai(nBelanja, saldo);
  const hitung = hitungTransaksi(nBelanja, nPoin, saldo);
  const siap = !!dipilih && !hitung.error && !saving;

  function pilih(m: Member) {
    setDipilih(m);
    setCari('');
    setPoin('');
    setHasil(null);
  }

  function reset() {
    setDipilih(null);
    setBelanja('');
    setPoin('');
    setCatatan('');
  }

  async function simpan(e: React.FormEvent) {
    e.preventDefault();
    if (!dipilih || hitung.error) return;
    setSaving(true);
    try {
      const res = await createTransaction(token, {
        member_id: dipilih.id,
        total_belanja: nBelanja,
        poin_dipakai: nPoin,
        catatan: catatan.trim() || undefined,
      });
      setHasil(res);
      toast.success(
        'Transaksi tersimpan',
        `${res.member_name} dapat ${res.poin_didapat} poin. Sisa ${res.saldo_akhir} poin.`
      );
      reset();
      await load();
    } catch (err) {
      toast.error('Gagal simpan transaksi', err instanceof Error ? err.message : String(err));
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <div className="page-head">
        <div>
          <h2>Transaksi Baru</h2>
          <p className="sub">
            Belanja {fmtRp(RUPIAH_PER_POIN)} = 1 poin · 1 poin = potongan {fmtRp(NILAI_POIN)}
          </p>
        </div>
      </div>

      <div className="poin-wrap">
        {loading ? (
          <p className="poin-empty">Memuat pelanggan…</p>
        ) : error ? (
          <p className="poin-empty">{error}</p>
        ) : !members.length ? (
          <p className="poin-empty">
            Belum ada pelanggan. Tambahkan dulu di menu <b>Pelanggan</b>.
          </p>
        ) : (
          <form className="poin-form" onSubmit={simpan}>
            {/* 1. Pilih pelanggan */}
            <section className="poin-card">
              <h3 className="poin-card-title">1. Pilih pelanggan</h3>

              {dipilih ? (
                <div className="poin-selected">
                  <div>
                    <div className="nama">{dipilih.name}</div>
                    <div className="mono-sm">{dipilih.phone_display}</div>
                  </div>
                  <div className="saldo">
                    <span className="poin-badge big">{dipilih.saldo_poin} poin</span>
                    <button type="button" className="btn-mini" onClick={() => setDipilih(null)}>
                      Ganti
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  <input
                    type="text"
                    className="poin-input"
                    placeholder="Cari nama atau nomor WA…"
                    value={cari}
                    onChange={(e) => setCari(e.target.value)}
                    autoFocus
                  />
                  <ul className="poin-pick">
                    {kandidat.map((m) => (
                      <li key={m.id}>
                        <button type="button" onClick={() => pilih(m)}>
                          <span className="nama">{m.name}</span>
                          <span className="mono-sm">{m.phone_display}</span>
                          <span className="poin-badge">{m.saldo_poin} poin</span>
                        </button>
                      </li>
                    ))}
                    {!kandidat.length && <li className="kosong">Tidak ada yang cocok.</li>}
                  </ul>
                </>
              )}
            </section>

            {/* 2. Nominal */}
            <section className="poin-card">
              <h3 className="poin-card-title">2. Belanja &amp; tukar poin</h3>

              <div className="form-row-2">
                <div className="form-field">
                  <label htmlFor="t-belanja">Total belanja *</label>
                  <input
                    id="t-belanja"
                    type="text"
                    inputMode="numeric"
                    placeholder="Contoh: 150000"
                    value={belanja}
                    onChange={(e) => setBelanja(e.target.value.replace(/\D+/g, ''))}
                  />
                  <span className="field-hint">{nBelanja > 0 ? fmtRp(nBelanja) : 'Sebelum potongan poin'}</span>
                </div>

                <div className="form-field">
                  <label htmlFor="t-poin">Tukar poin</label>
                  <input
                    id="t-poin"
                    type="text"
                    inputMode="numeric"
                    placeholder="0"
                    value={poin}
                    onChange={(e) => setPoin(e.target.value.replace(/\D+/g, ''))}
                    disabled={!dipilih}
                  />
                  <span className="field-hint">
                    {dipilih
                      ? maksPoin > 0
                        ? `Maksimal ${maksPoin} poin`
                        : 'Belum ada poin yang bisa ditukar'
                      : 'Pilih pelanggan dulu'}
                    {maksPoin > 0 && (
                      <button
                        type="button"
                        className="btn-link"
                        onClick={() => setPoin(String(maksPoin))}
                      >
                        pakai semua
                      </button>
                    )}
                  </span>
                </div>
              </div>

              <div className="form-field">
                <label htmlFor="t-catatan">Catatan</label>
                <input
                  id="t-catatan"
                  type="text"
                  placeholder="Opsional — mis. nomor nota"
                  value={catatan}
                  onChange={(e) => setCatatan(e.target.value)}
                />
              </div>
            </section>

            {/* 3. Ringkasan */}
            <section className="poin-card ringkas">
              <h3 className="poin-card-title">3. Yang dibayar pelanggan</h3>

              <div className="ringkas-row">
                <span>Total belanja</span>
                <b>{fmtRp(nBelanja)}</b>
              </div>
              <div className="ringkas-row">
                <span>Potongan {nPoin > 0 ? `(${nPoin} poin)` : ''}</span>
                <b className="potongan">{hitung.potongan > 0 ? `− ${fmtRp(hitung.potongan)}` : fmtRp(0)}</b>
              </div>
              <div className="ringkas-row total">
                <span>Total bayar</span>
                <b>{fmtRp(hitung.totalBayar)}</b>
              </div>
              <div className="ringkas-row">
                <span>Poin didapat</span>
                <b className="poin">+{hitung.poinDidapat}</b>
              </div>
              <div className="ringkas-row">
                <span>Sisa poin setelah transaksi</span>
                <b>{hitung.saldoAkhir}</b>
              </div>

              {hitung.error && dipilih && <div className="form-error">{hitung.error}</div>}

              <button className="btn-primary" type="submit" disabled={!siap}>
                {saving ? 'Menyimpan…' : 'Simpan Transaksi'}
              </button>
            </section>
          </form>
        )}

        {hasil && (
          <div className="poin-card sukses">
            <h3 className="poin-card-title">Transaksi tersimpan</h3>
            <p>
              <b>{hasil.member_name}</b> bayar <b>{fmtRp(hasil.total_bayar)}</b>
              {hasil.poin_dipakai > 0 && <> (potongan {fmtRp(hasil.potongan)} dari {hasil.poin_dipakai} poin)</>}.
              Dapat <b>{hasil.poin_didapat} poin</b>, sisa <b>{hasil.saldo_akhir} poin</b>.
            </p>
            <button className="btn-secondary" onClick={() => setHasil(null)}>
              Tutup
            </button>
          </div>
        )}
      </div>
    </>
  );
}
