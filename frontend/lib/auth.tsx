'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from 'react';
import { api, setToken } from './api';
import { AuthUser } from './types';

interface LoginResponse {
  token: string;
  id: string;
  role: AuthUser['role'];
  name: string;
}

export interface RegisterInput {
  username: string;
  password: string;
  name: string;
  email: string;
  phone: string;
}

interface AuthContextValue {
  user: AuthUser | null;
  ready: boolean; // đã kiểm tra phiên đăng nhập xong chưa
  login: (username: string, password: string) => Promise<AuthUser>;
  register: (input: RegisterInput) => Promise<AuthUser>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [ready, setReady] = useState(false);

  // Khôi phục phiên từ token đã lưu (gọi /auth/me).
  useEffect(() => {
    api<AuthUser>('/auth/me')
      .then(setUser)
      .catch(() => setUser(null))
      .finally(() => setReady(true));
  }, []);

  const login = useCallback(async (username: string, password: string) => {
    const res = await api<LoginResponse>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ username, password }),
    });
    setToken(res.token);
    const u: AuthUser = { id: res.id, role: res.role, name: res.name };
    setUser(u);
    return u;
  }, []);

  const register = useCallback(async (input: RegisterInput) => {
    const res = await api<LoginResponse>('/auth/register', {
      method: 'POST',
      body: JSON.stringify(input),
    });
    setToken(res.token);
    const u: AuthUser = { id: res.id, role: res.role, name: res.name };
    setUser(u);
    return u;
  }, []);

  const logout = useCallback(() => {
    setToken(null);
    setUser(null);
    if (typeof window !== 'undefined') window.location.href = '/login';
  }, []);

  return (
    <AuthContext.Provider value={{ user, ready, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth phải dùng trong AuthProvider');
  return ctx;
}
