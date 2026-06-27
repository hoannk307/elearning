/** Prompt tạo bài tập cho 1 buổi học. */

export type QuestionType = 'multiple_choice' | 'short_answer' | 'essay';

export interface GeneratedQuestion {
  type: QuestionType;
  question: string;
  options?: string[]; // chỉ với multiple_choice
  answer: string; // đáp án đúng / gợi ý đáp án
  explanation?: string; // lời giải ngắn
  points: number;
}

export interface GeneratedExercise {
  title: string;
  instructions: string;
  questions: GeneratedQuestion[];
}

export const EXERCISE_SYSTEM = `Bạn là giáo viên giỏi, tạo bài tập cho học sinh Việt Nam học tại nhà.
Nhiệm vụ: dựa vào nội dung 1 buổi học, tạo bộ bài tập phù hợp cấp lớp.

Quy tắc:
- Tạo ĐÚNG số câu trắc nghiệm và số câu tự luận được yêu cầu (xem phần dưới). KHÔNG thiếu, KHÔNG thừa.
- Câu trắc nghiệm (type="multiple_choice"): 4 phương án trong "options", "answer" là nội dung phương án đúng.
- Câu tự luận (type="essay"): "answer" là đáp án mẫu/gợi ý chấm, không có "options".
- Độ khó vừa với cấp lớp, bám sát nội dung buổi học, không ra ngoài phạm vi.
- "points": điểm mỗi câu (tổng toàn bài nên khoảng 10).
- Dùng tiếng Việt, rõ ràng, thân thiện với trẻ.

CHỈ trả về JSON đúng định dạng, không thêm lời dẫn:
{
  "title": "...",
  "instructions": "...",
  "questions": [
    { "type": "multiple_choice", "question": "...", "options": ["A","B","C","D"], "answer": "...", "explanation": "...", "points": 1 },
    { "type": "essay", "question": "...", "answer": "...", "points": 2 }
  ]
}`;

export function buildExerciseUser(input: {
  subjectName: string;
  gradeLevel: string;
  sessionTitle: string;
  objective?: string | null;
  content?: string | null;
  mcCount: number;
  essayCount: number;
}): string {
  const total = input.mcCount + input.essayCount;
  return `Môn học: ${input.subjectName}
Cấp lớp: ${input.gradeLevel}
Buổi học: ${input.sessionTitle}
Mục tiêu: ${input.objective ?? '(không có)'}
Nội dung chính: ${input.content ?? '(không có)'}

YÊU CẦU SỐ LƯỢNG CÂU (bắt buộc tuân thủ chính xác):
- ${input.mcCount} câu trắc nghiệm (type="multiple_choice")
- ${input.essayCount} câu tự luận (type="essay")
- Tổng cộng ĐÚNG ${total} câu.

Hãy tạo bộ bài tập cho buổi học này và trả về JSON theo đúng định dạng đã yêu cầu.`;
}
