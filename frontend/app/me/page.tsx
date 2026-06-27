'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { api } from '@/lib/api';
import { Subject } from '@/lib/types';
import { Card } from '@/components/ui';
import { useAuth } from '@/lib/auth';

export default function MyProgramPage() {
  const { user } = useAuth();
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Không truyền studentId → backend tự lọc theo học sinh đang đăng nhập.
    api<Subject[]>('/subjects')
      .then(setSubjects)
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="max-w-4xl">
      <h1 className="text-2xl font-display font-bold mb-1">
        Chào {user?.name ?? 'bạn'} 👋
      </h1>
      <p className="text-slate-500 mb-6">Chọn môn học để bắt đầu.</p>

      {loading ? (
        <p className="text-slate-400">Đang tải...</p>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {subjects.map((s) => (
            <Link key={s.id} href={`/subjects/${s.id}`}>
              <Card className="hover:shadow-md transition cursor-pointer">
                <div className="font-semibold text-lg">{s.name}</div>
                {s.description && (
                  <div className="text-sm text-slate-500">{s.description}</div>
                )}
                <div className="text-sm text-primary font-medium mt-2">
                  {s._count?.sessions ?? 0} buổi học →
                </div>
              </Card>
            </Link>
          ))}
          {subjects.length === 0 && (
            <p className="text-slate-400">
              Chưa có môn học nào. Hãy nhờ phụ huynh thêm môn học cho bạn.
            </p>
          )}
        </div>
      )}
    </div>
  );
}
