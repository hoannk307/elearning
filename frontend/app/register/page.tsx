'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { Button, Card, Input } from '@/components/ui';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE_RE = /^[0-9+()\s-]{8,15}$/;

type UsernameState = 'idle' | 'checking' | 'available' | 'taken' | 'invalid';

export default function RegisterPage() {
  const { register } = useAuth();
  const router = useRouter();

  const [name, setName] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');

  const [usernameState, setUsernameState] = useState<UsernameState>('idle');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Kiểm tra trùng tên đăng nhập (debounce 500ms).
  useEffect(() => {
    if (!username) {
      setUsernameState('idle');
      return;
    }
    if (username.length < 3) {
      setUsernameState('invalid');
      return;
    }
    setUsernameState('checking');
    const t = setTimeout(async () => {
      try {
        const res = await api<{ available: boolean }>(
          `/auth/username-available?username=${encodeURIComponent(username)}`,
        );
        setUsernameState(res.available ? 'available' : 'taken');
      } catch {
        setUsernameState('idle');
      }
    }, 500);
    return () => clearTimeout(t);
  }, [username]);

  const passwordMismatch = confirm.length > 0 && password !== confirm;
  const emailInvalid = email.length > 0 && !EMAIL_RE.test(email);
  const phoneInvalid = phone.length > 0 && !PHONE_RE.test(phone);

  function validate(): string | null {
    if (!name.trim()) return 'Vui lòng nhập họ tên';
    if (username.length < 3) return 'Tên đăng nhập tối thiểu 3 ký tự';
    if (usernameState === 'taken') return 'Tên đăng nhập đã tồn tại';
    if (password.length < 6) return 'Mật khẩu tối thiểu 6 ký tự';
    if (password !== confirm) return 'Mật khẩu nhập lại không khớp';
    if (!EMAIL_RE.test(email)) return 'Email không hợp lệ';
    if (!PHONE_RE.test(phone)) return 'Số điện thoại không hợp lệ';
    return null;
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const err = validate();
    if (err) {
      setError(err);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      await register({ name, username, password, email, phone });
      router.replace('/');
    } catch (ex) {
      const msg = ex instanceof Error ? ex.message : '';
      setError(
        msg.includes('409')
          ? 'Tên đăng nhập hoặc email đã được sử dụng'
          : 'Đăng ký thất bại. Vui lòng kiểm tra lại thông tin.',
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md">
        <div className="text-2xl font-display font-bold text-primary mb-1 text-center">
          🎓 Kids LMS
        </div>
        <p className="text-sm text-slate-500 mb-6 text-center">
          Đăng ký tài khoản phụ huynh
        </p>

        <form onSubmit={submit} className="space-y-4">
          <div>
            <label className="text-xs text-slate-500">Họ tên phụ huynh</label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Nguyễn Văn A"
              autoFocus
            />
          </div>

          <div>
            <label className="text-xs text-slate-500">Tên đăng nhập</label>
            <Input
              value={username}
              onChange={(e) => setUsername(e.target.value.trim())}
              placeholder="ít nhất 3 ký tự"
              autoComplete="off"
            />
            {usernameState === 'checking' && (
              <p className="text-xs text-slate-400 mt-1">Đang kiểm tra...</p>
            )}
            {usernameState === 'available' && (
              <p className="text-xs text-success mt-1">✓ Tên đăng nhập dùng được</p>
            )}
            {usernameState === 'taken' && (
              <p className="text-xs text-danger mt-1">✕ Tên đăng nhập đã tồn tại</p>
            )}
            {usernameState === 'invalid' && (
              <p className="text-xs text-danger mt-1">Tối thiểu 3 ký tự</p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-slate-500">Mật khẩu</label>
              <Input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="≥ 6 ký tự"
                autoComplete="new-password"
              />
            </div>
            <div>
              <label className="text-xs text-slate-500">Nhập lại mật khẩu</label>
              <Input
                type="password"
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                placeholder="nhập lại"
                autoComplete="new-password"
              />
            </div>
          </div>
          {passwordMismatch && (
            <p className="text-xs text-danger -mt-2">Mật khẩu nhập lại không khớp</p>
          )}

          <div>
            <label className="text-xs text-slate-500">Email</label>
            <Input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value.trim())}
              placeholder="email@example.com"
            />
            {emailInvalid && (
              <p className="text-xs text-danger mt-1">Email không hợp lệ</p>
            )}
          </div>

          <div>
            <label className="text-xs text-slate-500">Số điện thoại</label>
            <Input
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="0901234567"
            />
            {phoneInvalid && (
              <p className="text-xs text-danger mt-1">Số điện thoại không hợp lệ</p>
            )}
          </div>

          {error && <p className="text-sm text-danger">{error}</p>}

          <Button
            type="submit"
            disabled={loading || usernameState === 'taken'}
            className="w-full"
          >
            {loading ? 'Đang tạo tài khoản...' : 'Đăng ký'}
          </Button>
        </form>

        <p className="text-sm text-slate-500 mt-4 text-center">
          Đã có tài khoản?{' '}
          <Link href="/login" className="text-primary font-medium">
            Đăng nhập
          </Link>
        </p>
      </Card>
    </div>
  );
}
