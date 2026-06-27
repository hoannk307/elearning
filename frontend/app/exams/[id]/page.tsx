'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useParams } from 'next/navigation';
import { api, getToken, openAuthedFile } from '@/lib/api';
import { Exam, ExamResult } from '@/lib/types';
import { Badge, Button, Card, ModelSelect } from '@/components/ui';
import { useAiModels } from '@/lib/useAiModels';
import { useAuth } from '@/lib/auth';

export default function ExamPage() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const isParent = user?.role === 'PARENT';
  const [exam, setExam] = useState<Exam | null>(null);
  const [results, setResults] = useState<ExamResult[]>([]);
  const [files, setFiles] = useState<FileList | null>(null);
  const [grading, setGrading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const { models, model, setModel } = useAiModels();

  const loadExam = useCallback(async () => {
    const e = await api<Exam>(`/exams/${id}`);
    setExam(e);
    if (e.status !== 'GENERATING' && pollRef.current) {
      clearInterval(pollRef.current);
      pollRef.current = null;
    }
  }, [id]);

  const loadResults = useCallback(async () => {
    setResults(await api<ExamResult[]>(`/exam-results?examId=${id}`));
  }, [id]);

  useEffect(() => {
    if (id) {
      loadExam();
      loadResults();
    }
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, [id, loadExam, loadResults]);

  // Nếu đề đang tạo, poll cho tới khi xong
  useEffect(() => {
    if (exam?.status === 'GENERATING' && !pollRef.current) {
      pollRef.current = setInterval(loadExam, 3000);
    }
  }, [exam?.status, loadExam]);

  async function grade(e: React.FormEvent) {
    e.preventDefault();
    if (!files?.length) return;
    setGrading(true);
    setError(null);
    try {
      const form = new FormData();
      form.append('examId', id);
      if (model) form.append('model', model);
      Array.from(files).forEach((f) => form.append('images', f));
      const token = getToken();
      const res = await fetch('/api/exam-results', {
        method: 'POST',
        body: form,
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (!res.ok) throw new Error(await res.text());
      setFiles(null);
      await loadResults();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Chấm bài thất bại');
    } finally {
      setGrading(false);
    }
  }

  if (!exam) return <p className="text-slate-400">Đang tải...</p>;

  const ready = exam.status === 'READY';

  return (
    <div className="max-w-4xl">
      <div className="flex items-center gap-2 mb-1">
        <h1 className="text-2xl font-display font-bold">{exam.title}</h1>
        <Badge status={exam.status} />
      </div>
      <p className="text-slate-500 mb-6">Tổng điểm: {exam.totalPoints}</p>

      {exam.status === 'GENERATING' && (
        <Card className="mb-6">
          <p className="text-slate-500">AI đang soạn đề... (tự cập nhật mỗi 3s)</p>
        </Card>
      )}
      {exam.status === 'FAILED' && (
        <Card className="mb-6">
          <p className="text-danger">Lỗi tạo đề: {exam.error}</p>
          <Button
            className="mt-2"
            onClick={() =>
              api(`/exams/${id}/regenerate`, {
                method: 'POST',
                body: JSON.stringify({ model }),
              }).then(loadExam)
            }
          >
            ↻ Tạo lại
          </Button>
        </Card>
      )}

      {ready && (
        <Card className="mb-6">
          <h2 className="font-semibold mb-3">🖨 In đề</h2>
          <div className="flex gap-3">
            <Button variant="secondary" onClick={() => openAuthedFile(`/exams/${id}/pdf`)}>
              In đề thi (bản làm)
            </Button>
            {isParent && (
              <Button variant="ghost" onClick={() => openAuthedFile(`/exams/${id}/pdf?answers=1`)}>
                Bản đáp án (phụ huynh)
              </Button>
            )}
          </div>
        </Card>
      )}

      {ready && isParent && (
        <Card className="mb-6">
          <h2 className="font-semibold mb-2">📸 Chấm bài từ ảnh</h2>
          <p className="text-sm text-slate-500 mb-3">
            Chụp ảnh bài làm của bé (1–5 ảnh), AI sẽ chấm điểm & nhận xét trình bày.
          </p>
          <form onSubmit={grade} className="flex flex-wrap items-center gap-3">
            <input
              type="file"
              accept="image/*"
              multiple
              onChange={(e) => setFiles(e.target.files)}
              className="text-sm"
            />
            <ModelSelect
              models={models}
              value={model}
              onChange={setModel}
              visionOnly
              disabled={grading}
            />
            <Button type="submit" disabled={grading || !files?.length}>
              {grading ? 'AI đang chấm... (~20s)' : 'Chấm bài'}
            </Button>
          </form>
          {error && <p className="text-danger text-sm mt-2">{error}</p>}
        </Card>
      )}

      {/* Kết quả chấm */}
      <h2 className="font-semibold mb-3">Kết quả ({results.length})</h2>
      <div className="space-y-4">
        {results.map((r) => (
          <Card key={r.id}>
            <div className="flex items-center justify-between">
              <div className="text-2xl font-bold text-primary">
                {r.scoreTotal}
                <span className="text-base text-slate-400 font-normal">/{r.maxScore}</span>
              </div>
              <div className="text-xs text-slate-400">
                {new Date(r.takenAt).toLocaleString('vi-VN')}
              </div>
            </div>

            {r.aiFeedback && (
              <p className="mt-2 text-sm text-slate-700">💬 {r.aiFeedback}</p>
            )}
            {r.presentationNote && (
              <p className="mt-1 text-sm text-slate-600">✍️ Trình bày: {r.presentationNote}</p>
            )}

            {r.scoreDetailJson?.essay && r.scoreDetailJson.essay.length > 0 && (
              <div className="mt-3 text-sm">
                <div className="font-medium text-slate-500 mb-1">Chi tiết tự luận:</div>
                <ul className="space-y-1">
                  {r.scoreDetailJson.essay.map((es) => (
                    <li key={es.index} className="text-slate-600">
                      Câu {es.index}: <b>{es.awarded}/{es.max}</b>
                      {es.comment ? ` — ${es.comment}` : ''}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {r.imageUrls?.length > 0 && (
              <div className="mt-3 flex gap-2 flex-wrap">
                {r.imageUrls.map((u) => (
                  <a key={u} href={u} target="_blank">
                    <img src={u} alt="bài làm" className="h-20 rounded border border-slate-200" />
                  </a>
                ))}
              </div>
            )}
          </Card>
        ))}
        {results.length === 0 && (
          <p className="text-slate-400">Chưa có lần chấm nào.</p>
        )}
      </div>
    </div>
  );
}
