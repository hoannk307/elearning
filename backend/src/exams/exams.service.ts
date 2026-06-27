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
import { EXAM_QUEUE, GenerateExamJob } from '../queue/queue.constants';
import { CreateExamDto } from './dto/exam.dto';
import {
  buildExamHtml,
  ExamData,
  ExamEssay,
  ExamMc,
} from '../pdf/templates/exam.template';

const examWithRelations = {
  student: true,
  subject: true,
  sessions: { orderBy: { orderIndex: 'asc' } },
} satisfies Prisma.ExamInclude;

@Injectable()
export class ExamsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly pdf: PdfService,
    @InjectQueue(EXAM_QUEUE) private readonly queue: Queue<GenerateExamJob>,
  ) {}

  /** Tạo đề: gom các buổi (mặc định lấy buổi đã học) rồi đẩy job AI sinh đề. */
  async create(dto: CreateExamDto) {
    const subject = await this.prisma.subject.findUnique({
      where: { id: dto.subjectId },
    });
    if (!subject) throw new NotFoundException('Không tìm thấy môn học');

    // Xác định danh sách buổi đưa vào đề.
    let sessionIds = dto.sessionIds;
    if (!sessionIds?.length) {
      const done = await this.prisma.session.findMany({
        where: { subjectId: dto.subjectId, status: 'DONE' },
        select: { id: true },
      });
      sessionIds = done.map((s) => s.id);
      // Nếu chưa đánh dấu buổi nào "đã học", dùng tất cả buổi của môn.
      if (!sessionIds.length) {
        const all = await this.prisma.session.findMany({
          where: { subjectId: dto.subjectId },
          select: { id: true },
        });
        sessionIds = all.map((s) => s.id);
      }
    }
    if (!sessionIds.length) {
      throw new BadRequestException(
        'Môn học chưa có buổi học nào để tạo đề kiểm tra.',
      );
    }

    const count = await this.prisma.exam.count({
      where: { subjectId: dto.subjectId },
    });

    const exam = await this.prisma.exam.create({
      data: {
        studentId: dto.studentId,
        subjectId: dto.subjectId,
        title: dto.title ?? `Kiểm tra tổng hợp #${count + 1}`,
        kind: dto.kind ?? 'CUSTOM',
        contentJson: {},
        answerKeyJson: {},
        status: 'GENERATING',
        sessions: { connect: sessionIds.map((id) => ({ id })) },
      },
    });

    await this.queue.add('generate', { examId: exam.id, model: dto.model });
    return exam;
  }

  findBySubject(subjectId: string) {
    return this.prisma.exam.findMany({
      where: { subjectId },
      orderBy: { createdAt: 'desc' },
      include: { _count: { select: { sessions: true, results: true } } },
    });
  }

  async findOne(id: string) {
    const exam = await this.prisma.exam.findUnique({
      where: { id },
      include: {
        ...examWithRelations,
        results: { orderBy: { takenAt: 'desc' } },
      },
    });
    if (!exam) throw new NotFoundException('Không tìm thấy đề kiểm tra');
    return exam;
  }

  async regenerate(id: string, model?: string) {
    await this.findOne(id);
    await this.prisma.exam.update({
      where: { id },
      data: { status: 'GENERATING', error: null },
    });
    await this.queue.add('generate', { examId: id, model });
    return { ok: true };
  }

  async remove(id: string) {
    await this.findOne(id);
    return this.prisma.exam.delete({ where: { id } });
  }

  /** PDF đề thi (withAnswers=false) hoặc bản đáp án (true). */
  async renderPdf(id: string, withAnswers: boolean): Promise<Buffer> {
    const exam = await this.findOne(id);
    if (exam.status !== 'READY') {
      throw new BadRequestException('Đề chưa tạo xong, chưa thể xuất PDF');
    }

    const content = (exam.contentJson ?? {}) as {
      multipleChoice?: ExamMc[];
      essay?: ExamEssay[];
    };
    const key = (exam.answerKeyJson ?? {}) as {
      multipleChoice?: { answer?: string; explanation?: string }[];
      essay?: { answer?: string }[];
    };

    const data: ExamData = {
      title: exam.title,
      subjectName: exam.subject.name,
      studentName: exam.student.name,
      gradeLevel: exam.student.gradeLevel,
      totalPoints: exam.totalPoints,
      multipleChoice: (content.multipleChoice ?? []).map((q, i) => ({
        ...q,
        answer: withAnswers ? key.multipleChoice?.[i]?.answer : undefined,
        explanation: withAnswers ? key.multipleChoice?.[i]?.explanation : undefined,
      })),
      essay: (content.essay ?? []).map((q, i) => ({
        ...q,
        answer: withAnswers ? key.essay?.[i]?.answer : undefined,
      })),
      showAnswers: withAnswers,
    };

    return this.pdf.renderToBuffer(buildExamHtml(data));
  }
}
