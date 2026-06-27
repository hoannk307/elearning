import { Global, Module } from '@nestjs/common';
import { StorageService } from './storage.service';

/**
 * Cung cấp StorageService (Cloudflare R2) dùng chung toàn app.
 */
@Global()
@Module({
  providers: [StorageService],
  exports: [StorageService],
})
export class StorageModule {}
