import { Global, Module } from '@nestjs/common';
import { AiService } from './ai.service';
import { SettingsService } from './settings.service';
import { SettingsController } from './settings.controller';
import { AnthropicProvider } from './providers/anthropic.provider';
import { GeminiProvider } from './providers/gemini.provider';

@Global()
@Module({
  controllers: [SettingsController],
  providers: [
    AiService,
    SettingsService,
    AnthropicProvider,
    GeminiProvider,
  ],
  exports: [AiService, SettingsService],
})
export class AiModule {}
