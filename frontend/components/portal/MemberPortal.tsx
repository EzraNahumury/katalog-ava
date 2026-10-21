'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import {
  clearPortalToken,
  getPortalToken,
  portalCheck,
  portalMe,
  type PortalMember,
  type PortalTx,
} from '@/lib/api';
import { fmtRp, fmtTanggal, NILAI_POIN, RUPIAH_PER_POIN } from '@/lib/points';
import { normalizePhone } from '@/lib/phone';

export default function MemberPortal() {
  const [phone, setPhone] = useState('');
  const [loading, setLoading] = useState(false);
  const [booting, setBooting] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [member, setMember] = useState<PortalMember | null>(null);
  const [transactions, setTransactions] = useState<PortalTx[]>([]);

  // Kalau tab ini sudah pernah cek poin, langsung tampilkan lagi tanpa
  // mengetik nomor (token hanya hidup selama tab terbuka).
  useEffect(() => {
    let aktif = true;
    Promise.resolve(getPortalToken())
      .then((token) => (token ? portalMe(token) : null))
      .then((data) => {
        if (!aktif || !data) return;
        setMember(data.member);
        setTransactions(data.transactions);
      })
      .catch(() => clearPortalToken())
      .finally(() => aktif && setBooting(false));
    return () => {
      aktif = false;
    };
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    const normal = normalizePhone(phone);
    if (!normal) {
      setError('Nomor WhatsApp belum benar. Contoh: 081234567890');
      return;
    }

    setLoading(true);
    try {
      const hasil = await portalCheck(normal);
      setMember(hasil.member);
      const detail = await portalMe(hasil.token);
      setTransactions(detail.transactions);
      setPhone('');
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  }

  function keluar() {
    clearPortalToken();
    setMember(null);
    setTransactions([]);
    setError(null);
  }

  return (
    <div className="poin-page">
      <header className="poin-header">
        <Link href="/" className="poin-brand" aria-label="Ava Sportivo">
          <span className="poin-logo">
            <Image src="/logo.png" alt="Ava Sportivo" width={520} height={337} priority />
          </span>
          <span className="poin-brand-text">
            <b>AVA SPORTIVO</b>
            <span>Poin Member</span>
          </span>
        </Link>
        {member && (
          <button className="poin-keluar" onClick={keluar}>
            Keluar
          </button>
        )}
      </header>

      <main className="poin-main">
        {booting ? (
          <p className="poin-loading">Memuat…</p>
        ) : !member ? (
          <section className="poin-login">
            <h1>Cek poin kamu</h1>
            <p className="poin-sub">
              Masukkan nomor WhatsApp yang terdaftar di kasir Ava Sportivo.
            </p>

            <form onSubmit={handleSubmit}>
              <label htmlFor="poin-wa">Nomor WhatsApp</label>
              <input
                id="poin-wa"
                type="tel"
                inputMode="numeric"
                autoComplete="tel"
                placeholder="08xxxxxxxxxx"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                disabled={loading}
              />
              {error && <div className="poin-error">{error}</div>}
              <button type="submit" disabled={loading || !phone.trim()}>
                {loading ? 'Mengecek…' : 'Lihat Poin Saya'}
              </button>
            </form>

            <ul className="poin-aturan">
              <li>
                Belanja <b>{fmtRp(RUPIAH_PER_POIN)}</b> dapat <b>1 poin</b>
              </li>
              <li>
                1 poin = potongan <b>{fmtRp(NILAI_POIN)}</b>
              </li>
              <li>Poin bisa ditukar saat belanja di kasir</li>
            </ul>
          </section>
        ) : (
          <>
            <section className="poin-saldo">
              <span className="halo">Halo,</span>
              <h1>{member.name}</h1>
              <div className="angka">
                <b>{member.saldo_poin}</b>
                <span>poin</span>
              </div>
              <p className="setara">
                Setara potongan <b>{fmtRp(member.saldo_poin * NILAI_POIN)}</b> di kasir
              </p>
            </section>

            <section className="poin-riwayat">
              <h2>Riwayat belanja</h2>
              {!transactions.length ? (
                <p className="poin-kosong">Belum ada transaksi tercatat.</p>
              ) : (
                <ul>
                  {transactions.map((t, i) => (
                    <li key={i}>
                      <div className="baris-atas">
                        <span className="tanggal">{fmtTanggal(t.created_at)}</span>
                        <b className="bayar">{fmtRp(t.total_bayar)}</b>
                      </div>
                      <div className="baris-bawah">
                        {t.poin_dipakai > 0 && (
                          <span className="tukar">
                            Tukar {t.poin_dipakai} poin (− {fmtRp(t.potongan)})
                          </span>
                        )}
                        <span className="dapat">+{t.poin_didapat} poin</span>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </section>

            <p className="poin-catatan">
              Ada yang tidak cocok? Tunjukkan halaman ini ke kasir Ava Sportivo.
            </p>
          </>
        )}
      </main>

      <footer className="poin-footer">AVA SPORTIVO · JOGJAKARTA</footer>
    </div>
  );
}
