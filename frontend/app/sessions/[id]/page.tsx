'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { api, openAuthedFile } from '@/lib/api';
import {
  Exercise,
  ExerciseGradingResult,
  Session,
  SessionVideo,
} from '@/lib/types';
import { Badge, Button, Card, Input, ModelSelect, Textarea } from '@/components/ui';
import { useAiModels } from '@/lib/useAiModels';
import { useAuth } from '@/lib/auth';

const TYPE_LABEL: Record<string, string> = {
  multiple_choice: 'Trắc nghiệm',
  short_answer: 'Trả lời ngắn',
  essay: 'Tự luận',
};

export default function SessionPage() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const isParent = user?.role === 'PARENT';
  const [session, setSession] = useState<Session | null>(null);
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [generating, setGenerating] = useState(false);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const { models, model, setModel } = useAiModels();

  const loadExercises = useCallback(async () => {
    const list = await api<Exercise[]>(`/exercises?sessionId=${id}`);
    setExercises(list);
    // Tự dừng polling khi không còn bài nào đang tạo
    if (!list.some((e) => e.status === 'GENERATING') && pollRef.current) {
      clearInterval(pollRef.current);
      pollRef.current = null;
    }
  }, [id]);

  useEffect(() => {
    if (id) {
      api<Session>(`/sessions/${id}`).then(setSession);
      loadExercises();
    }
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, [id, loadExercises]);

  function startPolling() {
    if (pollRef.current) return;
    pollRef.current = setInterval(loadExercises, 3000);
  }

  async function generate() {
    setGenerating(true);
    try {
      await api<Exercise>('/exercises', {
        method: 'POST',
        body: JSON.stringify({ sessionId: id, model }),
      });
      await loadExercises();
      startPolling();
    } finally {
      setGenerating(false);
    }
  }

  async function regenerate(exId: string) {
    await api(`/exercises/${exId}/regenerate`, {
      method: 'POST',
      body: JSON.stringify({ model }),
    });
    await loadExercises();
    startPolling();
  }

  async function remove(exId: string) {
    await api(`/exercises/${exId}`, { method: 'DELETE' });
    await loadExercises();
  }

  if (!session) return <p className="text-slate-400">Đang tải...</p>;

  const videos: SessionVideo[] = session.videos ?? [];

  return (
    <div className="max-w-4xl">
      {session.subject && (
        <Link href={`/subjects/${session.subject.id}`} className="text-sm text-primary">
          ← {session.subject.name}
        </Link>
      )}
      <h1 className="text-2xl font-display font-bold mt-2 mb-1">{session.title}</h1>
      {session.objective && <p className="text-slate-500 mb-1">🎯 {session.objective}</p>}

      {videos.length > 0 && (
        <ul className="mt-2 space-y-1">
          {videos.map((v) => (
            <li key={v.id}>
              <a href={v.url} target="_blank" rel="noreferrer" className="text-sm text-primary underline">
                ▶ {v.label || 'Xem video'}
              </a>
            </li>
          ))}
        </ul>
      )}

      <div className="flex items-center justify-between mt-6 mb-3">
        <h2 className="font-semibold">📝 Bài tập ({exercises.length})</h2>
        <div className="flex items-center gap-2">
          <ModelSelect models={models} value={model} onChange={setModel} disabled={generating} />
          <Button onClick={generate} disabled={generating}>
            {generating ? 'Đang gửi...' : '✨ AI tạo bài tập'}
          </Button>
        </div>
      </div>
      {!isParent && (
        <p className="text-sm text-slate-500 mb-3">
          Tạo bài tập sau buổi học, làm trực tiếp trên máy rồi nộp để được chấm điểm tự động.
        </p>
      )}

      <div className="space-y-3">
        {exercises.map((ex) => (
          <Card key={ex.id}>
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <span className="font-semibold">{ex.title ?? 'Bài tập'}</span>
                  <Badge status={ex.status} />
                </div>

                {ex.status === 'GENERATING' && (
                  <p className="text-sm text-slate-400 mt-1">AI đang tạo câu hỏi...</p>
                )}
                {ex.status === 'FAILED' && (
                  <p className="text-sm text-danger mt-1">Lỗi: {ex.error}</p>
                )}

                {/* Phụ huynh: xem trước câu hỏi + nhập điểm tay */}
                {ex.status === 'READY' && isParent && (
                  <>
                    {ex.contentJson?.questions && (
                      <ol className="mt-2 ml-4 list-decimal text-sm text-slate-600 space-y-1">
                        {ex.contentJson.questions.slice(0, 8).map((q, i) => (
                          <li key={i}>
                            <span className="text-xs text-secondary mr-1">
                              [{TYPE_LABEL[q.type] ?? q.type}]
                            </span>
                            {q.question}
                          </li>
                        ))}
                      </ol>
                    )}
                    <ScoreInput exercise={ex} onSaved={loadExercises} />
                  </>
                )}

                {/* Học sinh: làm bài trực tiếp trên máy */}
                {ex.status === 'READY' && !isParent && (
                  <StudentWorksheet exercise={ex} model={model} onGraded={loadExercises} />
                )}
              </div>

              <div className="flex flex-col gap-2 shrink-0">
                {ex.status === 'READY' && isParent && (
                  <>
                    <Button
                      variant="secondary"
                      onClick={() => openAuthedFile(`/exercises/${ex.id}/pdf`)}
                    >
                      🖨 In phiếu
                    </Button>
                    <Button
                      variant="ghost"
                      onClick={() => openAuthedFile(`/exercises/${ex.id}/pdf?answers=1`)}
                    >
                      Đáp án
                    </Button>
                  </>
                )}
                <Button variant="ghost" onClick={() => regenerate(ex.id)}>
                  ↻ Tạo lại
                </Button>
                <Button variant="ghost" onClick={() => remove(ex.id)}>
                  Xoá
                </Button>
              </div>
            </div>
          </Card>
        ))}
        {exercises.length === 0 && (
          <p className="text-slate-400">
            Chưa có bài tập. Nhấn “AI tạo bài tập” để Claude soạn bộ bài cho buổi này.
          </p>
        )}
      </div>
    </div>
  );
}

