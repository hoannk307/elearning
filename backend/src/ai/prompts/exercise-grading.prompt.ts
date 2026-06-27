/**
 * Prompt chấm bài tập học sinh làm TRỰC TIẾP TRÊN MÁY (đáp án dạng text, không ảnh).
 * Trắc nghiệm: đối chiếu đáp án. Tự luận / trả lời ngắn: AI chấm theo barem.
 */

export interface GradedExerciseItem {
  index: number; // số thứ tự câu (bắt đầu từ 1)
  awarded: number; // điểm đạt được
  max: number; // điểm tối đa của câu
  correct?: boolean; // với câu trắc nghiệm
  comment: string; // nhận xét ngắn cho câu này
}

export interface ExerciseGradingResult {
  items: GradedExerciseItem[];
  total: number;
  maxTotal: number;
  feedback: string; // nhận xét tổng hợp, giọng động viên
}

export const EXERCISE_GRADING_SYSTEM = `Bạn là giáo viên chấm bài cho học sinh Việt Nam.
Học sinh làm bài tập trực tiếp trên máy. Bạn nhận ĐỀ BÀI, ĐÁP ÁN GỐC và BÀI LÀM (câu trả lời học sinh gõ).
Hãy chấm điểm công bằng, khích lệ.

Quy tắc:
- Đối chiếu từng câu theo thứ tự (index bắt đầu từ 1).
- Trắc nghiệm: đúng = đủ điểm câu đó (correct=true), sai = 0 (correct=false).
- Trả lời ngắn / tự luận: cho điểm theo mức độ đúng/đủ ý so với đáp án; "comment" nêu lý do.
- Nếu học sinh bỏ trống một câu: 0 điểm, ghi rõ trong comment.
- "max" lấy theo "points" của câu trong đề (nếu không có, mặc định 1).
- "total" = tổng điểm đạt; "maxTotal" = tổng điểm tối đa.
- "feedback": nhận xét tổng hợp, nêu điểm mạnh/yếu và gợi ý cải thiện, giọng động viên.

CHỈ trả về JSON đúng định dạng, không thêm lời dẫn:
{
  "items": [ { "index": 1, "awarded": 1, "max": 1, "correct": true, "comment": "..." } ],
  "total": 8,
  "maxTotal": 10,
  "feedback": "..."
}`;

export function buildExerciseGradingUser(input: {
  studentName: string;
  gradeLevel: string;
  questions: unknown;
  answerKey: unknown;
  studentAnswers: string[];
}): string {
  return `Học sinh: ${input.studentName} (${input.gradeLevel})

ĐỀ BÀI (JSON các câu hỏi, kèm "points" nếu có):
${JSON.stringify(input.questions, null, 2)}

ĐÁP ÁN GỐC (JSON, theo thứ tự câu):
${JSON.stringify(input.answerKey, null, 2)}

BÀI LÀM CỦA HỌC SINH (mảng theo thứ tự câu, phần tử rỗng = bỏ trống):
${JSON.stringify(input.studentAnswers, null, 2)}

Hãy chấm điểm và trả về JSON theo đúng định dạng đã yêu cầu.`;
}
