import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PutObjectCommand, S3Client } from '@aws-sdk/client-s3';

/**
 * Lưu file lên Cloudflare R2 (tương thích S3 API).
 * Cấu hình đọc từ biến môi trường:
 *   R2_ENDPOINT, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, R2_BUCKET, R2_PUBLIC_BASE_URL (tùy chọn).
 */
@Injectable()
export class StorageService implements OnModuleInit {
  private readonly logger = new Logger(StorageService.name);
  private readonly bucket: string;
  private readonly publicBaseUrl: string;
  private readonly endpoint: string;
  private client: S3Client | null = null;

  constructor(private readonly config: ConfigService) {
    this.bucket = this.config.get<string>('R2_BUCKET', '');
    this.endpoint = this.config.get<string>('R2_ENDPOINT', '');
    // Bỏ dấu "/" cuối để ghép URL không bị double slash.
    this.publicBaseUrl = (
      this.config.get<string>('R2_PUBLIC_BASE_URL', '') || ''
    ).replace(/\/+$/, '');
  }

  onModuleInit() {
    const accessKeyId = this.config.get<string>('R2_ACCESS_KEY_ID', '');
    const secretAccessKey = this.config.get<string>('R2_SECRET_ACCESS_KEY', '');

    if (!this.endpoint || !this.bucket || !accessKeyId || !secretAccessKey) {
      this.logger.warn(
        'Cloudflare R2 chưa cấu hình đầy đủ (R2_ENDPOINT/R2_BUCKET/R2_ACCESS_KEY_ID/R2_SECRET_ACCESS_KEY). Upload file sẽ lỗi cho tới khi điền .env.',
      );
      return;
    }

    this.client = new S3Client({
      region: 'auto',
      endpoint: this.endpoint,
      credentials: { accessKeyId, secretAccessKey },
    });
    this.logger.log(`R2 storage sẵn sàng (bucket: ${this.bucket}).`);
  }

  /**
   * Upload buffer lên R2 và trả về URL công khai để hiển thị.
   * @param key Đường dẫn object trong bucket, vd "exam-images/abc.jpg".
   */
  async uploadBuffer(
    buffer: Buffer,
    contentType: string,
    key: string,
  ): Promise<string> {
    if (!this.client) {
      throw new Error(
        'Cloudflare R2 chưa được cấu hình — kiểm tra các biến R2_* trong .env.',
      );
    }

    await this.client.send(
      new PutObjectCommand({
        Bucket: this.bucket,
        Key: key,
        Body: buffer,
        ContentType: contentType,
      }),
    );

    return this.publicUrl(key);
  }

  /** Tạo URL công khai từ key. */
  publicUrl(key: string): string {
    if (this.publicBaseUrl) return `${this.publicBaseUrl}/${key}`;
    // Không có custom domain → dùng endpoint R2 trực tiếp (cần bật Public access cho bucket).
    return `${this.endpoint}/${this.bucket}/${key}`;
  }
}
