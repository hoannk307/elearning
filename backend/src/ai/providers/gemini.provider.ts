import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { GoogleGenAI, type Part } from '@google/genai';
import { LlmCallParams, LlmProvider } from './llm-provider';

/** Provider gọi Google Gemini API (@google/genai). */
@Injectable()
export class GeminiProvider implements LlmProvider {
  readonly provider = 'gemini' as const;
  private readonly logger = new Logger(GeminiProvider.name);
  private readonly client?: GoogleGenAI;
  private readonly apiKey?: string;

  constructor(config: ConfigService) {
    this.apiKey = config.get<string>('GEMINI_API_KEY') || undefined;
    if (this.apiKey) {
      this.client = new GoogleGenAI({ apiKey: this.apiKey });
    } else {
      this.logger.warn('GEMINI_API_KEY chưa thiết lập — các model Gemini sẽ lỗi khi gọi.');
    }
  }

  isConfigured(): boolean {
    return !!this.apiKey;
  }

  async complete(params: LlmCallParams): Promise<string> {
    if (!this.client) {
      throw new Error('GEMINI_API_KEY chưa cấu hình — không thể gọi model Gemini.');
    }

    const parts: Part[] = [];
    for (const img of params.images ?? []) {
      parts.push({ inlineData: { mimeType: img.mediaType, data: img.dataBase64 } });
    }
    parts.push({ text: params.user });

    const res = await this.client.models.generateContent({
      model: params.apiModel,
      contents: [{ role: 'user', parts }],
      config: {
        systemInstruction: params.system,
        // Tắt "thinking" của Gemini 2.5: các tác vụ ở đây chỉ là trích xuất JSON,
        // không cần suy luận sâu. Nếu bật, token suy nghĩ sẽ ăn vào maxOutputTokens
        // và làm JSON bị cắt cụt → parse lỗi.
        thinkingConfig: { thinkingBudget: 0 },
        maxOutputTokens: Math.max(params.maxTokens, 8192),
        responseMimeType: 'application/json',
      },
    });

    return (res.text ?? '').trim();
  }
}
