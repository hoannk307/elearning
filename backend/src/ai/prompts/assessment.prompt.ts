/** Prompt đánh giá tổng hợp năng lực học sinh từ điểm bài tập + kiểm tra. */

export interface AssessmentResult {
  summary: string; // nhận xét tổng quan
  strengths: string[]; // điểm mạnh
  weaknesses: string[]; // điểm cần cải thiện
  suggestions: string[]; // gợi ý cụ thể
}

export const ASSESSMENT_SYSTEM = `Bạn là cố vấn học tập thân thiện cho phụ huynh Việt Nam.
Dựa trên dữ liệu điểm bài tập từng buổi và các đợt kiểm tra, hãy đưa ra đánh giá tổng hợp về học sinh.

Quy tắc:
- Giọng tích cực, động viên, nhưng trung thực.
- Phân tích theo môn nếu có nhiều môn.
- Nêu điểm mạnh, điểm cần cải thiện, và gợi ý cụ thể, khả thi tại nhà.
- Ngắn gọn, dễ hiểu với phụ huynh.

CHỈ trả về JSON đúng định dạng, không thêm lời dẫn:
{
  "summary": "...",
  "strengths": ["..."],
  "weaknesses": ["..."],
  "suggestions": ["..."]
}`;

export function buildAssessmentUser(input: {
  studentName: string;
  gradeLevel: string;
  data: unknown;
}): string {
  return `Học sinh: ${input.studentName} (${input.gradeLevel})

Dữ liệu điểm (JSON — gồm điểm bài tập theo buổi và các đợt kiểm tra, đã quy về thang 10):
${JSON.stringify(input.data, null, 2)}

Hãy đánh giá tổng hợp và trả về JSON theo đúng định dạng đã yêu cầu.`;
}
