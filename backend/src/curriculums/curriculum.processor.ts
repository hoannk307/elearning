import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job, UnrecoverableError } from 'bullmq';
import { PrismaService } from '../prisma/prisma.service';
import { AiService } from '../ai/ai.service';
import { classifyAiError } from '../ai/ai.errors';
import {
  CURRICULUM_QUEUE,
  ParseCurriculumJob,
} from '../queue/queue.constants';
import {
  CURRICULUM_PARSE_SYSTEM,
  buildCurriculumParseUser,
  ParsedSession,
} from '../ai/prompts/curriculum.prompt';

/**
 * Worker xử lý ngầm: lấy curriculum → gọi Claude tách thành buổi học →
 * tạo các Session trong DB → cập nhật status PARSED. Lỗi thì set FAILED.
 */
@Processor(CURRICULUM_QUEUE)
export class CurriculumProcessor extends WorkerHost {
  private readonly logger = new Logger(CurriculumProcessor.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly ai: AiService,
  ) {
    super();
  }

  async process(job: Job<ParseCurriculumJob>): Promise<void> {
    const { curriculumId, model } = job.data;
    this.logger.log(`Parse curriculum ${curriculumId}...`);

    const curriculum = await this.prisma.curriculum.findUnique({
      where: { id: curriculumId },
      include: { subject: { include: { student: true } } },
    });
    if (!curriculum) {
      this.logger.warn(`Curriculum ${curriculumId} không tồn tại, bỏ qua.`);
      return;
    }

    try {
      const { sessions } = await this.ai.completeJson<{
        sessions: ParsedSession[];
      }>({
        model,
        system: CURRICULUM_PARSE_SYSTEM,
        user: buildCurriculumParseUser({
          subjectName: curriculum.subject.name,
          gradeLevel: curriculum.subject.student.gradeLevel,
          rawText: curriculum.rawText,
        }),
      });

      if (!Array.isArray(sessions) || sessions.length === 0) {
        throw new Error('AI không trả về buổi học nào.');
      }

      // Tạo Session + cập nhật curriculum trong 1 transaction.
      await this.prisma.$transaction([
        this.prisma.session.createMany({
          data: sessions.map((s, i) => ({
            curriculumId: curriculum.id,
            subjectId: curriculum.subjectId,
            studentId: curriculum.subject.studentId,
            title: s.title?.trim() || `Buổi ${i + 1}`,
            objective: s.objective?.trim() || null,
            content: s.content?.trim() || null,
            orderIndex: i,
          })),
        }),
        this.prisma.curriculum.update({
          where: { id: curriculum.id },
          data: { status: 'PARSED', aiParsed: true, error: null },
        }),
      ]);

      this.logger.log(
        `✅ Curriculum ${curriculumId}: tạo ${sessions.length} buổi học.`,
      );
    } catch (err) {
      const aiErr = classifyAiError(err);
      this.logger.error(`❌ Parse curriculum ${curriculumId} lỗi: ${aiErr.message}`);

      // Còn lượt retry cho lỗi tạm thời → giữ PARSING để UI không nhấp nháy
      // "Thất bại" giữa các lần thử; chỉ đánh dấu FAILED khi đã hết lượt.
      const lastAttempt = job.attemptsMade + 1 >= (job.opts.attempts ?? 1);
      if (aiErr.retryable && !lastAttempt) {
        throw aiErr; // lỗi tạm thời, còn lượt → để BullMQ retry theo cấu hình
      }

      await this.prisma.curriculum.update({
        where: { id: curriculum.id },
        data: { status: 'FAILED', error: aiErr.userMessage },
      });
      // Lỗi không thể tự khỏi (hết credit, sai key...) → dừng hẳn, khỏi retry vô ích.
      if (!aiErr.retryable) throw new UnrecoverableError(aiErr.userMessage);
      throw aiErr; // đã hết lượt retry → để BullMQ kết thúc job ở trạng thái failed
    }
  }
}
