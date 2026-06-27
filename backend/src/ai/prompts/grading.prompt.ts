/** Prompt chấm bài làm (ảnh) bằng Claude Vision dựa trên đáp án gốc. */

export interface GradedMc {
  index: number; // số thứ tự câu (bắt đầu từ 1)
  studentAnswer: string;
  correct: boolean;
  awarded: number;
  max: number;
}

export interface GradedEssay {
  index: number;
  awarded: number;
  max: number;
  comment: string; // nhận xét nội dung + cách trình bày câu này
}

export interface GradingResult {
  multipleChoice: GradedMc[];
  essay: GradedEssay[];
  presentationNote: string; // nhận xét chung về cách trình bày (dựa phần tự luận)
  total: number;
  maxTotal: number;
  feedback: string; // nhận xét tổng hợp + gợi ý cải thiện
}

export const GRADING_SYSTEM = `Bạn là giáo viên chấm bài cho học sinh Việt Nam.
Bạn nhận ẢNH bài làm của học sinh và ĐÁP ÁN GỐC. Hãy chấm điểm công bằng, khích lệ.

Quy tắc:
- Đọc kỹ bài làm trong ảnh, đối chiếu với đáp án từng câu.
- Trắc nghiệm: đúng = đủ điểm câu đó, sai = 0. Ghi "studentAnswer" là phương án bé chọn.
- Tự luận: cho điểm theo mức độ đúng/đủ ý so với barem; "comment" nhận xét nội dung và cách trình bày.
- "presentationNote": nhận xét chung về cách trình bày (chữ viết, bố cục, trình bày lời giải) — dựa vào phần tự luận.
- "feedback": nhận xét tổng hợp, nêu điểm mạnh/yếu và gợi ý cải thiện, giọng động viên.
- "total" = tổng điểm đạt được; "maxTotal" = tổng điểm tối đa của đề.
- Nếu không đọc được câu nào, cho 0 điểm và ghi rõ trong comment.

CHỈ trả về JSON đúng định dạng, không thêm lời dẫn:
{
  "multipleChoice": [ { "index": 1, "studentAnswer": "B", "correct": true, "awarded": 0.5, "max": 0.5 } ],
  "essay": [ { "index": 1, "awarded": 1.5, "max": 2, "comment": "..." } ],
  "presentationNote": "...",
  "total": 8.5,
  "maxTotal": 10,
  "feedback": "..."
}`;

export function buildGradingUser(input: {
  studentName: string;
  gradeLevel: string;
  answerKey: unknown;
}): string {
  return `Học sinh: ${input.studentName} (${input.gradeLevel})

ĐÁP ÁN GỐC (JSON, gồm trắc nghiệm và tự luận kèm điểm):
${JSON.stringify(input.answerKey, null, 2)}

Các ảnh kèm theo là bài làm của học sinh. Hãy chấm điểm và trả về JSON theo đúng định dạng đã yêu cầu.`;
}
