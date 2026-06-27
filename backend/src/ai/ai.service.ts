import { Injectable, Logger } from '@nestjs/common';
import {
  AI_MODELS,
  AiModelDef,
  AiProvider,
  getModelDef,
} from './ai.models';
import { AiError, classifyAiError } from './ai.errors';
import { LlmImage, LlmProvider } from './providers/llm-provider';
import { AnthropicProvider } from './providers/anthropic.provider';
import { GeminiProvider } from './providers/gemini.provider';
import { SettingsService } from './settings.service';

/** Thông tin model trả về cho UI (kèm trạng thái đã cấu hình key chưa). */
export interface AiModelInfo extends AiModelDef {
  configured: boolean;
  isDefault: boolean;
}

/**
 * Service dùng chung để gọi LLM (Claude hoặc Gemini).
 * Các module khác (curriculum parse, tạo bài tập, tạo đề, chấm bài, đánh giá)
 * gọi qua đây và có thể truyền `model` để chọn model cho từng lần.
 */
@Injectable()
export class AiService {
  private readonly logger = new Logger(AiService.name);
  private readonly providers: Record<AiProvider, LlmProvider>;

  constructor(
    private readonly anthropic: AnthropicProvider,
    private readonly gemini: GeminiProvider,
    private readonly settings: SettingsService,
  ) {
    this.providers = { anthropic, gemini };
  }

  /** Danh sách model + trạng thái cấu hình + model mặc định hiện tại (cho UI). */
  async listModels(): Promise<AiModelInfo[]> {
    const defaultModel = await this.settings.getDefaultModel();
    return AI_MODELS.map((m) => ({
      ...m,
      configured: this.providers[m.provider].isConfigured(),
      isDefault: m.id === defaultModel,
    }));
  }

  getDefaultModel(): Promise<string> {
    return this.settings.getDefaultModel();
  }

  /** Gọi LLM và ép trả về JSON. Tự bóc khối ```json nếu có. */
  async completeJson<T>(params: {
    system: string;
    user: string;
    maxTokens?: number;
    model?: string;
  }): Promise<T> {
    const text = await this.run({
      system: params.system,
      user: params.user,
      maxTokens: params.maxTokens ?? 8000,
      model: params.model,
    });
    return this.extractJson<T>(text);
  }

  /** Gọi LLM (vision) với 1+ ảnh + ép trả về JSON. Dùng cho chấm bài làm. */
  async completeJsonWithImages<T>(params: {
    system: string;
    user: string;
    images: LlmImage[];
    maxTokens?: number;
    model?: string;
  }): Promise<T> {
    const text = await this.run({
      system: params.system,
      user: params.user,
      images: params.images,
      maxTokens: params.maxTokens ?? 4000,
      model: params.model,
      needsVision: true,
    });
    return this.extractJson<T>(text);
  }

  /** Định tuyến tới provider tương ứng + phân loại lỗi đồng nhất. */
  private async run(params: {
    system: string;
    user: string;
    maxTokens: number;
    model?: string;
    images?: LlmImage[];
    needsVision?: boolean;
  }): Promise<string> {
    const def = await this.resolveModel(params.model);

    if (params.needsVision && !def.vision) {
      throw new AiError(
        `Model ${def.id} không hỗ trợ ảnh`,
        false,
        `Model "${def.label}" không hỗ trợ chấm bài từ ảnh. Vui lòng chọn model khác.`,
      );
    }

    const provider = this.providers[def.provider];
    if (!provider.isConfigured()) {
      throw new AiError(
        `Provider ${def.provider} chưa cấu hình key`,
        false,
        `Model "${def.label}" chưa được cấu hình khóa API. Vui lòng chọn model khác hoặc thêm key.`,
      );
    }

    try {
      return await provider.complete({
        apiModel: def.apiModel,
        system: params.system,
        user: params.user,
        maxTokens: params.maxTokens,
        images: params.images,
      });
    } catch (err) {
      throw classifyAiError(err);
    }
  }

  /** Chọn model: id truyền vào (nếu hợp lệ) → model mặc định. */
  private async resolveModel(requested?: string): Promise<AiModelDef> {
    const requestedDef = getModelDef(requested);
    if (requestedDef) return requestedDef;

    if (requested) {
      this.logger.warn(`Model "${requested}" không hợp lệ, dùng model mặc định.`);
    }
    const defaultId = await this.settings.getDefaultModel();
    return getModelDef(defaultId) ?? AI_MODELS[0];
  }

  /** Bóc JSON từ text trả về (xử lý trường hợp bọc trong ```json ... ```). */
  private extractJson<T>(text: string): T {
    let raw = text.trim();
    const fence = raw.match(/```(?:json)?\s*([\s\S]*?)```/i);
    if (fence) raw = fence[1].trim();

    // Cắt từ dấu { hoặc [ đầu tiên tới } hoặc ] cuối cùng để loại nhiễu.
    const firstBrace = Math.min(
      ...['{', '['].map((c) => {
        const i = raw.indexOf(c);
        return i === -1 ? Number.MAX_SAFE_INTEGER : i;
      }),
    );
    const lastBrace = Math.max(raw.lastIndexOf('}'), raw.lastIndexOf(']'));
    if (firstBrace !== Number.MAX_SAFE_INTEGER && lastBrace > firstBrace) {
      raw = raw.slice(firstBrace, lastBrace + 1);
    }

    try {
      return JSON.parse(raw) as T;
    } catch {
      this.logger.error(`Không parse được JSON từ AI: ${text.slice(0, 500)}`);
      throw new AiError(
        'AI trả về dữ liệu không phải JSON',
        true,
        'AI trả về dữ liệu không hợp lệ. Vui lòng thử lại hoặc đổi model.',
      );
    }
  }
}
