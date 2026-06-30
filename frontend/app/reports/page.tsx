'use client';

import { Suspense, useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { api } from '@/lib/api';
import { Assessment, OverviewStudent, StudentReport } from '@/lib/types';
import { Button, Card, ModelSelect } from '@/components/ui';
import { LineChart, ScoreBar } from '@/components/charts';
import { useAiModels } from '@/lib/useAiModels';

function ReportsInner() {
  const params = useSearchParams();
  const [students, setStudents] = useState<OverviewStudent[]>([]);
  const [selected, setSelected] = useState<string>('');
  const [report, setReport] = useState<StudentReport | null>(null);
  const [assessment, setAssessment] = useState<Assessment | null>(null);
  const [assessing, setAssessing] = useState(false);
  const { models, model, setModel } = useAiModels();

  useEffect(() => {
    api<OverviewStudent[]>('/reports/overview').then((list) => {
      setStudents(list);
      const fromQuery = params.get('student');
      setSelected(fromQuery || list[0]?.id || '');
    });
  }, [params]);

  useEffect(() => {
    if (!selected) return;
    setReport(null);
    setAssessment(null);
    api<StudentReport>(`/reports/student/${selected}`).then(setReport);
  }, [selected]);

  async function runAssessment() {
    setAssessing(true);
    try {
      setAssessment(
        await api<Assessment>(`/reports/student/${selected}/assessment`, {
          method: 'POST',
          body: JSON.stringify({ model }),
        }),
      );
    } finally {
      setAssessing(false);
    }
  }

  return (
    <div className="max-w-5xl">
      <h1 className="text-2xl font-display font-bold mb-1">Báo cáo</h1>
      <p className="text-slate-500 mb-6">Tiến độ điểm số & đánh giá tổng hợp.</p>

      {/* Chọn học sinh */}
      <div className="flex gap-2 mb-6">
        {students.map((s) => (
          <button
            key={s.id}
            onClick={() => setSelected(s.id)}
            className={`rounded-lg px-4 py-2 text-sm font-medium border transition ${
              selected === s.id
                ? 'bg-primary text-white border-primary'
                : 'bg-card text-slate-600 border-slate-200 hover:border-primary'
            }`}
          >
            {s.name}
          </button>
        ))}
      </div>

      {!report ? (
        <p className="text-slate-400">Đang tải...</p>
      ) : (
        <div className="space-y-6">
          {/* Biểu đồ tiến độ */}
          <Card>
            <h2 className="font-semibold mb-3">📈 Điểm theo thời gian (◆ kiểm tra · ● bài tập)</h2>
            <LineChart
              points={report.timeline.map((t) => ({
                label: `${t.label} (${t.subject})`,
                score: t.score,
                type: t.type,
              }))}
            />
          </Card>

          {/* Trung bình theo môn */}
          <Card>
            <h2 className="font-semibold mb-3">📊 Trung bình theo môn</h2>
            {report.bySubject.length === 0 ? (
              <p className="text-slate-400 text-sm">Chưa có môn học.</p>
            ) : (
              <div className="space-y-3">
                {report.bySubject.map((sub) => (
                  <div key={sub.subjectId} className="grid grid-cols-3 gap-3 items-center">
                    <span className="text-sm font-medium">{sub.subjectName}</span>
                    <div className="col-span-2">
                      <ScoreBar value={sub.avgOverall} />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>

          {/* Đánh giá AI */}
          <Card>
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-3">
              <h2 className="font-semibold">🤖 Đánh giá tổng hợp (AI)</h2>
              <div className="flex flex-wrap items-center gap-2">
                <ModelSelect models={models} value={model} onChange={setModel} disabled={assessing} />
                <Button onClick={runAssessment} disabled={assessing}>
                  {assessing ? 'AI đang phân tích...' : 'Tạo đánh giá'}
                </Button>
              </div>
            </div>
            {assessment ? (
              <div className="space-y-3 text-sm">
                <p className="text-slate-700">{assessment.summary}</p>
                <AssessList title="✅ Điểm mạnh" items={assessment.strengths} color="text-success" />
                <AssessList title="⚠️ Cần cải thiện" items={assessment.weaknesses} color="text-danger" />
                <AssessList title="💡 Gợi ý" items={assessment.suggestions} color="text-primary" />
              </div>
            ) : (
              <p className="text-slate-400 text-sm">
                Nhấn “Tạo đánh giá” để AI phân tích điểm mạnh/yếu và gợi ý cải thiện.
              </p>
            )}
          </Card>

          {/* Lịch sử kiểm tra */}
          <Card>
            <h2 className="font-semibold mb-3">📝 Các bài kiểm tra gần đây</h2>
            <div className="space-y-2">
              {report.examResults.length === 0 && (
                <p className="text-slate-400 text-sm">Chưa có kết quả kiểm tra.</p>
              )}
              {report.examResults
                .slice()
                .reverse()
                .map((r) => (
                  <div key={r.id} className="flex items-center justify-between border-b border-slate-100 pb-2">
                    <div>
                      <div className="text-sm font-medium">{r.title}</div>
                      <div className="text-xs text-slate-400">
                        {r.subject} · {new Date(r.takenAt).toLocaleDateString('vi-VN')}
                      </div>
                    </div>
                    <div className="text-lg font-bold text-primary">{r.score}</div>
                  </div>
                ))}
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}

function AssessList({ title, items, color }: { title: string; items: string[]; color: string }) {
  if (!items?.length) return null;
  return (
    <div>
      <div className={`font-medium ${color}`}>{title}</div>
      <ul className="ml-5 list-disc text-slate-600">
        {items.map((it, i) => (
          <li key={i}>{it}</li>
        ))}
      </ul>
    </div>
  );
}

export default function ReportsPage() {
  return (
    <Suspense fallback={<p className="text-slate-400">Đang tải...</p>}>
      <ReportsInner />
    </Suspense>
  );
}
