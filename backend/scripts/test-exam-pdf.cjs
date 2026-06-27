// Smoke test PDF đề kiểm tra (đề + đáp án). Chạy: node scripts/test-exam-pdf.cjs
const path = require('path');
const fs = require('fs');
const puppeteer = require('puppeteer');
const { buildExamHtml } = require('../dist/src/pdf/templates/exam.template');

const sample = {
  title: 'Kiểm tra tổng hợp #1',
  subjectName: 'Toán',
  studentName: 'Bé An',
  gradeLevel: 'Lớp 3',
  totalPoints: 10,
  multipleChoice: [
    { question: '1/2 bằng phân số nào?', options: ['2/4', '1/3', '3/4', '2/3'], answer: '2/4', explanation: 'Nhân 2.', points: 1 },
    { question: '5 + 7 = ?', options: ['11', '12', '13', '10'], answer: '12', points: 1 },
  ],
  essay: [
    { question: 'Giải thích vì sao 2/4 = 1/2.', answer: 'Rút gọn 2/4 = 1/2.', points: 4 },
    { question: 'Đặt một bài toán có lời văn về phép cộng.', answer: 'HS tự đặt, đúng phép cộng.', points: 4 },
  ],
};

(async () => {
  const browser = await puppeteer.launch({ headless: true, args: ['--no-sandbox'] });
  const out = path.join(__dirname, '..', 'test-output');
  fs.mkdirSync(out, { recursive: true });

  for (const withAnswers of [false, true]) {
    const html = buildExamHtml({ ...sample, showAnswers: withAnswers });
    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: 'load' });
    const file = path.join(out, withAnswers ? 'exam-answers.pdf' : 'exam.pdf');
    await page.pdf({ path: file, format: 'A4', printBackground: true });
    await page.close();
    console.log(`✅ ${path.basename(file)} — ${fs.statSync(file).size} bytes`);
  }
  await browser.close();
  console.log('Exam PDF OK.');
})().catch((e) => {
  console.error('❌', e);
  process.exit(1);
});
