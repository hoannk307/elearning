import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job, UnrecoverableError } from 'bullmq';
import { PrismaService } from '../prisma/prisma.service';
import { AiService } from '../ai/ai.service';
import { classifyAiError } from '../ai/ai.errors';
import { EXAM_QUEUE, GenerateExamJob } from '../queue/queue.constants';
import {
  EXAM_SYSTEM,
  buildExamUser,
  GeneratedExam,
} from '../ai/prompts/exam.prompt';

@Processor(EXAM_QUEUE)
export class ExamProcessor extends WorkerHost {
  private readonly logger = new Logger(ExamProcessor.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly ai: AiService,
  ) {
    super();
  }

  async process(job: Job<GenerateExamJob>): Promise<void> {
    const { examId, model } = job.data;

    const exam = await this.prisma.exam.findUnique({
      where: { id: examId },
      include: {
        subject: true,
        student: { include: { parent: true } },
        sessions: { orderBy: { orderIndex: 'asc' } },
      },
    });
    if (!exam) {
      this.logger.warn(`Exam ${examId} không tồn tại, bỏ qua.`);
      return;
    }

    const parent = exam.student.parent;

    try {
      const gen = await this.ai.completeJson<GeneratedExam>({
        model,
        system: EXAM_SYSTEM,
        user: buildExamUser({
          subjectName: exam.subject.name,
          gradeLevel: exam.student.gradeLevel,
          sessions: exam.sessions.map((s) => ({
            title: s.title,
            content: s.content,
          })),
          mcCount: parent.examMcCount,
          essayCount: parent.examEssayCount,
        }),
      });

      const mc = gen.multipleChoice ?? [];
      const essay = gen.essay ?? [];
      if (!mc.length && !essay.length) {
        throw new Error('AI không tạo được câu hỏi nào.');
      }

      const totalPoints =
        [...mc, ...essay].reduce((s, q) => s + (q.points ?? 0), 0) || 10;

      const content = {
        multipleChoice: mc.map((q) => ({
          question: q.question,
          options: q.options,
          points: q.points,
        })),
        essay: essay.map((q) => ({ question: q.question, points: q.points })),
      };
      const answerKey = {
        multipleChoice: mc.map((q) => ({
          answer: q.answer,
          explanation: q.explanation,
          points: q.points,
        })),
        essay: essay.map((q) => ({ answer: q.answer, points: q.points })),
      };

      await this.prisma.exam.update({
        where: { id: examId },
        data: {
          title: gen.title || exam.title,
          contentJson: content,
          answerKeyJson: answerKey,
          totalPoints,
          status: 'READY',
          error: null,
        },
      });

      this.logger.log(
        `✅ Exam ${examId}: ${mc.length} trắc nghiệm + ${essay.length} tự luận.`,
      );
    } catch (err) {
      const aiErr = classifyAiError(err);
      this.logger.error(`❌ Exam ${examId} lỗi: ${aiErr.message}`);
      await this.prisma.exam.update({
        where: { id: examId },
        data: { status: 'FAILED', error: aiErr.userMessage },
      });
      if (!aiErr.retryable) throw new UnrecoverableError(aiErr.userMessage);
      throw aiErr;
    }
  }
}
