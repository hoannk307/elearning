/** Tên các queue BullMQ dùng trong hệ thống. */
export const CURRICULUM_QUEUE = 'curriculum';
export const EXERCISE_QUEUE = 'exercise';
export const EXAM_QUEUE = 'exam';

/** Job: parse 1 curriculum thành các Session. */
export interface ParseCurriculumJob {
  curriculumId: string;
  /** Model AI chọn cho lần này (bỏ trống = dùng model mặc định). */
  model?: string;
}

/** Job: tạo bài tập (AI) cho 1 Session. */
export interface GenerateExerciseJob {
  exerciseId: string;
  model?: string;
}

/** Job: tạo đề kiểm tra (AI) tổng hợp các Session. */
export interface GenerateExamJob {
  examId: string;
  model?: string;
}
