import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { NestExpressApplication } from '@nestjs/platform-express';
import { join } from 'path';
import { AppModule } from './app.module';
import { AiExceptionFilter } from './ai/ai-exception.filter';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);

  // Cho phép Next.js (port 3000) gọi API
  app.enableCors({
    origin: process.env.FRONTEND_URL ?? 'http://localhost:3000',
    credentials: true,
  });

  // Phục vụ file tĩnh trong thư mục uploads (ảnh bài làm, file sinh ra)
  const uploadDir = process.env.UPLOAD_DIR ?? './uploads';
  app.useStaticAssets(join(process.cwd(), uploadDir), { prefix: '/uploads' });

  app.setGlobalPrefix('api');
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
  app.useGlobalFilters(new AiExceptionFilter());

  const port = process.env.PORT ?? 3001;
  await app.listen(port);
  // eslint-disable-next-line no-console
  console.log(`🚀 Backend chạy tại http://localhost:${port}/api`);
}
bootstrap();
