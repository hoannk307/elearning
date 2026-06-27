import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AiService } from '../ai/ai.service';
import {
  ASSESSMENT_SYSTEM,
  buildAssessmentUser,
  AssessmentResult,
} from '../ai/prompts/assessment.prompt';

/** Quy điểm về thang 10. */
function norm(score: number, max: number): number {
  if (!max) return 0;
  return Math.round((score / max) * 100) / 10;
}

function avg(nums: number[]): number | null {
  if (!nums.length) return null;
  return Math.round((nums.reduce((a, b) => a + b, 0) / nums.length) * 10) / 10;
}

@Injectable()
export class ReportsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly ai: AiService,
  ) {}

  /** Tổng quan dashboard cho các học sinh trong phạm vi truy cập. */
  async overview(studentIds: string[]) {
    const students = await this.prisma.student.findMany({
      where: { id: { in: studentIds } },
      orderBy: { createdAt: 'asc' },
      include: {
        _count: { select: { subjects: true } },
        examResults: { orderBy: { takenAt: 'desc' } },
        exerciseResults: { orderBy: { gradedAt: 'desc' } },
      },
    });

    return students.map((s) => {
      const examScores = s.examResults.map((r) => norm(r.scoreTotal, r.maxScore));
      const exScores = s.exerciseResults.map((r) => norm(r.score, r.maxScore));
      const latest = s.examResults[0];

      return {
        id: s.id,
        name: s.name,
        gradeLevel: s.gradeLevel,
        subjectsCount: s._count.subjects,
        examCount: s.examResults.length,
        exerciseCount: s.exerciseResults.length,
        avgExam: avg(examScores),
        avgExercise: avg(exScores),
        avgOverall: avg([...examScores, ...exScores]),
        latestExam: latest
          ? {
              score: norm(latest.scoreTotal, latest.maxScore),
              takenAt: latest.takenAt,
            }
          : null,
      };
    });
  }

  /** Báo cáo chi tiết 1 học sinh: timeline điểm + trung bình theo môn. */
  async studentDetail(studentId: string) {
    const student = await this.prisma.student.findUnique({
      where: { id: studentId },
      include: { subjects: true },
    });
    if (!student) throw new NotFoundException('Không tìm thấy học sinh');

    const [examResults, exerciseResults] = await Promise.all([
      this.prisma.examResult.findMany({
        where: { studentId },
        orderBy: { takenAt: 'asc' },
        include: { exam: { include: { subject: true } } },
      }),
      this.prisma.exerciseResult.findMany({
        where: { studentId },
        orderBy: { gradedAt: 'asc' },
        include: {
          exercise: {
            include: { session: { include: { subject: true } } },
          },
        },
      }),
    ]);

    // Timeline gộp (đã quy thang 10)
    const timeline = [
      ...examResults.map((r) => ({
        date: r.takenAt,
        type: 'exam' as const,
        label: r.exam.title,
        subject: r.exam.subject.name,
        score: norm(r.scoreTotal, r.maxScore),
      })),
      ...exerciseResults.map((r) => ({
        date: r.gradedAt,
        type: 'exercise' as const,
        label: r.exercise.session.title,
        subject: r.exercise.session.subject.name,
        score: norm(r.score, r.maxScore),
      })),
    ].sort((a, b) => +new Date(a.date) - +new Date(b.date));

    // Trung bình theo môn
    const bySubject = student.subjects.map((sub) => {
      const ex = examResults
        .filter((r) => r.exam.subjectId === sub.id)
        .map((r) => norm(r.scoreTotal, r.maxScore));
      const wk = exerciseResults
        .filter((r) => r.exercise.session.subjectId === sub.id)
        .map((r) => norm(r.score, r.maxScore));
      return {
        subjectId: sub.id,
        subjectName: sub.name,
        avgExam: avg(ex),
        avgExercise: avg(wk),
        avgOverall: avg([...ex, ...wk]),
      };
    });

    return {
      student: {
        id: student.id,
        name: student.name,
        gradeLevel: student.gradeLevel,
      },
      timeline,
      bySubject,
      examResults: examResults.map((r) => ({
        id: r.id,
        title: r.exam.title,
        subject: r.exam.subject.name,
        score: norm(r.scoreTotal, r.maxScore),
        scoreTotal: r.scoreTotal,
        maxScore: r.maxScore,
        presentationNote: r.presentationNote,
        aiFeedback: r.aiFeedback,
        takenAt: r.takenAt,
      })),
    };
  }

  /** AI đánh giá tổng hợp điểm mạnh/yếu + gợi ý. */
  async assessment(studentId: string, model?: string): Promise<AssessmentResult> {
    const detail = await this.studentDetail(studentId);
    if (!detail.timeline.length) {
      return {
        summary: 'Chưa có đủ dữ liệu điểm để đánh giá. Hãy nhập điểm bài tập hoặc chấm bài kiểm tra trước.',
        strengths: [],
        weaknesses: [],
        suggestions: [],
      };
    }

    return this.ai.completeJson<AssessmentResult>({
      model,
      system: ASSESSMENT_SYSTEM,
      user: buildAssessmentUser({
        studentName: detail.student.name,
        gradeLevel: detail.student.gradeLevel,
        data: { bySubject: detail.bySubject, timeline: detail.timeline },
      }),
    });
  }
}
