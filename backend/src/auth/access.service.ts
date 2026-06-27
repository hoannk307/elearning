import { ForbiddenException, Injectable } from '@nestjs/common';
import { Role } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { AuthUser } from './auth.types';

/**
 * Helper phân quyền dùng chung cho mọi module.
 * - PARENT chỉ truy cập học sinh của mình (Student.parentId === user.id).
 * - STUDENT chỉ truy cập dữ liệu của chính mình (studentId === user.id).
 */
@Injectable()
export class AccessService {
  constructor(private readonly prisma: PrismaService) {}

  /** Danh sách studentId mà người dùng được phép truy cập. */
  async accessibleStudentIds(user: AuthUser): Promise<string[]> {
    if (user.role === Role.STUDENT) return [user.id];
    const students = await this.prisma.student.findMany({
      where: { parentId: user.id },
      select: { id: true },
    });
    return students.map((s) => s.id);
  }

  /** Ném ForbiddenException nếu người dùng không được phép truy cập học sinh này. */
  async assertStudentAccess(user: AuthUser, studentId: string): Promise<void> {
    if (user.role === Role.STUDENT) {
      if (studentId !== user.id) throw this.denied();
      return;
    }
    const student = await this.prisma.student.findUnique({
      where: { id: studentId },
      select: { parentId: true },
    });
    if (!student || student.parentId !== user.id) throw this.denied();
  }

  async assertSubjectAccess(user: AuthUser, subjectId: string): Promise<void> {
    const subject = await this.prisma.subject.findUnique({
      where: { id: subjectId },
      select: { studentId: true },
    });
    if (!subject) throw this.denied();
    await this.assertStudentAccess(user, subject.studentId);
  }

  async assertSessionAccess(user: AuthUser, sessionId: string): Promise<void> {
    const session = await this.prisma.session.findUnique({
      where: { id: sessionId },
      select: { studentId: true },
    });
    if (!session) throw this.denied();
    await this.assertStudentAccess(user, session.studentId);
  }

  async assertCurriculumAccess(
    user: AuthUser,
    curriculumId: string,
  ): Promise<void> {
    const curriculum = await this.prisma.curriculum.findUnique({
      where: { id: curriculumId },
      select: { subject: { select: { studentId: true } } },
    });
    if (!curriculum) throw this.denied();
    await this.assertStudentAccess(user, curriculum.subject.studentId);
  }

  async assertExerciseAccess(user: AuthUser, exerciseId: string): Promise<void> {
    const exercise = await this.prisma.exercise.findUnique({
      where: { id: exerciseId },
      select: { studentId: true },
    });
    if (!exercise) throw this.denied();
    await this.assertStudentAccess(user, exercise.studentId);
  }

  async assertExamAccess(user: AuthUser, examId: string): Promise<void> {
    const exam = await this.prisma.exam.findUnique({
      where: { id: examId },
      select: { studentId: true },
    });
    if (!exam) throw this.denied();
    await this.assertStudentAccess(user, exam.studentId);
  }

  private denied(): ForbiddenException {
    return new ForbiddenException('Bạn không có quyền truy cập dữ liệu này');
  }
}
