// API client tối giản — gọi NestJS backend qua proxy /api của Next.js
const BASE = process.env.NEXT_PUBLIC_API_URL ?? '/api';

const TOKEN_KEY = 'kids_lms_token';

export function getToken(): string | null {
  if (typeof window === 'undefined') return null;
  return window.localStorage.getItem(TOKEN_KEY);
}

export function setToken(token: string | null) {
  if (typeof window === 'undefined') return;
  if (token) window.localStorage.setItem(TOKEN_KEY, token);
  else window.localStorage.removeItem(TOKEN_KEY);
}

export async function api<T>(path: string, init?: RequestInit): Promise<T> {
  const token = getToken();
  const res = await fetch(`${BASE}${path}`, {
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(init?.headers ?? {}),
    },
    ...init,
  });

  if (res.status === 401) {
    // Token hết hạn / không hợp lệ → đăng xuất, về trang đăng nhập.
    setToken(null);
    if (typeof window !== 'undefined' && window.location.pathname !== '/login') {
      window.location.href = '/login';
    }
    throw new Error('Phiên đăng nhập đã hết hạn');
  }

  if (!res.ok) {
    throw new Error(`API ${res.status}: ${await res.text()}`);
  }
  return res.json() as Promise<T>;
}

/**
 * Mở 1 file (vd PDF) từ endpoint cần xác thực trong tab mới.
 * window.open thường không gửi header Authorization, nên ta tự fetch kèm token
 * rồi mở blob URL.
 */
export async function openAuthedFile(path: string): Promise<void> {
  const token = getToken();
  const res = await fetch(`${BASE}${path}`, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
  if (!res.ok) {
    throw new Error(`API ${res.status}: ${await res.text()}`);
  }
  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  window.open(url, '_blank');
  // Giải phóng object URL sau khi tab mới đã tải xong.
  setTimeout(() => URL.revokeObjectURL(url), 60_000);
}
