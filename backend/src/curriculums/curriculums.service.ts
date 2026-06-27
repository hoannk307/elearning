import { InjectQueue } from '@nestjs/bullmq';
import { Injectable, NotFoundException } from '@nestjs/common';
import { Queue } from 'bullmq';
import { PrismaService } from '../prisma/prisma.service';
import {
  CURRICULUM_QUEUE,
  ParseCurriculumJob,
} from '../queue/queue.constants';
import { CreateCurriculumDto } from './dto/curriculum.dto';

@Injectable()
export class CurriculumsService {
  constructor(
    private readonly prisma: PrismaService,
    @InjectQueue(CURRICULUM_QUEUE)
    private readonly queue: Queue<ParseCurriculumJob>,
  ) {}

  /** Tạo curriculum (status PARSING) rồi đẩy job parse vào queue. */
  async create(dto: CreateCurriculumDto) {
    const subject = await this.prisma.subject.findUnique({
      where: { id: dto.subjectId },
    });
    if (!subject) throw new NotFoundException('Không tìm thấy môn học');

    const curriculum = await this.prisma.curriculum.create({
      data: {
        subjectId: dto.subjectId,
        rawText: dto.rawText,
        status: 'PARSING',
      },
    });

    await this.queue.add('parse', { curriculumId: curriculum.id, model: dto.model });

    return curriculum;
  }

  /** Trạng thái + các buổi học đã tạo (frontend polling cái này). */
  async findOne(id: string) {
    const curriculum = await this.prisma.curriculum.findUnique({
      where: { id },
      include: {
        sessions: { orderBy: { orderIndex: 'asc' } },
        subject: { include: { student: true } },
      },
    });
    if (!curriculum) throw new NotFoundException('Không tìm thấy chương trình');
    return curriculum;
  }

  findBySubject(subjectId: string) {
    return this.prisma.curriculum.findMany({
      where: { subjectId },
      orderBy: { createdAt: 'desc' },
      include: { _count: { select: { sessions: true } } },
    });
  }

  /** Chạy lại job parse (vd khi lần trước FAILED). */
  async reparse(id: string, model?: string) {
    await this.findOne(id);
    await this.prisma.curriculum.update({
      where: { id },
      data: { status: 'PARSING', aiParsed: false, error: null },
    });
    await this.queue.add('parse', { curriculumId: id, model });
    return { ok: true };
  }

  /** Xoá chương trình — cascade xoá toàn bộ buổi học (và bài tập/đề liên quan). */
  async remove(id: string) {
    await this.findOne(id);
    return this.prisma.curriculum.delete({ where: { id } });
  }
}
