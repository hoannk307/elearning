/**
 * Danh mục các model AI được hỗ trợ trong app.
 * Mỗi chức năng AI (tách buổi học, tạo bài tập, tạo đề, chấm bài, đánh giá)
 * có thể chọn 1 trong các model này; nếu không chọn sẽ dùng model mặc định.
 */

export type AiProvider = 'anthropic' | 'gemini';

export interface AiModelDef {
  /** Mã định danh dùng trong API/UI/DB (ổn định, không đổi). */
  id: string;
  /** Tên hiển thị thân thiện trên giao diện. */
  label: string;
  /** Nhà cung cấp — quyết định client nào được dùng. */
  provider: AiProvider;
  /** Mã model thật gửi cho nhà cung cấp. */
  apiModel: string;
  /** Có hỗ trợ đầu vào ảnh không (dùng cho chấm bài từ ảnh). */
  vision: boolean;
  /** Mô tả ngắn để người dùng cân nhắc tốc độ/chất lượng/chi phí. */
  hint?: string;
}

/** Khóa lưu model mặc định trong bảng settings. */
export const DEFAULT_MODEL_SETTING_KEY = 'ai.defaultModel';

/** Danh sách model hỗ trợ. Thêm/bớt ở đây là tự động lan ra toàn app. */
export const AI_MODELS: AiModelDef[] = [
  {
    id: 'claude-opus-4-8',
    label: 'Claude Opus 4.8',
    provider: 'anthropic',
    apiModel: 'claude-opus-4-8',
    vision: true,
    hint: 'Mạnh nhất, chất lượng cao nhất (chậm & tốn hơn).',
  },
  {
    id: 'claude-sonnet-4-6',
    label: 'Claude Sonnet 4.6',
    provider: 'anthropic',
    apiModel: 'claude-sonnet-4-6',
    vision: true,
    hint: 'Cân bằng tốc độ & chất lượng — khuyên dùng hằng ngày.',
  },
  {
    id: 'claude-haiku-4-5',
    label: 'Claude Haiku 4.5',
    provider: 'anthropic',
    apiModel: 'claude-haiku-4-5-20251001',
    vision: true,
    hint: 'Nhanh & rẻ nhất, hợp việc đơn giản.',
  },
  {
    id: 'gemini-2.5-pro',
    label: 'Gemini 2.5 Pro',
    provider: 'gemini',
    apiModel: 'gemini-2.5-pro',
    vision: true,
    hint: 'Google — chất lượng cao.',
  },
  {
    id: 'gemini-2.5-flash',
    label: 'Gemini 2.5 Flash',
    provider: 'gemini',
    apiModel: 'gemini-2.5-flash',
    vision: true,
    hint: 'Google — nhanh & tiết kiệm.',
  },
];

/** Model mặc định khi chưa cấu hình gì (phải tồn tại trong AI_MODELS). */
export const FALLBACK_MODEL_ID = 'claude-sonnet-4-6';

export function getModelDef(id: string | null | undefined): AiModelDef | undefined {
  if (!id) return undefined;
  return AI_MODELS.find((m) => m.id === id);
}

export function isValidModelId(id: string | null | undefined): boolean {
  return !!getModelDef(id);
}
