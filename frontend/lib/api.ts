import type { Product, PriceTier } from './types';
import { setToken } from './auth';

export const API_BASE = process.env.NEXT_PUBLIC_API_URL || '';

/**
 * Semua request admin lewat adminFetch, jadi satu tempat ini cukup untuk
 * menangani sesi yang habis. Halaman admin mendaftarkan handler-nya saat mount.
 */
let unauthorizedHandler: (() => void) | null = null;
let tokenRefreshHandler: ((token: string) => void) | null = null;

export function setUnauthorizedHandler(fn: (() => void) | null): void {
  unauthorizedHandler = fn;
}

/**
 * Dipanggil ketika backend memperpanjang sesi lewat X-Refresh-Token, supaya
 * state React ikut memakai token baru (kalau tidak, timer kedaluwarsa di
 * halaman admin masih memakai umur token lama).
 */
export function setTokenRefreshHandler(fn: ((token: string) => void) | null): void {
  tokenRefreshHandler = fn;
}

/**
 * Backend membalas 401 dengan body {"error": "...", "code": "token_expired"},
 * bukan teks yang memuat "401" — jadi jangan pernah mendeteksi lewat isi pesan
 * saja. Status HTTP yang ditempelkan jsonOrThrow adalah sumber utamanya.
 */
export function isAuthError(e: unknown): boolean {
  if ((e as { status?: number } | null)?.status === 401) return true;
  const code = (e as { code?: string } | null)?.code;
  if (code === 'token_expired' || code === 'invalid_token' || code === 'missing_token') {
    return true;
  }
  const msg = e instanceof Error ? e.message.toLowerCase() : '';
  return msg.includes('unauthorized') || msg.includes('token expired') || msg.includes('bearer');
}

export type Category = { id: number; name: string; product_count: number };

export type ProductInput = {
  name: string;
  category: string | null;
  variants: string | null;
  bandrol: number | null;
  harga_jual: number | null;
  tiers: PriceTier[];
};

/**
 * Ambil daftar produk untuk halaman publik.
 * Data selalu dari backend PHP — tidak ada seed. Kalau backend belum ada
 * data, halaman publik akan tampil kosong sampai admin menambahkan produk.
 */
export async function fetchProducts(): Promise<Product[]> {
  if (!API_BASE) {
    throw new Error(
      'NEXT_PUBLIC_API_URL belum di-set. Isi di .env.local (contoh: http://localhost:8080).'
    );
  }
  const res = await fetch(`${API_BASE}/products`, { cache: 'no-store' });
  if (!res.ok) throw new Error(`API ${res.status}: ${res.statusText}`);
  return (await res.json()) as Product[];
}

export async function fetchCategories(): Promise<Category[]> {
  if (!API_BASE) return [];
  const res = await fetch(`${API_BASE}/categories`, { cache: 'no-store' });
  if (!res.ok) throw new Error(`API ${res.status}`);
  return (await res.json()) as Category[];
}

// ------------ Auth ------------

