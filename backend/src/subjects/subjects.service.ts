import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateSubjectDto, UpdateSubjectDto } from './dto/subject.dto';

@Injectable()
export class SubjectsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateSubjectDto) {
    const student = await this.prisma.student.findUnique({
      where: { id: dto.studentId },
    });
    if (!student) throw new NotFoundException('Không tìm thấy học sinh');
    return this.prisma.subject.create({ data: dto });
  }

  findAll(studentId?: string) {
    return this.prisma.subject.findMany({
      where: studentId ? { studentId } : undefined,
      orderBy: { createdAt: 'asc' },
      include: {
        _count: { select: { curriculums: true, sessions: true, exams: true } },
      },
    });
  }

  findAllByStudentIds(studentIds: string[]) {
    return this.prisma.subject.findMany({
      where: { studentId: { in: studentIds } },
      orderBy: { createdAt: 'asc' },
      include: {
        _count: { select: { curriculums: true, sessions: true, exams: true } },
      },
    });
  }

  async findOne(id: string) {
    const subject = await this.prisma.subject.findUnique({
      where: { id },
      include: {
        student: true,
        curriculums: { orderBy: { createdAt: 'desc' } },
        _count: { select: { sessions: true } },
      },
    });
    if (!subject) throw new NotFoundException('Không tìm thấy môn học');
    return subject;
  }

  async update(id: string, dto: UpdateSubjectDto) {
    await this.findOne(id);
    return this.prisma.subject.update({ where: { id }, data: dto });
  }

  async remove(id: string) {
    await this.findOne(id);
    return this.prisma.subject.delete({ where: { id } });
  }
}
