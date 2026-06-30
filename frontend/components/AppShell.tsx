'use client';

import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { useAuth } from '@/lib/auth';
import { Role } from '@/lib/types';

interface NavItem {
  href: string;
  label: string;
  roles: Role[];
}

const NAV: NavItem[] = [
  { href: '/', label: '🏠 Tổng quan', roles: ['PARENT'] },
  { href: '/students', label: '👧 Học sinh', roles: ['PARENT'] },
  { href: '/reports', label: '📊 Báo cáo', roles: ['PARENT'] },
  { href: '/settings', label: '⚙️ Cài đặt AI', roles: ['PARENT'] },
  { href: '/me', label: '📚 Chương trình của tôi', roles: ['STUDENT'] },
];

export function AppShell({ children }: { children: React.ReactNode }) {
  const { user, ready, logout } = useAuth();
  const pathname = usePathname();
  const router = useRouter();
  const isPublicPage = pathname === '/login' || pathname === '/register';
  const [menuOpen, setMenuOpen] = useState(false);

  // Chưa đăng nhập → chuyển tới trang login (trừ các trang công khai).
  useEffect(() => {
    if (ready && !user && !isPublicPage) router.replace('/login');
  }, [ready, user, isPublicPage, router]);

  // Đóng menu mobile mỗi khi chuyển trang.
  useEffect(() => {
    setMenuOpen(false);
  }, [pathname]);

  // Trang đăng nhập / đăng ký: không có sidebar.
  if (isPublicPage) return <main className="min-h-screen">{children}</main>;

  if (!ready || !user) {
    return (
      <div className="flex min-h-screen items-center justify-center text-slate-400">
        Đang tải...
      </div>
    );
  }

  const nav = NAV.filter((item) => item.roles.includes(user.role));

  // Nội dung điều hướng dùng chung cho sidebar (desktop) và drawer (mobile).
  const navLinks = nav.map((item) => {
    const active = pathname === item.href;
    return (
      <a
        key={item.href}
        href={item.href}
        className={`block rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
          active
            ? 'bg-background text-primary'
            : 'text-slate-600 hover:bg-background hover:text-primary'
        }`}
      >
        {item.label}
      </a>
    );
  });

  const userBlock = (
    <div className="border-t border-slate-100 pt-4 mt-4">
      <div className="text-xs text-slate-400 mb-1">
        {user.role === 'PARENT' ? 'Phụ huynh' : 'Học sinh'}
      </div>
      <div className="text-sm font-semibold mb-3">{user.name}</div>
      <button
        onClick={logout}
        className="w-full rounded-lg px-3 py-2 text-sm font-medium text-slate-600 hover:bg-background hover:text-danger transition-colors text-left"
      >
        🚪 Đăng xuất
      </button>
    </div>
  );

  return (
    <div className="md:flex md:min-h-screen">
      {/* Thanh trên cùng — chỉ hiện trên mobile */}
      <header className="md:hidden sticky top-0 z-30 flex items-center justify-between bg-card border-b border-slate-100 px-4 py-3">
        <div className="text-lg font-display font-bold text-primary">
          🎓 Kids LMS
        </div>
        <button
          onClick={() => setMenuOpen(true)}
          aria-label="Mở menu"
          className="rounded-lg p-2 text-slate-600 hover:bg-background"
        >
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <line x1="3" y1="6" x2="21" y2="6" />
            <line x1="3" y1="12" x2="21" y2="12" />
            <line x1="3" y1="18" x2="21" y2="18" />
          </svg>
        </button>
      </header>

      {/* Sidebar — desktop */}
      <aside className="hidden md:flex w-60 shrink-0 bg-card border-r border-slate-100 p-5 flex-col">
        <div className="text-xl font-display font-bold text-primary mb-6">
          🎓 Kids LMS
        </div>
        <nav className="space-y-1 flex-1">{navLinks}</nav>
        {userBlock}
      </aside>

      {/* Drawer + lớp phủ — mobile */}
      {menuOpen && (
        <div className="md:hidden fixed inset-0 z-40">
          <div
            className="absolute inset-0 bg-slate-900/40"
            onClick={() => setMenuOpen(false)}
          />
          <aside className="absolute left-0 top-0 h-full w-64 max-w-[80%] bg-card p-5 flex flex-col shadow-xl">
            <div className="flex items-center justify-between mb-6">
              <div className="text-xl font-display font-bold text-primary">
                🎓 Kids LMS
              </div>
              <button
                onClick={() => setMenuOpen(false)}
                aria-label="Đóng menu"
                className="rounded-lg p-1.5 text-slate-500 hover:bg-background"
              >
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                  <line x1="6" y1="6" x2="18" y2="18" />
                  <line x1="18" y1="6" x2="6" y2="18" />
                </svg>
              </button>
            </div>
            <nav className="space-y-1 flex-1">{navLinks}</nav>
            {userBlock}
          </aside>
        </div>
      )}

      <main className="flex-1 p-4 sm:p-6 md:p-8">{children}</main>
    </div>
  );
}
