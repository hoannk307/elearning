'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { api } from '@/lib/api';
import { OverviewStudent } from '@/lib/types';
import { Card } from '@/components/ui';
import { ScoreBar } from '@/components/charts';

export default function DashboardPage() {
  const [students, setStudents] = useState<OverviewStudent[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState(false);

  useEffect(() => {
    api<OverviewStudent[]>('/reports/overview')
      .then(setStudents)
      .catch(() => setErr(true))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="max-w-5xl">
      <h1 className="text-2xl font-display font-bold mb-1">Tổng quan</h1>
      <p className="text-slate-500 mb-6">Bảng điều khiển học tập cho các bé.</p>

      {err && (
        <Card className="mb-6">
          <p className="text-danger">
            Chưa kết nối được backend. Hãy chạy Docker + backend (xem README).
          </p>
        </Card>
      )}

      {loading ? (
        <p className="text-slate-400">Đang tải...</p>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {students.map((s) => (
            <Card key={s.id}>
              <div className="flex items-center justify-between mb-3">
                <div>
                  <div className="text-lg font-semibold">{s.name}</div>
                  <div className="text-sm text-slate-500">{s.gradeLevel}</div>
                </div>
                <div className="text-right">
                  <div className="text-xs text-slate-400">Điểm TB chung</div>
                  <div className="text-2xl font-bold text-primary">
                    {s.avgOverall ?? '—'}
                  </div>
                </div>
              </div>

              <div className="space-y-2 text-sm">
                <div className="flex items-center gap-3">
                  <span className="w-24 text-slate-500">Bài kiểm tra</span>
                  <div className="flex-1">
                    <ScoreBar value={s.avgExam} />
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span className="w-24 text-slate-500">Bài tập</span>
                  <div className="flex-1">
                    <ScoreBar value={s.avgExercise} />
                  </div>
                </div>
              </div>

              <div className="mt-4 flex items-center justify-between text-xs text-slate-400">
                <span>
                  {s.subjectsCount} môn · {s.examCount} bài KT · {s.exerciseCount} bài tập
                </span>
                <div className="flex gap-3">
                  <Link href={`/students/${s.id}`} className="text-primary font-medium">
                    Hồ sơ
                  </Link>
                  <Link href={`/reports?student=${s.id}`} className="text-primary font-medium">
                    Báo cáo →
                  </Link>
                </div>
              </div>
            </Card>
          ))}
          {students.length === 0 && !err && (
            <Card>
              <p className="text-slate-500">
                Chưa có học sinh. <Link href="/students" className="text-primary">Thêm bé đầu tiên →</Link>
              </p>
            </Card>
          )}
        </div>
      )}
    </div>
  );
}