/** Phụ huynh nhập điểm tay sau khi bé làm xong. */
function ScoreInput({
  exercise,
  onSaved,
}: {
  exercise: Exercise;
  onSaved: () => void;
}) {
  const latest = exercise.results?.[0];
  const [score, setScore] = useState('');
  const [saving, setSaving] = useState(false);

  async function save() {
    if (score === '') return;
    setSaving(true);
    try {
      await api(`/exercises/${exercise.id}/result`, {
        method: 'POST',
        body: JSON.stringify({ score: Number(score), maxScore: 10 }),
      });
      setScore('');
      await onSaved();
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="mt-3 flex items-center gap-2">
      <span className="text-sm text-slate-500">Nhập điểm (/10):</span>
      <Input
        type="number"
        value={score}
        onChange={(e) => setScore(e.target.value)}
        placeholder={latest ? String(latest.score) : '0-10'}
        className="w-20"
      />
      <Button variant="ghost" onClick={save} disabled={saving || score === ''}>
        Lưu điểm
      </Button>
      {latest && (
        <span className="text-xs text-success">
          Điểm gần nhất: {latest.score}/{latest.maxScore}
        </span>
      )}
    </div>
  );
}

/** Học sinh làm bài tập trên máy, nộp để AI chấm. */
function StudentWorksheet({
  exercise,
  model,
  onGraded,
}: {
  exercise: Exercise;
  model: string;
  onGraded: () => void;
}) {
  const questions = exercise.contentJson?.questions ?? [];
  const [answers, setAnswers] = useState<string[]>(() => questions.map(() => ''));
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<ExerciseGradingResult | null>(null);
  const latest = exercise.results?.[0];

  function setAnswer(i: number, value: string) {
    setAnswers((prev) => {
      const next = [...prev];
      next[i] = value;
      return next;
    });
  }

  async function submit() {
    setSubmitting(true);
    try {
      const res = await api<ExerciseGradingResult>(`/exercises/${exercise.id}/submit`, {
        method: 'POST',
        body: JSON.stringify({ answers, model }),
      });
      setResult(res);
      await onGraded();
    } finally {
      setSubmitting(false);
    }
  }

  if (result) {
    return (
      <div className="mt-3 rounded-lg bg-success/5 border border-success/20 p-3">
        <div className="font-semibold text-success">
          Điểm: {result.total}/{result.maxTotal}
        </div>
        {result.feedback && (
          <p className="text-sm text-slate-600 mt-1">{result.feedback}</p>
        )}
        <ol className="mt-2 ml-4 list-decimal text-sm space-y-1">
          {result.items.map((it) => (
            <li key={it.index} className={it.correct === false ? 'text-danger' : 'text-slate-600'}>
              {it.awarded}/{it.max} điểm
              {it.comment ? ` — ${it.comment}` : ''}
            </li>
          ))}
        </ol>
        <Button variant="ghost" className="mt-2" onClick={() => setResult(null)}>
          Làm lại
        </Button>
      </div>
    );
  }

  return (
    <div className="mt-3 space-y-3">
      {latest?.source === 'STUDENT_AI' && (
        <p className="text-xs text-success">
          Lần làm gần nhất: {latest.score}/{latest.maxScore} điểm
        </p>
      )}
      {questions.map((q, i) => (
        <div key={i}>
          <div className="text-sm font-medium text-slate-700">
            <span className="text-xs text-secondary mr-1">
              [{TYPE_LABEL[q.type] ?? q.type}]
            </span>
            {i + 1}. {q.question}
          </div>
          {q.type === 'multiple_choice' && q.options?.length ? (
            <div className="mt-1 space-y-1">
              {q.options.map((opt, oi) => (
                <label key={oi} className="flex items-center gap-2 text-sm cursor-pointer">
                  <input
                    type="radio"
                    name={`q-${exercise.id}-${i}`}
                    checked={answers[i] === opt}
                    onChange={() => setAnswer(i, opt)}
                  />
                  {opt}
                </label>
              ))}
            </div>
          ) : (
            <Textarea
              rows={q.type === 'essay' ? 4 : 2}
              value={answers[i] ?? ''}
              onChange={(e) => setAnswer(i, e.target.value)}
              placeholder="Nhập câu trả lời..."
              className="mt-1"
            />
          )}
        </div>
      ))}

      <Button onClick={submit} disabled={submitting}>
        {submitting ? 'Đang chấm...' : '✅ Nộp & chấm điểm'}
      </Button>
    </div>
  );
}
