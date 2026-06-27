import { Global, Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { BullModule } from '@nestjs/bullmq';

/**
 * Cấu hình kết nối BullMQ tới Redis (dùng chung toàn app).
 * Các feature module đăng ký queue riêng bằng BullModule.registerQueue(...).
 */
@Global()
@Module({
  imports: [
    BullModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        connection: {
          host: config.get<string>('REDIS_HOST', 'localhost'),
          port: parseInt(config.get<string>('REDIS_PORT', '6379'), 10),
        },
        defaultJobOptions: {
          // Lỗi tải tạm thời của LLM (Gemini/Claude 503 "high demand", 429) có thể
          // kéo dài vài chục giây. Cần nhiều lượt thử + backoff dài để model kịp hồi
          // phục; lỗi không thể tự khỏi (hết credit/sai key) đã được processor ném
          // UnrecoverableError nên sẽ dừng ngay, không tốn các lượt retry này.
          attempts: 5,
          backoff: { type: 'exponential', delay: 8000 },
          removeOnComplete: 50,
          removeOnFail: 100,
        },
      }),
    }),
  ],
  exports: [BullModule],
})
export class QueueModule {}
