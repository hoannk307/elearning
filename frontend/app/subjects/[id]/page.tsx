'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import { Curriculum, Exam, Session, SessionVideo, Subject } from '@/lib/types';
import { Badge, Button, Card, Input, ModelSelect, Textarea } from '@/components/ui';
import { useAiModels } from '@/lib/useAiModels';
import { useAuth } from '@/lib/auth';

export default function SubjectPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { user } = useAuth();
  const isParent = user?.role === 'PARENT';

  const [subject, setSubject] = useState<Subject | null>(null);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [rawText, setRawText] = useState('');
  const [parsing, setParsing] = useState(false);
  const [parseStatus, setParseStatus] = useState<string | null>(null);
  const [exams, setExams] = useState<Exam[]>([]);
  const [creatingExam, setCreatingExam] = useState(false);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const examPollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Model AI: 1 ô cho tách buổi học, 1 ô cho tạo đề (mặc định = model mặc định).
  const { models, model: parseModel, setModel: setParseModel } = useAiModels();
  const { model: examModel, setModel: setExamModel } = useAiModels();

  const loadSessions = useCallback(async () => {
    setSessions(await api<Session[]>(`/sessions?subjectId=${id}`));
  }, [id]);

  const loadExams = useCallback(async () => {
    const list = await api<Exam[]>(`/exams?subjectId=${id}`);
    setExams(list);
    if (!list.some((e) => e.status === 'GENERATING') && examPollRef.current) {
      clearInterval(examPollRef.current);
      examPollRef.current = null;
    }
  }, [id]);

  async function createExam() {
    if (!subject?.student?.id) return;
    setCreatingExam(true);
    try {
      await api<Exam>('/exams', {
        method: 'POST',
        body: JSON.stringify({ studentId: subject.student.id, subjectId: id, model: examModel }),
      });
      await loadExams();
      if (!examPollRef.current) examPollRef.current = setInterval(loadExams, 3000);
    } finally {
      setCreatingExam(false);
    }
  }

  const loadSubject = useCallback(async () => {
    setSubject(await api<Subject>(`/subjects/${id}`));
  }, [id]);

  useEffect(() => {
    if (id) {
      loadSubject();
      loadSessions();
      loadExams();
    }
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
      if (examPollRef.current) clearInterval(examPollRef.current);
    };
  }, [id, loadSubject, loadSessions, loadExams]);

  async function startParse(e: React.FormEvent) {
    e.preventDefault();
    if (rawText.trim().length < 10) return;
    setParsing(true);
    setParseStatus('PARSING');
    const created = await api<Curriculum>('/curriculums', {
      method: 'POST',
      body: JSON.stringify({ subjectId: id, rawText, model: parseModel }),
    });

    // Polling tiến độ mỗi 3s
    pollRef.current = setInterval(async () => {
      const c = await api<Curriculum>(`/curriculums/${created.id}`);
      setParseStatus(c.status);
      if (c.status === 'PARSED' || c.status === 'FAILED') {
        if (pollRef.current) clearInterval(pollRef.current);
        setParsing(false);
        if (c.status === 'PARSED') {
          setRawText('');
          await loadSubject();
          await loadSessions();
        }
      }
    }, 3000);
  }

  async function deleteSubject() {
    if (!confirm('Xoá môn học này? Toàn bộ chương trình, buổi học, bài tập và đề kiểm tra liên quan sẽ bị xoá.')) return;
    await api(`/subjects/${id}`, { method: 'DELETE' });
    router.push('/students');
  }

  async function deleteCurriculum(curriculumId: string) {
    if (!confirm('Xoá chương trình này? Tất cả buổi học sinh ra từ chương trình sẽ bị xoá để tạo lại từ đầu.')) return;
    await api(`/curriculums/${curriculumId}`, { method: 'DELETE' });
    await loadSubject();
    await loadSessions();
  }

  return (
    <div className="max-w-4xl">
      <div className="flex items-start justify-between gap-4">
        <div>
          <Link href={isParent ? '/students' : '/me'} className="text-sm text-primary">
            ← {isParent ? 'Học sinh' : 'Môn học của tôi'}
          </Link>
          <h1 className="text-2xl font-display font-bold mt-2 mb-1">
            {subject?.name ?? 'Môn học'}
          </h1>
          <p className="text-slate-500 mb-6">
            {subject?.student?.name} · {subject?.student?.gradeLevel}
          </p>
        </div>
        {isParent && (
          <Button variant="ghost" onClick={deleteSubject} className="text-danger">
            🗑 Xoá môn
          </Button>
        )}
      </div>

      {/* Nhập giáo trình — chỉ phụ huynh */}
      {isParent && (
        <Card className="mb-6">
          <h2 className="font-semibold mb-2">📋 Nhập chương trình học</h2>
          <p className="text-sm text-slate-500 mb-3">
            Dán nội dung chương trình (dạng text). AI sẽ tự tách thành các buổi học.
          </p>
          <form onSubmit={startParse}>
            <Textarea
              rows={6}
              value={rawText}
              onChange={(e) => setRawText(e.target.value)}
              placeholder="Ví dụ: Bài 1 - Số tự nhiên; Bài 2 - Phép cộng trong phạm vi 100; ..."
              disabled={parsing}
            />
            <div className="mt-3 flex flex-wrap items-center gap-3">
              <Button type="submit" disabled={parsing}>
                {parsing ? 'AI đang xử lý...' : '✨ AI tách buổi học'}
              </Button>
              <ModelSelect
                models={models}
                value={parseModel}
                onChange={setParseModel}
                disabled={parsing}
              />
              {parseStatus && (
                <span className="text-sm text-slate-500 flex items-center gap-2">
                  Trạng thái: <Badge status={parseStatus} />
                </span>
              )}
            </div>
          </form>

          {/* Danh sách chương trình đã nhập — cho phép xoá để tạo lại */}
          {(subject?.curriculums ?? []).length > 0 && (
            <div className="mt-4 border-t border-slate-100 pt-3 space-y-2">
              <p className="text-xs text-slate-400">Chương trình đã nhập:</p>
              {(subject?.curriculums ?? []).map((c) => (
                <div key={c.id} className="flex items-center justify-between gap-3 text-sm">
                  <span className="flex items-center gap-2 truncate">
                    <Badge status={c.status} />
                    <span className="truncate text-slate-600">
                      {c.rawText.slice(0, 60)}
                      {c.rawText.length > 60 ? '…' : ''}
                    </span>
                  </span>
                  <Button variant="ghost" onClick={() => deleteCurriculum(c.id)} className="text-danger shrink-0">
                    Xoá
                  </Button>
                </div>
              ))}
            </div>
          )}
        </Card>
      )}

      {/* Danh sách buổi học */}
      <div className="flex items-center justify-between mb-3">
        <h2 className="font-semibold">📚 Buổi học ({sessions.length})</h2>
      </div>

      <div className="space-y-3">
        {sessions.map((s) => (
          <SessionRow key={s.id} session={s} isParent={isParent} onChanged={loadSessions} />
        ))}
        {sessions.length === 0 && (
          <p className="text-slate-400">
            {isParent
              ? 'Chưa có buổi học. Nhập chương trình ở trên để AI tạo.'
              : 'Chưa có buổi học nào. Hãy nhờ phụ huynh nhập chương trình.'}
          </p>
        )}
      </div>

      {/* Đề kiểm tra */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mt-8 mb-3">
        <h2 className="font-semibold">📝 Đề kiểm tra ({exams.length})</h2>
        <div className="flex flex-wrap items-center gap-2">
          <ModelSelect
            models={models}
            value={examModel}
            onChange={setExamModel}
            disabled={creatingExam}
          />
          <Button onClick={createExam} disabled={creatingExam || sessions.length === 0}>
            {creatingExam ? 'Đang tạo...' : '✨ Tạo đề kiểm tra'}
          </Button>
        </div>
      </div>
      <p className="text-sm text-slate-500 mb-3">
        AI tổng hợp đề từ các buổi đã học (nếu chưa đánh dấu buổi nào, lấy tất cả).
        {!isParent && ' Đề được xuất ra PDF để in và làm trên giấy.'}
      </p>

      <div className="space-y-3">
        {exams.map((ex) => (
          <Link key={ex.id} href={`/exams/${ex.id}`}>
            <Card className="hover:shadow-md transition cursor-pointer">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="font-semibold">{ex.title}</span>
                  <Badge status={ex.status} />
                </div>
                <div className="text-sm text-slate-500">
                  {ex._count?.results ? `${ex._count.results} lần chấm` : 'Chưa chấm'} →
                </div>
              </div>
            </Card>
          </Link>
        ))}
        {exams.length === 0 && (
          <p className="text-slate-400">Chưa có đề kiểm tra nào.</p>
        )}
      </div>
    </div>
  );
}

