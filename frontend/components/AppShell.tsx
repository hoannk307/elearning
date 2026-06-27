'use client';

import { usePathname, useRouter } from 'next/navigation';
import { useEffect } from 'react';
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

  // Chưa đăng nhập → chuyển tới trang login (trừ các trang công khai).
  useEffect(() => {
    if (ready && !user && !isPublicPage) router.replace('/login');
  }, [ready, user, isPublicPage, router]);

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

  return (
    <div className="flex min-h-screen">
      <aside className="w-60 shrink-0 bg-card border-r border-slate-100 p-5 flex flex-col">
        <div className="text-xl font-display font-bold text-primary mb-6">
          🎓 Kids LMS
        </div>
        <nav className="space-y-1 flex-1">
          {nav.map((item) => (
            <a
              key={item.href}
              href={item.href}
              className="block rounded-lg px-3 py-2 text-sm font-medium text-slate-600 hover:bg-background hover:text-primary transition-colors"
            >
              {item.label}
            </a>
          ))}
        </nav>
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
      </aside>

      <main className="flex-1 p-8">{children}</main>
    </div>
  );
}
