'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { AiModelInfo, AiModelsResponse, QuestionConfig } from '@/lib/types';
import { Button, Card, Input } from '@/components/ui';

const PROVIDER_LABEL: Record<string, string> = {
  anthropic: 'Claude (Anthropic)',
  gemini: 'Gemini (Google)',
};

export default function SettingsPage() {
  const [models, setModels] = useState<AiModelInfo[]>([]);
  const [defaultModel, setDefaultModel] = useState('');
  const [selected, setSelected] = useState('');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  async function load() {
    const res = await api<AiModelsResponse>('/settings/ai-models');
    setModels(res.models);
    setDefaultModel(res.defaultModel);
    setSelected(res.defaultModel);
  }

  useEffect(() => {
    load();
  }, []);

  async function save() {
    setSaving(true);
    setSaved(false);
    try {
      await api('/settings/ai-model', {
        method: 'PUT',
        body: JSON.stringify({ model: selected }),
      });
      setDefaultModel(selected);
      setSaved(true);
    } finally {
      setSaving(false);
    }
  }

  const providers = Array.from(new Set(models.map((m) => m.provider)));

  return (
    <div className="max-w-3xl">
      <h1 className="text-2xl font-display font-bold mb-1">⚙️ Cài đặt AI</h1>
      <p className="text-slate-500 mb-6">
        Chọn model AI mặc định. Bạn vẫn có thể đổi model riêng cho từng lần tách
        buổi học, tạo đề, chấm bài...
      </p>

      <Card>
        <h2 className="font-semibold mb-3">Model AI mặc định</h2>
        <div className="space-y-4">
          {providers.map((p) => (
            <div key={p}>
              <div className="text-sm font-medium text-slate-500 mb-2">
                {PROVIDER_LABEL[p] ?? p}
              </div>
              <div className="space-y-2">
                {models
                  .filter((m) => m.provider === p)
                  .map((m) => {
                    const locked = !m.configured;
                    return (
                      <label
                        key={m.id}
                        className={`flex items-start gap-3 rounded-lg border p-3 transition ${
                          locked
                            ? 'opacity-50 cursor-not-allowed border-slate-100'
                            : selected === m.id
                              ? 'border-primary bg-primary/5 cursor-pointer'
                              : 'border-slate-200 hover:border-primary cursor-pointer'
                        }`}
                      >
                        <input
                          type="radio"
                          name="model"
                          className="mt-1"
                          value={m.id}
                          checked={selected === m.id}
                          disabled={locked}
                          onChange={() => setSelected(m.id)}
                        />
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <span className="font-medium">{m.label}</span>
                            {m.id === defaultModel && (
                              <span className="text-xs rounded-full bg-success/15 text-success px-2 py-0.5">
                                đang dùng
                              </span>
                            )}
                            {locked && (
                              <span className="text-xs rounded-full bg-danger/15 text-danger px-2 py-0.5">
                                chưa cấu hình key
                              </span>
                            )}
                          </div>
                          {m.hint && (
                            <p className="text-sm text-slate-500 mt-0.5">{m.hint}</p>
                          )}
                        </div>
                      </label>
                    );
                  })}
              </div>
            </div>
          ))}
        </div>

        <div className="mt-5 flex items-center gap-3">
          <Button onClick={save} disabled={saving || !selected || selected === defaultModel}>
            {saving ? 'Đang lưu...' : 'Lưu model mặc định'}
          </Button>
          {saved && <span className="text-sm text-success">✓ Đã lưu</span>}
        </div>
      </Card>

      <QuestionConfigCard />

      <Card className="mt-4">
        <h2 className="font-semibold mb-1">Thêm model / cấu hình key</h2>
        <p className="text-sm text-slate-500">
          Model bị khoá là do chưa có API key. Điền key vào file{' '}
          <code className="bg-background px-1 rounded">backend/.env</code> rồi khởi
          động lại backend:
        </p>
        <ul className="text-sm text-slate-600 mt-2 list-disc ml-5 space-y-1">
          <li>
            Claude: <code className="bg-background px-1 rounded">ANTHROPIC_API_KEY</code>{' '}
            (lấy tại console.anthropic.com)
          </li>
          <li>
            Gemini: <code className="bg-background px-1 rounded">GEMINI_API_KEY</code>{' '}
            (lấy tại aistudio.google.com/app/apikey)
          </li>
        </ul>
      </Card>
    </div>
  );
}

