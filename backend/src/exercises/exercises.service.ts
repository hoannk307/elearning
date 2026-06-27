import { InjectQueue } from '@nestjs/bullmq';
import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Queue } from 'bullmq';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { PdfService } from '../pdf/pdf.service';
import { AiService } from '../ai/ai.service';
import {
  EXERCISE_QUEUE,
  GenerateExerciseJob,
} from '../queue/queue.constants';
import {
  buildExerciseHtml,
  WorksheetData,
  WorksheetQuestion,
} from '../pdf/templates/exercise.template';
import {
  EXERCISE_GRADING_SYSTEM,
  buildExerciseGradingUser,
  ExerciseGradingResult,
} from '../ai/prompts/exercise-grading.prompt';

const exerciseWithRelations = {
  session: { include: { subject: { include: { student: true } } } },
} satisfies Prisma.ExerciseInclude;

@Injectable()
export class ExercisesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly pdf: PdfService,
    private readonly ai: AiService,
    @InjectQueue(EXERCISE_QUEUE)
    private readonly queue: Queue<GenerateExerciseJob>,
  ) {}

  /** Tạo bản ghi Exercise (GENERATING) rồi đẩy job AI tạo nội dung. */
  async generate(sessionId: string, model?: string) {
    const session = await this.prisma.session.findUnique({
      where: { id: sessionId },
    });
    if (!session) throw new NotFoundException('Không tìm thấy buổi học');

    const exercise = await this.prisma.exercise.create({
      data: {
        sessionId,
        studentId: session.studentId,
        contentJson: {},
        status: 'GENERATING',
      },
    });

    await this.queue.add('generate', { exerciseId: exercise.id, model });
    return exercise;
  }

  findBySession(sessionId: string) {
    return this.prisma.exercise.findMany({
      where: { sessionId },
      orderBy: { createdAt: 'desc' },
      include: { results: { orderBy: { gradedAt: 'desc' } } },
    });
  }

  /** Phụ huynh nhập điểm bài tập sau khi bé làm xong. */
  async recordResult(
    exerciseId: string,
    data: { score: number; maxScore?: number; note?: string },
  ) {
    const exercise = await this.findOne(exerciseId);
    return this.prisma.exerciseResult.create({
      data: {
        exerciseId,
        sessionId: exercise.sessionId,
        studentId: exercise.studentId,
        score: data.score,
        maxScore: data.maxScore ?? 10,
        note: data.note,
      },
    });
  }

  /**
   * Học sinh nộp bài làm trên máy → AI chấm (đồng bộ) → lưu ExerciseResult.
   * Trả về kết quả chi tiết để hiển thị ngay.
   */
  async submit(exerciseId: string, answers: string[], model?: string) {
    const exercise = await this.findOne(exerciseId);
    if (exercise.status !== 'READY') {
      throw new BadRequestException('Bài tập chưa sẵn sàng để làm.');
    }

    const content = (exercise.contentJson ?? {}) as {
      questions?: WorksheetQuestion[];
    };
    const student = exercise.session.subject.student;

    const result = await this.ai.completeJson<ExerciseGradingResult>({
      model,
      system: EXERCISE_GRADING_SYSTEM,
      user: buildExerciseGradingUser({
        studentName: student.name,
        gradeLevel: student.gradeLevel,
        questions: content.questions ?? [],
        answerKey: exercise.answerKeyJson ?? {},
        studentAnswers: answers,
      }),
    });

    await this.prisma.exerciseResult.create({
      data: {
        exerciseId,
        sessionId: exercise.sessionId,
        studentId: exercise.studentId,
        score: result.total ?? 0,
        maxScore: result.maxTotal ?? 10,
        answersJson: answers as unknown as Prisma.InputJsonValue,
        detailJson: {
          items: result.items ?? [],
        } as unknown as Prisma.InputJsonValue,
        aiFeedback: result.feedback ?? null,
        source: 'STUDENT_AI',
      },
    });

    return result;
  }

  async findOne(id: string) {
    const exercise = await this.prisma.exercise.findUnique({
      where: { id },
      include: exerciseWithRelations,
    });
    if (!exercise) throw new NotFoundException('Không tìm thấy bài tập');
    return exercise;
  }

  async regenerate(id: string, model?: string) {
    await this.findOne(id);
    await this.prisma.exercise.update({
      where: { id },
      data: { status: 'GENERATING', error: null },
    });
    await this.queue.add('generate', { exerciseId: id, model });
    return { ok: true };
  }

  async remove(id: string) {
    await this.findOne(id);
    return this.prisma.exercise.delete({ where: { id } });
  }

  /** Sinh PDF (Buffer) — withAnswers=false: phiếu làm bài; true: bản đáp án. */
  async renderPdf(id: string, withAnswers: boolean): Promise<Buffer> {
    const exercise = await this.findOne(id);
    if (exercise.status !== 'READY') {
      throw new NotFoundException('Bài tập chưa tạo xong, chưa thể xuất PDF');
    }
    const data = this.toWorksheet(exercise, withAnswers);
    return this.pdf.renderToBuffer(buildExerciseHtml(data));
  }

  /** Gộp contentJson + answerKeyJson thành dữ liệu cho template. */
  private toWorksheet(
    exercise: Prisma.ExerciseGetPayload<{ include: typeof exerciseWithRelations }>,
    withAnswers: boolean,
  ): WorksheetData {
    const content = (exercise.contentJson ?? {}) as {
      instructions?: string;
      questions?: WorksheetQuestion[];
    };
    const key = (exercise.answerKeyJson ?? {}) as {
      questions?: { answer?: string; explanation?: string }[];
    };

    const questions: WorksheetQuestion[] = (content.questions ?? []).map(
      (q, i) => ({
        ...q,
        answer: withAnswers ? key.questions?.[i]?.answer : undefined,
        explanation: withAnswers ? key.questions?.[i]?.explanation : undefined,
      }),
    );

    return {
      title: exercise.title ?? exercise.session.title,
      subjectName: exercise.session.subject.name,
      studentName: exercise.session.subject.student.name,
      gradeLevel: exercise.session.subject.student.gradeLevel,
      instructions: content.instructions,
      questions,
      showAnswers: withAnswers,
    };
  }
}