function SessionRow({
  session,
  isParent,
  onChanged,
}: {
  session: Session;
  isParent: boolean;
  onChanged: () => void;
}) {
  const [saving, setSaving] = useState(false);

  // Đổi trạng thái đã học — endpoint riêng cho cả phụ huynh lẫn học sinh.
  async function toggleStatus() {
    setSaving(true);
    try {
      await api<Session>(`/sessions/${session.id}/status`, {
        method: 'PATCH',
        body: JSON.stringify({
          status: session.status === 'DONE' ? 'PENDING' : 'DONE',
        }),
      });
      await onChanged();
    } finally {
      setSaving(false);
    }
  }

  return (
    <Card>
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <span className="text-xs font-medium text-slate-400">
              #{session.orderIndex + 1}
            </span>
            <Link href={`/sessions/${session.id}`} className="font-semibold hover:text-primary">
              {session.title}
            </Link>
            <Badge status={session.status} />
          </div>
          {session.objective && (
            <p className="text-sm text-slate-500 mt-1">🎯 {session.objective}</p>
          )}
          {session.content && (
            <p className="text-sm text-slate-600 mt-1">{session.content}</p>
          )}

          <VideoList
            session={session}
            isParent={isParent}
            onChanged={onChanged}
          />
        </div>

        <Button
          variant={session.status === 'DONE' ? 'ghost' : 'secondary'}
          onClick={toggleStatus}
          disabled={saving}
          className="shrink-0 whitespace-nowrap"
        >
          {session.status === 'DONE' ? '↩ Bỏ đánh dấu' : '✓ Đã học'}
        </Button>
      </div>
    </Card>
  );
}

