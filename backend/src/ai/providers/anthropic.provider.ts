import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Anthropic from '@anthropic-ai/sdk';
import { LlmCallParams, LlmProvider } from './llm-provider';

/** Provider gọi Anthropic Claude API. */
@Injectable()
export class AnthropicProvider implements LlmProvider {
  readonly provider = 'anthropic' as const;
  private readonly logger = new Logger(AnthropicProvider.name);
  private readonly client: Anthropic;
  private readonly apiKey?: string;

  constructor(config: ConfigService) {
    this.apiKey = config.get<string>('ANTHROPIC_API_KEY') || undefined;
    if (!this.apiKey) {
      this.logger.warn('ANTHROPIC_API_KEY chưa thiết lập — các model Claude sẽ lỗi khi gọi.');
    }
    this.client = new Anthropic({ apiKey: this.apiKey ?? 'missing-key' });
  }

  isConfigured(): boolean {
    return !!this.apiKey;
  }

  async complete(params: LlmCallParams): Promise<string> {
    const content: string | Anthropic.ContentBlockParam[] = params.images?.length
      ? [
          ...params.images.map(
            (img): Anthropic.ImageBlockParam => ({
              type: 'image',
              source: {
                type: 'base64',
                media_type: img.mediaType as Anthropic.Base64ImageSource['media_type'],
                data: img.dataBase64,
              },
            }),
          ),
          { type: 'text', text: params.user },
        ]
      : params.user;

    const res = await this.client.messages.create({
      model: params.apiModel,
      max_tokens: params.maxTokens,
      system: params.system,
      messages: [{ role: 'user', content }],
    });

    return res.content
      .filter((b): b is Anthropic.TextBlock => b.type === 'text')
      .map((b) => b.text)
      .join('\n')
      .trim();
  }
}
