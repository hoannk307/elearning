import {
  ButtonHTMLAttributes,
  InputHTMLAttributes,
  SelectHTMLAttributes,
  TextareaHTMLAttributes,
} from 'react';
import { AiModelInfo } from '@/lib/types';

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger';

const VARIANTS: Record<Variant, string> = {
  primary: 'bg-primary text-white hover:opacity-90',
  secondary: 'bg-secondary text-white hover:opacity-90',
  ghost: 'bg-transparent text-slate-600 hover:bg-background',
  danger: 'bg-danger text-white hover:opacity-90',
};

export function Button({
  variant = 'primary',
  className = '',
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant }) {
  return (
    <button
      className={`inline-flex items-center justify-center rounded-lg px-4 py-2 text-sm font-semibold transition disabled:opacity-50 disabled:cursor-not-allowed ${VARIANTS[variant]} ${className}`}
      {...props}
    />
  );
}

export function Card({
  children,
  className = '',
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={`bg-card rounded-card p-5 shadow-sm border border-slate-100 ${className}`}
    >
      {children}
    </div>
  );
}

export function Input(props: InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      {...props}
      className={`w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary ${props.className ?? ''}`}
    />
  );
}

export function Textarea(props: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      {...props}
      className={`w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary ${props.className ?? ''}`}
    />
  );
}

export function Select(props: SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select
      {...props}
      className={`rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none bg-white focus:border-primary focus:ring-1 focus:ring-primary ${props.className ?? ''}`}
    />
  );
}

const PROVIDER_LABEL: Record<string, string> = {
  anthropic: 'Claude (Anthropic)',
  gemini: 'Gemini (Google)',
};

/**
 * Ô chọn model AI. Model chưa cấu hình key bị khoá. Gắn nhãn "mặc định".
 * Truyền `visionOnly` để chỉ cho chọn model hỗ trợ ảnh (chấm bài).
 */
export function ModelSelect({
  models,
  value,
  onChange,
  visionOnly = false,
  disabled = false,
  className = '',
}: {
  models: AiModelInfo[];
  value: string;
  onChange: (id: string) => void;
  visionOnly?: boolean;
  disabled?: boolean;
  className?: string;
}) {
  const providers = Array.from(new Set(models.map((m) => m.provider)));
  return (
    <Select
      value={value}
      disabled={disabled || models.length === 0}
      onChange={(e) => onChange(e.target.value)}
      className={`max-w-[220px] ${className}`}
      title="Chọn model AI"
    >
      {models.length === 0 && <option>Đang tải model...</option>}
      {providers.map((p) => (
        <optgroup key={p} label={PROVIDER_LABEL[p] ?? p}>
          {models
            .filter((m) => m.provider === p)
            .map((m) => {
              const noVision = visionOnly && !m.vision;
              const locked = !m.configured;
              return (
                <option key={m.id} value={m.id} disabled={locked || noVision}>
                  {m.label}
                  {m.isDefault ? ' (mặc định)' : ''}
                  {locked ? ' — chưa có key' : noVision ? ' — không hỗ trợ ảnh' : ''}
                </option>
              );
            })}
        </optgroup>
      ))}
    </Select>
  );
}

const BADGE: Record<string, string> = {
  PENDING: 'bg-slate-100 text-slate-600',
  PARSING: 'bg-secondary/15 text-secondary',
  GENERATING: 'bg-secondary/15 text-secondary',
  PARSED: 'bg-success/15 text-success',
  READY: 'bg-success/15 text-success',
  DONE: 'bg-success/15 text-success',
  FAILED: 'bg-danger/15 text-danger',
};

export function Badge({ status }: { status: string }) {
  const label: Record<string, string> = {
    PENDING: 'Chờ',
    PARSING: 'Đang xử lý',
    GENERATING: 'Đang tạo',
    PARSED: 'Hoàn tất',
    READY: 'Sẵn sàng',
    DONE: 'Đã học',
    FAILED: 'Lỗi',
  };
  return (
    <span
      className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-medium ${BADGE[status] ?? 'bg-slate-100 text-slate-600'}`}
    >
      {label[status] ?? status}
    </span>
  );
}
