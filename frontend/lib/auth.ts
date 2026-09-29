const KEY = 'katalog_admin_token_v1';
const USER_KEY = 'katalog_admin_user_v1';

/** Anggap token habis sedikit lebih awal supaya tidak balapan dengan jam server. */
const SKEW_MS = 10_000;

type JwtPayload = {
  sub?: number;
  username?: string;
  role?: string;
  iat?: number;
  exp?: number;
};

/** Baca isi payload JWT tanpa memverifikasi tanda tangan (itu urusan server). */
export function decodeToken(token: string): JwtPayload | null {
  try {
    const body = token.split('.')[1];
    if (!body) return null;
    const b64 = body.replace(/-/g, '+').replace(/_/g, '/');
    const padded = b64 + '='.repeat((4 - (b64.length % 4)) % 4);
    const bin = atob(padded);
    const bytes = Uint8Array.from(bin, (c) => c.charCodeAt(0));
    const payload = JSON.parse(new TextDecoder().decode(bytes));
    return payload && typeof payload === 'object' ? (payload as JwtPayload) : null;
  } catch {
    return null;
  }
}

/** Waktu kedaluwarsa token dalam ms epoch, null kalau tidak bisa dibaca. */
export function tokenExpiresAt(token: string): number | null {
  const exp = decodeToken(token)?.exp;
  return typeof exp === 'number' ? exp * 1000 : null;
}

export function isTokenExpired(token: string): boolean {
  const at = tokenExpiresAt(token);
  // Token tanpa exp yang terbaca: biarkan server yang memutuskan.
  if (at === null) return false;
  return Date.now() >= at - SKEW_MS;
}

export function getToken(): string | null {
  if (typeof window === 'undefined') return null;
  try {
    const token = localStorage.getItem(KEY);
    if (!token) return null;
    if (isTokenExpired(token)) {
      localStorage.removeItem(KEY);
      return null;
    }
    return token;
  } catch {
    return null;
  }
}

export function setToken(token: string): void {
  try {
    localStorage.setItem(KEY, token);
    const username = decodeToken(token)?.username;
    if (username) localStorage.setItem(USER_KEY, username);
  } catch {
    // localStorage diblokir (mode privat) — biarkan, sesi hanya bertahan di memori
  }
}

export function clearToken(): void {
  try {
    localStorage.removeItem(KEY);
  } catch {
    // no-op
  }
}

/** Username terakhir yang login — dipakai untuk mengisi form login ulang. */
export function getLastUsername(): string {
  if (typeof window === 'undefined') return '';
  try {
    return localStorage.getItem(USER_KEY) ?? '';
  } catch {
    return '';
  }
}
