import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
import {
  DEFAULT_MODEL_SETTING_KEY,
  FALLBACK_MODEL_ID,
  isValidModelId,
} from './ai.models';

/**
 * Lưu/đọc các cài đặt dạng key-value (bảng settings).
 * Hiện dùng cho model AI mặc định của toàn app.
 */
@Injectable()
export class SettingsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
  ) {}

  async get(key: string): Promise<string | null> {
    const row = await this.prisma.setting.findUnique({ where: { key } });
    return row?.value ?? null;
  }

  async set(key: string, value: string): Promise<void> {
    await this.prisma.setting.upsert({
      where: { key },
      create: { key, value },
      update: { value },
    });
  }

  /**
   * Model mặc định: ưu tiên cài đặt trong DB → biến môi trường AI_DEFAULT_MODEL
   * → hằng số dự phòng. Luôn trả về 1 id hợp lệ.
   */
  async getDefaultModel(): Promise<string> {
    const stored = await this.get(DEFAULT_MODEL_SETTING_KEY);
    if (isValidModelId(stored)) return stored as string;

    const fromEnv = this.config.get<string>('AI_DEFAULT_MODEL');
    if (isValidModelId(fromEnv)) return fromEnv as string;

    return FALLBACK_MODEL_ID;
  }

  async setDefaultModel(modelId: string): Promise<void> {
    await this.set(DEFAULT_MODEL_SETTING_KEY, modelId);
  }

  /** Cấu hình số câu bài tập / đề kiểm tra của 1 phụ huynh. */
  async getQuestionConfig(parentId: string) {
    const p = await this.prisma.parent.findUniqueOrThrow({
      where: { id: parentId },
      select: {
        exerciseMcCount: true,
        exerciseEssayCount: true,
        examMcCount: true,
        examEssayCount: true,
      },
    });
    return p;
  }

  async setQuestionConfig(
    parentId: string,
    data: {
      exerciseMcCount?: number;
      exerciseEssayCount?: number;
      examMcCount?: number;
      examEssayCount?: number;
    },
  ) {
    await this.prisma.parent.update({ where: { id: parentId }, data });
    return this.getQuestionConfig(parentId);
  }
}
