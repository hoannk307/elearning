import {
  Injectable,
  Logger,
  OnModuleDestroy,
} from '@nestjs/common';
import { promises as fs } from 'fs';
import { dirname } from 'path';
import puppeteer, { Browser } from 'puppeteer';

/**
 * Render HTML → PDF bằng Puppeteer. Dùng 1 instance browser dùng chung,
 * khởi tạo lười (lazy) ở lần render đầu tiên.
 */
@Injectable()
export class PdfService implements OnModuleDestroy {
  private readonly logger = new Logger(PdfService.name);
  private browser: Browser | null = null;
  private launching: Promise<Browser> | null = null;

  private async getBrowser(): Promise<Browser> {
    if (this.browser?.connected) return this.browser;
    if (this.launching) return this.launching;

    this.launching = puppeteer
      .launch({
        headless: true,
        executablePath: process.env.PUPPETEER_EXECUTABLE_PATH || undefined,
        args: ['--no-sandbox', '--disable-setuid-sandbox'],
      })
      .then((b) => {
        this.browser = b;
        this.launching = null;
        this.logger.log('Puppeteer browser đã khởi động.');
        return b;
      })
      .catch((e) => {
        this.launching = null;
        throw e;
      });

    return this.launching;
  }

  /** Render HTML thành Buffer PDF (A4). */
  async renderToBuffer(html: string): Promise<Buffer> {
    const browser = await this.getBrowser();
    const page = await browser.newPage();
    try {
      await page.setContent(html, { waitUntil: 'load' });
      const pdf = await page.pdf({
        format: 'A4',
        printBackground: true,
        margin: { top: '16mm', bottom: '16mm', left: '14mm', right: '14mm' },
      });
      return Buffer.from(pdf);
    } finally {
      await page.close();
    }
  }

  /** Render HTML và ghi ra file (tự tạo thư mục cha). */
  async renderToFile(html: string, absPath: string): Promise<void> {
    const buffer = await this.renderToBuffer(html);
    await fs.mkdir(dirname(absPath), { recursive: true });
    await fs.writeFile(absPath, buffer);
  }

  async onModuleDestroy() {
    if (this.browser) await this.browser.close();
  }
}
