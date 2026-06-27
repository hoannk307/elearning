import { Controller, Get } from '@nestjs/common';
import { PrismaService } from './prisma/prisma.service';
import { Public } from './auth/decorators';

@Controller()
export class AppController {
  constructor(private readonly prisma: PrismaService) {}

  /** Health check — kiểm tra backend + kết nối DB */
  @Public()
  @Get('health')
  async health() {
    let db = 'down';
    try {
      await this.prisma.$queryRaw`SELECT 1`;
      db = 'up';
    } catch {
      db = 'down';
    }
    return { status: 'ok', db, time: new Date().toISOString() };
  }
}
