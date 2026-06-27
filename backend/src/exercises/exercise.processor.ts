import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job, UnrecoverableError } from 'bullmq';
import { PrismaService } from '../prisma/prisma.service';
import { AiService } from '../ai/ai.service';
import { classifyAiError } from '../ai/ai.errors';
import {
  EXERCISE_QUEUE,
  GenerateExerciseJob,
} from '../queue/queue.constants';
import {
  EXERCISE_SYSTEM,
  buildExerciseUser,
  GeneratedExercise,
} from '../ai/prompts/exercise.prompt';

@Processor(EXERCISE_QUEUE)
export class ExerciseProcessor extends WorkerHost {
  private readonly logger = new Logger(ExerciseProcessor.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly ai: AiService,
  ) {
    super();
  }

  async process(job: Job<GenerateExerciseJob>): Promise<void> {
    const { exerciseId, model } = job.data;

    const exercise = await this.prisma.exercise.findUnique({
      where: { id: exerciseId },
      include: {
        session: {
          include: { subject: { include: { student: { include: { parent: true } } } } },
        },
      },
    });
    if (!exercise) {
      this.logger.warn(`Exercise ${exerciseId} không tồn tại, bỏ qua.`);
      return;
    }

    const parent = exercise.session.subject.student.parent;

    try {
      const gen = await this.ai.completeJson<GeneratedExercise>({
        model,
        system: EXERCISE_SYSTEM,
        user: buildExerciseUser({
          subjectName: exercise.session.subject.name,
          gradeLevel: exercise.session.subject.student.gradeLevel,
          sessionTitle: exercise.session.title,
          objective: exercise.session.objective,
          content: exercise.session.content,
          mcCount: parent.exerciseMcCount,
          essayCount: parent.exerciseEssayCount,
        }),
      });

      if (!gen.questions?.length) throw new Error('AI không tạo được câu hỏi.');

      // Tách nội dung (in cho bé) và đáp án (cho phụ huynh).
      const content = {
        instructions: gen.instructions,
        questions: gen.questions.map((q) => ({
          type: q.type,
          question: q.question,
          options: q.options,
          points: q.points,
        })),
      };
      const answerKey = {
        questions: gen.questions.map((q) => ({
          answer: q.answer,
          explanation: q.explanation,
        })),
      };

      await this.prisma.exercise.update({
        where: { id: exerciseId },
        data: {
          title: gen.title,
          contentJson: content,
          answerKeyJson: answerKey,
          status: 'READY',
          error: null,
        },
      });

      this.logger.log(
        `✅ Exercise ${exerciseId}: tạo ${gen.questions.length} câu.`,
      );
    } catch (err) {
      const aiErr = classifyAiError(err);
      this.logger.error(`❌ Exercise ${exerciseId} lỗi: ${aiErr.message}`);
      await this.prisma.exercise.update({
        where: { id: exerciseId },
        data: { status: 'FAILED', error: aiErr.userMessage },
      });
      if (!aiErr.retryable) throw new UnrecoverableError(aiErr.userMessage);
      throw aiErr;
    }
  }
}
