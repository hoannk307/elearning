import { esc, htmlDoc } from './base';

export interface ExamMc {
  question: string;
  options?: string[];
  answer?: string; // chỉ khi showAnswers
  explanation?: string;
  points?: number;
}

export interface ExamEssay {
  question: string;
  answer?: string; // chỉ khi showAnswers
  points?: number;
}

export interface ExamData {
  title: string;
  subjectName: string;
  studentName: string;
  gradeLevel: string;
  totalPoints?: number;
  multipleChoice: ExamMc[];
  essay: ExamEssay[];
  showAnswers?: boolean; // false: bản thi | true: bản đáp án (cho phụ huynh)
}

const LETTERS = ['A', 'B', 'C', 'D', 'E', 'F'];

export function buildExamHtml(data: ExamData): string {
  const show = !!data.showAnswers;

  const mc = data.multipleChoice
    .map((q, i) => {
      const pts = q.points ? `<span class="q-points">(${q.points}đ)</span>` : '';
      const opts = q.options?.length
        ? `<ul class="options">${q.options
            .map((o, j) => `<li>${LETTERS[j] ?? j + 1}. ${esc(o)}</li>`)
            .join('')}</ul>`
        : '';
      const ans =
        show && q.answer
          ? `<div class="answer"><b>Đáp án:</b> ${esc(q.answer)}${
              q.explanation ? `<br><i>${esc(q.explanation)}</i>` : ''
            }</div>`
          : '';
      return `<div class="q"><div class="q-head">Câu ${i + 1}. ${esc(
        q.question,
      )}${pts}</div>${opts}${ans}</div>`;
    })
    .join('');

  const essay = data.essay
    .map((q, i) => {
      const pts = q.points ? `<span class="q-points">(${q.points}đ)</span>` : '';
      const space = show
        ? ''
        : Array.from({ length: 5 }).map(() => `<div class="blank"></div>`).join('');
      const ans =
        show && q.answer
          ? `<div class="answer"><b>Gợi ý đáp án:</b> ${esc(q.answer)}</div>`
          : '';
      return `<div class="q"><div class="q-head">Câu ${i + 1}. ${esc(
        q.question,
      )}${pts}</div>${space}${ans}</div>`;
    })
    .join('');

  const body = `
    <div class="header">
      <h1>${esc(data.title)}${show ? ' — ĐÁP ÁN' : ''}</h1>
      <div class="meta">Môn: ${esc(data.subjectName)} · ${esc(data.gradeLevel)}${
        data.totalPoints ? ` · Tổng điểm: ${data.totalPoints}` : ''
      }</div>
    </div>
    ${
      show
        ? ''
        : `<div class="student-line">
            <div class="field">Họ tên: ${esc(data.studentName)}</div>
            <div class="field">Ngày: ____________</div>
            <div class="field">Điểm: ________</div>
          </div>`
    }
    ${data.multipleChoice.length ? `<h2 class="section">Phần I — Trắc nghiệm</h2>${mc}` : ''}
    ${data.essay.length ? `<h2 class="section">Phần II — Tự luận</h2>${essay}` : ''}
    <div class="footer">Kids LMS · ${show ? 'Đáp án' : 'Đề kiểm tra'}</div>
  `;

  return htmlDoc(
    body,
    `.section { font-size: 14px; color: #4F86C6; margin: 18px 0 10px; border-bottom: 1px solid #e3e9f0; padding-bottom: 4px; }`,
  );
}