/** Cấu hình số câu trắc nghiệm / tự luận cho bài tập & đề kiểm tra. */
function QuestionConfigCard() {
  const [cfg, setCfg] = useState<QuestionConfig | null>(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    api<QuestionConfig>('/settings/question-config').then(setCfg);
  }, []);

  function update(key: keyof QuestionConfig, value: string) {
    const n = Math.max(0, Math.floor(Number(value) || 0));
    setCfg((c) => (c ? { ...c, [key]: n } : c));
    setSaved(false);
  }

  async function save() {
    if (!cfg) return;
    setSaving(true);
    setSaved(false);
    try {
      const res = await api<QuestionConfig>('/settings/question-config', {
        method: 'PUT',
        body: JSON.stringify(cfg),
      });
      setCfg(res);
      setSaved(true);
    } finally {
      setSaving(false);
    }
  }

  if (!cfg) {
    return (
      <Card className="mt-4">
        <h2 className="font-semibold mb-1">📝 Cấu hình bài tập & bài kiểm tra</h2>
        <p className="text-sm text-slate-400">Đang tải...</p>
      </Card>
    );
  }

  const exerciseTotal = cfg.exerciseMcCount + cfg.exerciseEssayCount;
  const examTotal = cfg.examMcCount + cfg.examEssayCount;

  return (
    <Card className="mt-4">
      <h2 className="font-semibold mb-1">📝 Cấu hình bài tập & bài kiểm tra</h2>
      <p className="text-sm text-slate-500 mb-4">
        Số câu AI sẽ tạo cho mỗi bài tập và mỗi đề kiểm tra của các bé nhà bạn.
      </p>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
        <div>
          <div className="text-sm font-medium text-slate-600 mb-2">Bài tập</div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-slate-500">Số câu trắc nghiệm</label>
              <Input
                type="number"
                min={0}
                value={cfg.exerciseMcCount}
                onChange={(e) => update('exerciseMcCount', e.target.value)}
              />
            </div>
            <div>
              <label className="text-xs text-slate-500">Số câu tự luận</label>
              <Input
                type="number"
                min={0}
                value={cfg.exerciseEssayCount}
                onChange={(e) => update('exerciseEssayCount', e.target.value)}
              />
            </div>
          </div>
          <p className="text-xs text-slate-400 mt-1">Tổng: {exerciseTotal} câu/bài tập</p>
        </div>

        <div>
          <div className="text-sm font-medium text-slate-600 mb-2">Đề kiểm tra</div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-slate-500">Số câu trắc nghiệm</label>
              <Input
                type="number"
                min={0}
                value={cfg.examMcCount}
                onChange={(e) => update('examMcCount', e.target.value)}
              />
            </div>
            <div>
              <label className="text-xs text-slate-500">Số câu tự luận</label>
              <Input
                type="number"
                min={0}
                value={cfg.examEssayCount}
                onChange={(e) => update('examEssayCount', e.target.value)}
              />
            </div>
          </div>
          <p className="text-xs text-slate-400 mt-1">Tổng: {examTotal} câu/đề</p>
        </div>
      </div>

      <div className="mt-5 flex items-center gap-3">
        <Button onClick={save} disabled={saving}>
          {saving ? 'Đang lưu...' : 'Lưu cấu hình'}
        </Button>
        {saved && <span className="text-sm text-success">✓ Đã lưu</span>}
      </div>
    </Card>
  );
}
