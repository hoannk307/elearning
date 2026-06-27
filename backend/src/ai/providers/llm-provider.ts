import { AiProvider } from '../ai.models';

export interface LlmImage {
  mediaType: string;
  dataBase64: string;
}

export interface LlmCallParams {
  /** Mã model thật của nhà cung cấp (AiModelDef.apiModel). */
  apiModel: string;
  system: string;
  user: string;
  maxTokens: number;
  /** Ảnh đính kèm (chấm bài). Provider không hỗ trợ vision sẽ bỏ qua/không nhận. */
  images?: LlmImage[];
}

/** Giao diện chung cho mọi nhà cung cấp LLM. Trả về text thô (chưa parse JSON). */
export interface LlmProvider {
  readonly provider: AiProvider;
  /** Đã có API key để gọi chưa. */
  isConfigured(): boolean;
  complete(params: LlmCallParams): Promise<string>;
}