export async function login(username: string, password: string): Promise<{ token: string }> {
  if (!API_BASE) throw new Error('NEXT_PUBLIC_API_URL belum di-set — tidak bisa login.');
  const res = await fetch(`${API_BASE}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data?.error || `Login gagal (${res.status})`);
  return { token: data.token };
}

// ------------ Admin CRUD ------------

async function adminFetch(token: string, path: string, init: RequestInit = {}): Promise<Response> {
  if (!API_BASE) throw new Error('NEXT_PUBLIC_API_URL belum di-set.');
  const headers = new Headers(init.headers);
  headers.set('Authorization', `Bearer ${token}`);
  if (init.body && !(init.body instanceof FormData) && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }
  const res = await fetch(`${API_BASE}${path}`, { ...init, headers, cache: 'no-store' });

  // Sliding session: backend mengirim token baru sebelum yang lama kedaluwarsa.
  const refreshed = res.headers.get('X-Refresh-Token');
  if (refreshed) {
    setToken(refreshed);
    tokenRefreshHandler?.(refreshed);
  }

  if (res.status === 401) unauthorizedHandler?.();

  return res;
}

async function jsonOrThrow(res: Response): Promise<unknown> {
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const err = new Error(
      (data as { error?: string })?.error || `${res.status} ${res.statusText}`
    ) as Error & { status?: number; code?: string };
    err.status = res.status;
    err.code = (data as { code?: string })?.code;
    throw err;
  }
  return data;
}

export async function createProduct(token: string, input: ProductInput): Promise<Product> {
  const res = await adminFetch(token, '/products', {
    method: 'POST',
    body: JSON.stringify(input),
  });
  return (await jsonOrThrow(res)) as Product;
}

export async function updateProduct(
  token: string,
  id: number,
  input: ProductInput
): Promise<Product> {
  const res = await adminFetch(token, `/products/${id}`, {
    method: 'PUT',
    body: JSON.stringify(input),
  });
  return (await jsonOrThrow(res)) as Product;
}

export async function deleteProduct(token: string, id: number): Promise<void> {
  const res = await adminFetch(token, `/products/${id}`, { method: 'DELETE' });
  await jsonOrThrow(res);
}

export async function uploadImage(
  token: string,
  id: number,
  file: File
): Promise<{ image: string }> {
  const fd = new FormData();
  fd.append('image', file);
  const res = await adminFetch(token, `/products/${id}/image`, {
    method: 'POST',
    body: fd,
  });
  return (await jsonOrThrow(res)) as { image: string };
}

export async function createCategory(token: string, name: string): Promise<Category> {
  const res = await adminFetch(token, '/categories', {
    method: 'POST',
    body: JSON.stringify({ name }),
  });
  return (await jsonOrThrow(res)) as Category;
}

export async function deleteCategory(token: string, id: number): Promise<void> {
  const res = await adminFetch(token, `/categories/${id}`, { method: 'DELETE' });
  await jsonOrThrow(res);
}

// ------------ Users ------------

export type AdminUser = {
  id: number;
  username: string;
  role: string;
  created_at: string;
};

export async function fetchUsers(token: string): Promise<AdminUser[]> {
  const res = await adminFetch(token, '/users');
  return (await jsonOrThrow(res)) as AdminUser[];
}

export async function createUser(
  token: string,
  username: string,
  password: string
): Promise<AdminUser> {
  const res = await adminFetch(token, '/users', {
    method: 'POST',
    body: JSON.stringify({ username, password }),
  });
  return (await jsonOrThrow(res)) as AdminUser;
}

export async function deleteUser(token: string, id: number): Promise<void> {
  const res = await adminFetch(token, `/users/${id}`, { method: 'DELETE' });
  await jsonOrThrow(res);
}

// ============================================================
// Poin Member — kasir/admin
// ============================================================

export type Member = {
  id: number;
  name: string;
  phone: string;
  phone_display: string;
  birthdate: string | null;
  address: string | null;
  saldo_poin: number;
  total_belanja: number;
  jumlah_transaksi: number;
  transaksi_terakhir: string | null;
  created_at?: string;
  /** Hanya terisi pada GET /members/{id} */
  transactions?: PointTx[];
  /** Hanya terisi pada daftar ulang tahun */
  tanggal_ulang_tahun?: number;
};

export type MemberInput = {
  name: string;
  phone: string;
  birthdate: string | null;
  address: string | null;
};

export type PointTx = {
  id: number;
  member_id?: number;
  member_name?: string;
  member_phone?: string;
  member_phone_display?: string;
  total_belanja: number;
  poin_dipakai: number;
  potongan: number;
  total_bayar: number;
  poin_didapat: number;
  catatan: string | null;
  created_by: string | null;
  created_at: string;
};

export type TransaksiBaru = {
  member_id: number;
  total_belanja: number;
  poin_dipakai: number;
  catatan?: string;
};

export type HasilTransaksi = {
  id: number;
  member_id: number;
  member_name: string;
  total_belanja: number;
  poin_dipakai: number;
  potongan: number;
  total_bayar: number;
  poin_didapat: number;
  saldo_akhir: number;
};

export async function fetchMembers(token: string, q = ''): Promise<Member[]> {
  const qs = q.trim() ? `?q=${encodeURIComponent(q.trim())}` : '';
  const res = await adminFetch(token, `/members${qs}`);
  return (await jsonOrThrow(res)) as Member[];
}

export async function fetchMember(token: string, id: number): Promise<Member> {
  const res = await adminFetch(token, `/members/${id}`);
  return (await jsonOrThrow(res)) as Member;
}

export async function createMember(token: string, input: MemberInput): Promise<Member> {
  const res = await adminFetch(token, '/members', {
    method: 'POST',
    body: JSON.stringify(input),
  });
  return (await jsonOrThrow(res)) as Member;
}

export async function updateMember(token: string, id: number, input: MemberInput): Promise<Member> {
  const res = await adminFetch(token, `/members/${id}`, {
    method: 'PUT',
    body: JSON.stringify(input),
  });
  return (await jsonOrThrow(res)) as Member;
}

export async function deleteMember(token: string, id: number): Promise<void> {
  const res = await adminFetch(token, `/members/${id}`, { method: 'DELETE' });
  await jsonOrThrow(res);
}

export async function fetchBirthdays(
  token: string,
  month: number
): Promise<{ month: number; members: Member[] }> {
  const res = await adminFetch(token, `/members/birthdays?month=${month}`);
  return (await jsonOrThrow(res)) as { month: number; members: Member[] };
}

export async function fetchTransactions(
  token: string,
  opts: { memberId?: number; limit?: number } = {}
): Promise<PointTx[]> {
  const params = new URLSearchParams();
  if (opts.memberId) params.set('member_id', String(opts.memberId));
  if (opts.limit) params.set('limit', String(opts.limit));
  const qs = params.toString() ? `?${params.toString()}` : '';
  const res = await adminFetch(token, `/transactions${qs}`);
  return (await jsonOrThrow(res)) as PointTx[];
}

export async function createTransaction(token: string, input: TransaksiBaru): Promise<HasilTransaksi> {
  const res = await adminFetch(token, '/transactions', {
    method: 'POST',
    body: JSON.stringify(input),
  });
  return (await jsonOrThrow(res)) as HasilTransaksi;
}

export async function deleteTransaction(
  token: string,
  id: number
): Promise<{ member_id: number; saldo_akhir: number }> {
  const res = await adminFetch(token, `/transactions/${id}`, { method: 'DELETE' });
  return (await jsonOrThrow(res)) as { member_id: number; saldo_akhir: number };
}

// ============================================================
// Poin Member — halaman pembeli (tanpa akun)
// ============================================================

export type PortalMember = { name: string; saldo_poin: number };

export type PortalTx = {
  total_belanja: number;
  poin_dipakai: number;
  potongan: number;
  total_bayar: number;
  poin_didapat: number;
  created_at: string;
};

/**
 * Token pembeli sengaja disimpan di sessionStorage, bukan localStorage:
 * hilang begitu tab ditutup, aman kalau HP-nya dipakai bergantian.
 */
const PORTAL_KEY = 'avasport_portal_token';

export function getPortalToken(): string | null {
  if (typeof window === 'undefined') return null;
  try {
    return sessionStorage.getItem(PORTAL_KEY);
  } catch {
    return null;
  }
}

export function setPortalToken(token: string): void {
  try {
    sessionStorage.setItem(PORTAL_KEY, token);
  } catch {
    // mode privat — cukup bertahan di memori halaman
  }
}

export function clearPortalToken(): void {
  try {
    sessionStorage.removeItem(PORTAL_KEY);
  } catch {
    // no-op
  }
}

export async function portalCheck(
  phone: string
): Promise<{ token: string; member: PortalMember }> {
  if (!API_BASE) throw new Error('NEXT_PUBLIC_API_URL belum di-set.');
  const res = await fetch(`${API_BASE}/portal/check`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ phone }),
    cache: 'no-store',
  });
  const data = (await jsonOrThrow(res)) as { token: string; member: PortalMember };
  setPortalToken(data.token);
  return data;
}

export async function portalMe(
  token: string
): Promise<{ member: PortalMember; transactions: PortalTx[] }> {
  if (!API_BASE) throw new Error('NEXT_PUBLIC_API_URL belum di-set.');
  // Sengaja tidak lewat adminFetch: token pembeli tidak boleh menyentuh
  // sesi admin (termasuk penyimpanan token hasil perpanjangan).
  const res = await fetch(`${API_BASE}/portal/me`, {
    headers: { Authorization: `Bearer ${token}` },
    cache: 'no-store',
  });
  return (await jsonOrThrow(res)) as { member: PortalMember; transactions: PortalTx[] };
}

// ------------ Utils ------------

export function fmtRupiah(n: number | null | undefined): string {
  if (n === null || n === undefined) return '-';
  return 'Rp' + Number(n).toLocaleString('id-ID');
}
