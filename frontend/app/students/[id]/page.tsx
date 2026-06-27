'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { api } from '@/lib/api';
import { Student, Subject } from '@/lib/types';
import { Button, Card, Input } from '@/components/ui';

export default function StudentDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [student, setStudent] = useState<Student | null>(null);
  const [name, setName] = useState('');
  const [desc, setDesc] = useState('');
  const [saving, setSaving] = useState(false);

  async function load() {
    setStudent(await api<Student>(`/students/${id}`));
  }

  useEffect(() => {
    if (id) load();
  }, [id]);

  async function addSubject(e: React.FormEvent) {
    e.preventDefault();
    if (!name) return;
    setSaving(true);
    try {
      await api<Subject>('/subjects', {
        method: 'POST',
        body: JSON.stringify({ studentId: id, name, description: desc || undefined }),
      });
      setName('');
      setDesc('');
      await load();
    } finally {
      setSaving(false);
    }
  }

  if (!student) return <p className="text-slate-400">Đang tải...</p>;

  return (
    <div className="max-w-4xl">
      <Link href="/students" className="text-sm text-primary">← Học sinh</Link>
      <h1 className="text-2xl font-display font-bold mt-2 mb-1">{student.name}</h1>
      <p className="text-slate-500 mb-6">
        {student.gradeLevel}
        {student.age ? ` · ${student.age} tuổi` : ''}
      </p>

      <h2 className="font-semibold mb-3">Môn học</h2>

      <Card className="mb-6">
        <form onSubmit={addSubject} className="grid grid-cols-1 sm:grid-cols-3 gap-3 items-end">
          <div>
            <label className="text-xs text-slate-500">Tên môn</label>
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Toán" />
          </div>
          <div>
            <label className="text-xs text-slate-500">Mô tả (tuỳ chọn)</label>
            <Input value={desc} onChange={(e) => setDesc(e.target.value)} placeholder="Số học cơ bản" />
          </div>
          <div>
            <Button type="submit" disabled={saving}>
              {saving ? 'Đang lưu...' : '+ Thêm môn'}
            </Button>
          </div>
        </form>
      </Card>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {(student.subjects ?? []).map((s) => (
          <Link key={s.id} href={`/subjects/${s.id}`}>
            <Card className="hover:shadow-md transition cursor-pointer">
              <div className="font-semibold text-lg">{s.name}</div>
              {s.description && <div className="text-sm text-slate-500">{s.description}</div>}
              <div className="text-sm text-primary font-medium mt-2">Mở giáo trình →</div>
            </Card>
          </Link>
        ))}
        {(student.subjects ?? []).length === 0 && (
          <p className="text-slate-400">Chưa có môn học nào.</p>
        )}
      </div>
    </div>
  );
}
