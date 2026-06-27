import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { randomUUID } from 'crypto';
import { PrismaService } from '../prisma/prisma.service';
import { AiService } from '../ai/ai.service';
import { StorageService } from '../storage/storage.service';
import {
  GRADING_SYSTEM,
  buildGradingUser,
  GradingResult,
} from '../ai/prompts/grading.prompt';

const ALLOWED: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
  'image/gif': 'gif',
};

@Injectable()
export class ExamResultsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly ai: AiService,
    private readonly storage: StorageService,
  ) {}

  /** Lưu ảnh bài làm → gọi AI Vision chấm → lưu ExamResult. */
  async grade(examId: string, files: Express.Multer.File[], model?: string) {
    if (!files?.length) {
      throw new BadRequestException('Cần tải lên ít nhất 1 ảnh bài làm.');
    }

    const exam = await this.prisma.exam.findUnique({ where: { id: examId } });
    if (!exam) throw new NotFoundException('Không tìm thấy đề kiểm tra');
    if (exam.status !== 'READY') {
      throw new BadRequestException('Đề chưa sẵn sàng để chấm.');
    }

    // Upload ảnh lên Cloudflare R2 + chuẩn bị dữ liệu cho Vision.
    const imageUrls: string[] = [];
    const images: { mediaType: string; dataBase64: string }[] = [];

    for (const file of files) {
      const ext = ALLOWED[file.mimetype];
      if (!ext) {
        throw new BadRequestException(
          `Định dạng ảnh không hỗ trợ: ${file.mimetype}`,
        );
      }
      const key = `exam-images/${randomUUID()}.${ext}`;
      const url = await this.storage.uploadBuffer(file.buffer, file.mimetype, key);
      imageUrls.push(url);
      images.push({
        mediaType: file.mimetype,
        dataBase64: file.buffer.toString('base64'),
      });
    }

    const student = await this.prisma.student.findUnique({
      where: { id: exam.studentId },
    });

    const result = await this.ai.completeJsonWithImages<GradingResult>({
      model,
      system: GRADING_SYSTEM,
      user: buildGradingUser({
        studentName: student?.name ?? 'Học sinh',
        gradeLevel: student?.gradeLevel ?? '',
        answerKey: exam.answerKeyJson,
      }),
      images,
    });

    return this.prisma.examResult.create({
      data: {
        examId,
        studentId: exam.studentId,
        imageUrls,
        scoreTotal: result.total ?? 0,
        maxScore: result.maxTotal ?? exam.totalPoints,
        scoreDetailJson: {
          multipleChoice: result.multipleChoice ?? [],
          essay: result.essay ?? [],
        } as unknown as Prisma.InputJsonValue,
        presentationNote: result.presentationNote ?? null,
        aiFeedback: result.feedback ?? null,
      },
    });
  }

  findByExam(examId: string) {
    return this.prisma.examResult.findMany({
      where: { examId },
      orderBy: { takenAt: 'desc' },
    });
  }

  async findOne(id: string) {
    const r = await this.prisma.examResult.findUnique({ where: { id } });
    if (!r) throw new NotFoundException('Không tìm thấy kết quả chấm');
    return r;
  }

  async remove(id: string) {
    await this.findOne(id);
    return this.prisma.examResult.delete({ where: { id } });
  }
}
