'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { api } from '@/lib/api';
import { Student } from '@/lib/types';
import { Button, Card, Input } from '@/components/ui';

export default function StudentsPage() {
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  const [name, setName] = useState('');
  const [gradeLevel, setGradeLevel] = useState('');
  const [age, setAge] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    setStudents(await api<Student[]>('/students'));
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, []);

  async function add(e: React.FormEvent) {
    e.preventDefault();
    if (!name || !gradeLevel || !username || !password) return;
    setSaving(true);
    setError(null);
    try {
      await api<Student>('/students', {
        method: 'POST',
        body: JSON.stringify({
          name,
          gradeLevel,
          username,
          password,
          age: age ? Number(age) : undefined,
        }),
      });
      setName('');
      setGradeLevel('');
      setAge('');
      setUsername('');
      setPassword('');
      await load();
    } catch (err) {
      setError(
        err instanceof Error && err.message.includes('409')
          ? 'Tên đăng nhập đã tồn tại'
          : 'Không tạo được học sinh. Kiểm tra lại thông tin.',
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="max-w-4xl">
      <h1 className="text-2xl font-display font-bold mb-1">Học sinh</h1>
      <p className="text-slate-500 mb-6">Quản lý hồ sơ các bé.</p>

      <Card className="mb-6">
        <form onSubmit={add} className="grid grid-cols-1 sm:grid-cols-4 gap-3 items-end">
          <div className="sm:col-span-2">
            <label className="text-xs text-slate-500">Tên bé</label>
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Bé An" />
          </div>
          <div>
            <label className="text-xs text-slate-500">Lớp</label>
            <Input value={gradeLevel} onChange={(e) => setGradeLevel(e.target.value)} placeholder="Lớp 3" />
          </div>
          <div>
            <label className="text-xs text-slate-500">Tuổi</label>
            <Input value={age} onChange={(e) => setAge(e.target.value)} placeholder="8" type="number" />
          </div>
          <div className="sm:col-span-2">
            <label className="text-xs text-slate-500">Tên đăng nhập của bé</label>
            <Input
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="be_an"
              autoComplete="off"
            />
          </div>
          <div className="sm:col-span-2">
            <label className="text-xs text-slate-500">Mật khẩu</label>
            <Input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="ít nhất 4 ký tự"
              autoComplete="new-password"
            />
          </div>
          {error && <p className="sm:col-span-4 text-sm text-danger">{error}</p>}
          <div className="sm:col-span-4">
            <Button type="submit" disabled={saving}>
              {saving ? 'Đang lưu...' : '+ Thêm học sinh'}
            </Button>
          </div>
        </form>
      </Card>

      {loading ? (
        <p className="text-slate-400">Đang tải...</p>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {students.map((s) => (
            <Link key={s.id} href={`/students/${s.id}`}>
              <Card className="hover:shadow-md transition cursor-pointer">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-semibold text-lg">{s.name}</div>
                    <div className="text-sm text-slate-500">
                      {s.gradeLevel}
                      {s.age ? ` · ${s.age} tuổi` : ''}
                    </div>
                  </div>
                  <div className="text-sm text-primary font-medium">
                    {s._count?.subjects ?? 0} môn →
                  </div>
                </div>
              </Card>
            </Link>
          ))}
          {students.length === 0 && (
            <p className="text-slate-400">Chưa có học sinh nào. Thêm bé đầu tiên ở trên.</p>
          )}
        </div>
      )}
    </div>
  );
}
