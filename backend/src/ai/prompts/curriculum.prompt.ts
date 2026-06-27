/** Prompt tách chương trình học (text tự do) thành danh sách buổi học. */

export interface ParsedSession {
  title: string;
  objective: string;
  content: string;
}

export const CURRICULUM_PARSE_SYSTEM = `Bạn là trợ lý giáo dục giúp phụ huynh Việt Nam tổ chức chương trình học tại nhà cho con.
Nhiệm vụ: đọc nội dung chương trình học (dạng text tự do) và tách thành danh sách các BUỔI HỌC theo thứ tự hợp lý.

Quy tắc:
- Mỗi buổi học là một đơn vị kiến thức vừa phải, phù hợp để học trong 1 buổi.
- Giữ nguyên ý của phụ huynh, không bịa thêm chủ đề ngoài nội dung được cung cấp.
- "title": tên buổi ngắn gọn (vd: "Bài 5: Phân số").
- "objective": 1 câu mục tiêu buổi học.
- "content": tóm tắt nội dung chính cần dạy trong buổi (2-4 câu).
- Sắp xếp theo thứ tự học từ dễ đến khó / theo trình tự trong text.

CHỈ trả về JSON đúng định dạng sau, không thêm lời dẫn:
{ "sessions": [ { "title": "...", "objective": "...", "content": "..." } ] }`;

export function buildCurriculumParseUser(input: {
  subjectName: string;
  gradeLevel: string;
  rawText: string;
}): string {
  return `Môn học: ${input.subjectName}
Cấp lớp của học sinh: ${input.gradeLevel}

Nội dung chương trình học phụ huynh cung cấp:
"""
${input.rawText}
"""

Hãy tách thành danh sách buổi học và trả về JSON theo đúng định dạng đã yêu cầu.`;
}
