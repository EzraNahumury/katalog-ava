'use client';

import { useEffect, useState } from 'react';
import { fetchBirthdays, type Member } from '@/lib/api';
import { ucapanUlangTahun, waLink } from '@/lib/phone';

type Props = { token: string };

const BULAN = [
  'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
  'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember',
];

export default function BirthdaysView({ token }: Props) {
  const [month, setMonth] = useState(() => new Date().getMonth() + 1);
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let aktif = true;
    fetchBirthdays(token, month)
      .then((res) => aktif && setMembers(res.members))
      .catch((e) => aktif && setError(e instanceof Error ? e.message : String(e)))
      .finally(() => aktif && setLoading(false));
    return () => {
      aktif = false;
    };
  }, [token, month]);

  const hariIni = new Date().getDate();
  const bulanIni = new Date().getMonth() + 1;

  return (
    <>
      <div className="page-head">
        <div>
          <h2>Ulang Tahun</h2>
          <p className="sub">
            {loading ? 'Memuat…' : `${members.length} pelanggan ulang tahun di bulan ${BULAN[month - 1]}`}
          </p>
        </div>
        <div className="head-actions">
          <select
            className="poin-select"
            value={month}
            onChange={(e) => setMonth(Number(e.target.value))}
            aria-label="Pilih bulan"
          >
            {BULAN.map((b, i) => (
              <option key={b} value={i + 1}>
                {b}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="poin-wrap">
        {loading ? (
          <p className="poin-empty">Memuat daftar…</p>
        ) : error ? (
          <p className="poin-empty">{error}</p>
        ) : !members.length ? (
          <p className="poin-empty">
            Tidak ada pelanggan yang ulang tahun di bulan {BULAN[month - 1]}. Tanggal lahir
            diisi di menu <b>Pelanggan</b>.
          </p>
        ) : (
          <ul className="ultah-list">
            {members.map((m) => {
              const tgl = m.tanggal_ulang_tahun ?? null;
              const isHariIni = month === bulanIni && tgl === hariIni;
              return (
                <li key={m.id} className={isHariIni ? 'ultah-item hari-ini' : 'ultah-item'}>
                  <div className="tanggal">
                    <span className="angka">{tgl ?? '-'}</span>
                    <span className="bulan">{BULAN[month - 1].slice(0, 3)}</span>
                  </div>
                  <div className="info">
                    <div className="nama">
                      {m.name} {isHariIni && <span className="tag-hariini">hari ini</span>}
                    </div>
                    <div className="mono-sm">{m.phone_display}</div>
                  </div>
                  <div className="aksi">
                    <span className="poin-badge">{m.saldo_poin} poin</span>
                    <a
                      className="btn-wa"
                      href={waLink(m.phone, ucapanUlangTahun(m.name))}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      Kirim ucapan
                    </a>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </>
  );
}
