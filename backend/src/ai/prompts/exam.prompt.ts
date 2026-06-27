/** Prompt tạo đề kiểm tra tổng hợp từ các buổi đã học. */

export interface GeneratedMcQuestion {
  question: string;
  options: string[];
  answer: string; // nội dung phương án đúng
  explanation?: string;
  points: number;
}

export interface GeneratedEssayQuestion {
  question: string;
  answer: string; // đáp án mẫu / barem chấm
  points: number;
}

export interface GeneratedExam {
  title: string;
  multipleChoice: GeneratedMcQuestion[];
  essay: GeneratedEssayQuestion[];
}

export const EXAM_SYSTEM = `Bạn là giáo viên ra đề kiểm tra cho học sinh Việt Nam học tại nhà.
Nhiệm vụ: tạo MỘT đề kiểm tra TỔNG HỢP dựa trên danh sách các buổi học đã học.

Quy tắc:
- Kết hợp 2 phần: trắc nghiệm (multipleChoice) và tự luận (essay).
- Tạo ĐÚNG số câu trắc nghiệm và số câu tự luận được yêu cầu (xem phần dưới). KHÔNG thiếu, KHÔNG thừa.
- Trắc nghiệm: mỗi câu 4 phương án trong "options", "answer" là nội dung phương án đúng.
- Tự luận: "answer" là đáp án mẫu/barem để phụ huynh chấm; phần tự luận dùng để đánh giá cách trình bày.
- Bao quát nhiều buổi học, độ khó phù hợp cấp lớp.
- "points": điểm mỗi câu; TỔNG điểm toàn đề nên bằng 10.
- Tiếng Việt rõ ràng.

CHỈ trả về JSON đúng định dạng, không thêm lời dẫn:
{
  "title": "Kiểm tra tổng hợp",
  "multipleChoice": [
    { "question": "...", "options": ["A","B","C","D"], "answer": "...", "explanation": "...", "points": 0.5 }
  ],
  "essay": [
    { "question": "...", "answer": "...", "points": 2 }
  ]
}`;

export function buildExamUser(input: {
  subjectName: string;
  gradeLevel: string;
  sessions: { title: string; content?: string | null }[];
  mcCount: number;
  essayCount: number;
}): string {
  const list = input.sessions
    .map((s, i) => `${i + 1}. ${s.title}${s.content ? ` — ${s.content}` : ''}`)
    .join('\n');
  return `Môn học: ${input.subjectName}
Cấp lớp: ${input.gradeLevel}

Các buổi học đã học (tổng hợp vào đề):
${list}

YÊU CẦU SỐ LƯỢNG CÂU (bắt buộc tuân thủ chính xác):
- ${input.mcCount} câu trắc nghiệm (multipleChoice)
- ${input.essayCount} câu tự luận (essay)

Hãy tạo đề kiểm tra tổng hợp và trả về JSON theo đúng định dạng đã yêu cầu.`;
}