/** Danh sách link video của buổi học. Phụ huynh thêm/xoá; học sinh chỉ xem. */
function VideoList({
  session,
  isParent,
  onChanged,
}: {
  session: Session;
  isParent: boolean;
  onChanged: () => void;
}) {
  const [url, setUrl] = useState('');
  const [label, setLabel] = useState('');
  const [saving, setSaving] = useState(false);
  const videos: SessionVideo[] = session.videos ?? [];

  async function addVideo() {
    if (!url.trim()) return;
    setSaving(true);
    try {
      await api(`/sessions/${session.id}/videos`, {
        method: 'POST',
        body: JSON.stringify({ url, label: label || undefined }),
      });
      setUrl('');
      setLabel('');
      await onChanged();
    } finally {
      setSaving(false);
    }
  }

  async function removeVideo(videoId: string) {
    await api(`/sessions/videos/${videoId}`, { method: 'DELETE' });
    await onChanged();
  }

  return (
    <div className="mt-3">
      {videos.length > 0 ? (
        <ul className="space-y-1">
          {videos.map((v) => (
            <li key={v.id} className="flex items-center gap-2 text-sm">
              <a
                href={v.url}
                target="_blank"
                rel="noreferrer"
                className="text-primary underline truncate"
              >
                ▶ {v.label || v.url}
              </a>
              {isParent && (
                <button
                  onClick={() => removeVideo(v.id)}
                  className="text-xs text-danger hover:underline shrink-0"
                >
                  xoá
                </button>
              )}
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-xs text-slate-400">Chưa có link video.</p>
      )}

      {isParent && (
        <div className="mt-2 flex flex-wrap items-center gap-2">
          <Input
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="Dán link video..."
            className="max-w-xs"
          />
          <Input
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            placeholder="Nhãn (tuỳ chọn)"
            className="max-w-[160px]"
          />
          <Button variant="ghost" onClick={addVideo} disabled={saving || !url.trim()}>
            + Thêm link
          </Button>
        </div>
      )}
    </div>
  );
}
