'use client';

import { useState } from 'react';
import { createMember, updateMember, type Member, type MemberInput } from '@/lib/api';
import { normalizePhone } from '@/lib/phone';

type Props = {
  token: string;
  member: Member | null; // null = tambah baru
  onSaved: () => void;
  onClose: () => void;
};

type FormState = {
  name: string;
  phone: string;
  birthdate: string;
  address: string;
};

function initFrom(m: Member | null): FormState {
  return {
    name: m?.name ?? '',
    phone: m ? m.phone : '',
    birthdate: m?.birthdate ? m.birthdate.slice(0, 10) : '',
    address: m?.address ?? '',
  };
}

export default function MemberForm({ token, member, onSaved, onClose }: Props) {
  const [form, setForm] = useState<FormState>(() => initFrom(member));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const phoneOk = normalizePhone(form.phone);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!form.name.trim()) {
      setError('Nama pelanggan wajib diisi.');
      return;
    }
    if (!phoneOk) {
      setError('Nomor WhatsApp tidak valid. Contoh: 081234567890.');
      return;
    }

    const input: MemberInput = {
      name: form.name.trim(),
      phone: phoneOk,
      birthdate: form.birthdate || null,
      address: form.address.trim() || null,
    };

    setSaving(true);
    try {
      if (member) await updateMember(token, member.id, input);
      else await createMember(token, input);
      onSaved();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
      setSaving(false);
    }
  }

  return (
    <div className="modal-backdrop" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <form className="modal" onSubmit={handleSubmit}>
        <div className="modal-header">
          <h3>{member ? 'Ubah Pelanggan' : 'Tambah Pelanggan'}</h3>
          <button type="button" className="modal-close" onClick={onClose} aria-label="Tutup">
            ✕
          </button>
        </div>

        {error && <div className="form-error">{error}</div>}

        <div className="form-field">
          <label htmlFor="m-nama">Nama *</label>
          <input
            id="m-nama"
            type="text"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            autoFocus
            required
          />
        </div>

        <div className="form-row-2">
          <div className="form-field">
            <label htmlFor="m-wa">No. WhatsApp *</label>
            <input
              id="m-wa"
              type="tel"
              inputMode="numeric"
              placeholder="081234567890"
              value={form.phone}
              onChange={(e) => setForm({ ...form, phone: e.target.value })}
              required
            />
            <span className="field-hint">
              {form.phone
                ? phoneOk
                  ? `Tersimpan sebagai ${phoneOk}`
                  : 'Nomor belum valid'
                : 'Boleh ditulis 08…, +62…, atau 62…'}
            </span>
          </div>

          <div className="form-field">
            <label htmlFor="m-lahir">Tanggal lahir</label>
            <input
              id="m-lahir"
              type="date"
              value={form.birthdate}
              max={new Date().toISOString().slice(0, 10)}
              onChange={(e) => setForm({ ...form, birthdate: e.target.value })}
            />
            <span className="field-hint">Dipakai untuk daftar ulang tahun.</span>
          </div>
        </div>

        <div className="form-field">
          <label htmlFor="m-alamat">Alamat</label>
          <textarea
            id="m-alamat"
            value={form.address}
            onChange={(e) => setForm({ ...form, address: e.target.value })}
            placeholder="Opsional"
          />
        </div>

        <div className="modal-footer">
          <button type="button" className="btn-secondary" onClick={onClose} disabled={saving}>
            Batal
          </button>
          <button className="btn-primary" type="submit" disabled={saving}>
            {saving ? 'Menyimpan…' : member ? 'Simpan Perubahan' : 'Simpan'}
          </button>
        </div>
      </form>
    </div>
  );
}
