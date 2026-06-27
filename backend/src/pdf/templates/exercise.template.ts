import { esc, htmlDoc } from './base';

export interface WorksheetQuestion {
  type: 'multiple_choice' | 'short_answer' | 'essay';
  question: string;
  options?: string[];
  answer?: string; // chỉ hiển thị khi showAnswers = true
  explanation?: string;
  points?: number;
}

export interface WorksheetData {
  title: string;
  subjectName: string;
  studentName: string;
  gradeLevel: string;
  instructions?: string;
  questions: WorksheetQuestion[];
  showAnswers?: boolean; // false: phiếu làm bài | true: bản đáp án
}

const LETTERS = ['A', 'B', 'C', 'D', 'E', 'F'];

function renderQuestion(q: WorksheetQuestion, idx: number, showAnswers: boolean): string {
  const points = q.points ? `<span class="q-points">(${q.points}đ)</span>` : '';
  let body = `<div class="q-head">Câu ${idx + 1}. ${esc(q.question)}${points}</div>`;

  if (q.type === 'multiple_choice' && q.options?.length) {
    body += `<ul class="options">${q.options
      .map((o, i) => `<li>${LETTERS[i] ?? i + 1}. ${esc(o)}</li>`)
      .join('')}</ul>`;
  } else if (q.type === 'short_answer') {
    if (!showAnswers) body += `<div class="blank"></div>`;
  } else if (q.type === 'essay') {
    if (!showAnswers)
      body += Array.from({ length: 4 }).map(() => `<div class="blank"></div>`).join('');
  }

  if (showAnswers && q.answer) {
    body += `<div class="answer"><b>Đáp án:</b> ${esc(q.answer)}${
      q.explanation ? `<br><i>${esc(q.explanation)}</i>` : ''
    }</div>`;
  }

  return `<div class="q">${body}</div>`;
}

/** Phiếu bài tập: showAnswers=false → bản in cho bé làm; true → bản đáp án. */
export function buildExerciseHtml(data: WorksheetData): string {
  const show = !!data.showAnswers;
  const total = data.questions.reduce((s, q) => s + (q.points ?? 0), 0);

  const body = `
    <div class="header">
      <h1>${esc(data.title)}${show ? ' — ĐÁP ÁN' : ''}</h1>
      <div class="meta">Môn: ${esc(data.subjectName)} · ${esc(data.gradeLevel)}${
        total ? ` · Tổng điểm: ${total}` : ''
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
    ${data.instructions ? `<div class="instructions">📝 ${esc(data.instructions)}</div>` : ''}
    ${data.questions.map((q, i) => renderQuestion(q, i, show)).join('')}
    <div class="footer">Kids LMS · Phiếu bài tập</div>
  `;

  return htmlDoc(body);
}
