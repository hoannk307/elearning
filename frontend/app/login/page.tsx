'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth';
import { Button, Card, Input } from '@/components/ui';

export default function LoginPage() {
  const { login } = useAuth();
  const router = useRouter();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!username || !password) return;
    setLoading(true);
    setError(null);
    try {
      const user = await login(username, password);
      router.replace(user.role === 'PARENT' ? '/' : '/me');
    } catch {
      setError('Sai tên đăng nhập hoặc mật khẩu');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <Card className="w-full max-w-sm">
        <div className="text-2xl font-display font-bold text-primary mb-1 text-center">
          🎓 Kids LMS
        </div>
        <p className="text-sm text-slate-500 mb-6 text-center">
          Đăng nhập để tiếp tục
        </p>

        <form onSubmit={submit} className="space-y-4">
          <div>
            <label className="text-xs text-slate-500">Tên đăng nhập</label>
            <Input
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="phuhuynh hoặc tài khoản học sinh"
              autoFocus
            />
          </div>
          <div>
            <label className="text-xs text-slate-500">Mật khẩu</label>
            <Input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••"
            />
          </div>

          {error && <p className="text-sm text-danger">{error}</p>}

          <Button type="submit" disabled={loading} className="w-full">
            {loading ? 'Đang đăng nhập...' : 'Đăng nhập'}
          </Button>
        </form>

        <p className="text-sm text-slate-500 mt-4 text-center">
          Chưa có tài khoản?{' '}
          <Link href="/register" className="text-primary font-medium">
            Đăng ký phụ huynh
          </Link>
        </p>
      </Card>
    </div>
  );
}
