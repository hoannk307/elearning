// Smoke test pipeline PDF: build HTML từ template thật + render bằng Puppeteer.
// Không cần DB/Redis/API. Chạy: node scripts/test-pdf.cjs
const path = require('path');
const fs = require('fs');
const puppeteer = require('puppeteer');
const { buildExerciseHtml } = require('../dist/src/pdf/templates/exercise.template');

const sample = {
  title: 'Bài 5: Phân số',
  subjectName: 'Toán',
  studentName: 'Bé An',
  gradeLevel: 'Lớp 3',
  instructions: 'Làm tất cả các câu vào chỗ trống. Viết rõ ràng.',
  questions: [
    {
      type: 'multiple_choice',
      question: 'Phân số 1/2 bằng phân số nào dưới đây?',
      options: ['2/4', '1/3', '3/4', '2/3'],
      answer: '2/4',
      explanation: 'Nhân cả tử và mẫu với 2.',
      points: 2,
    },
    { type: 'short_answer', question: 'Viết phân số chỉ 3 phần trong 5 phần.', answer: '3/5', points: 2 },
    { type: 'essay', question: 'Giải thích vì sao 2/4 = 1/2.', answer: 'Vì rút gọn 2/4 được 1/2.', points: 3 },
  ],
};

(async () => {
  const browser = await puppeteer.launch({ headless: true, args: ['--no-sandbox'] });
  const out = path.join(__dirname, '..', 'test-output');
  fs.mkdirSync(out, { recursive: true });

  for (const withAnswers of [false, true]) {
    const html = buildExerciseHtml({ ...sample, showAnswers: withAnswers });
    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: 'load' });
    const file = path.join(out, withAnswers ? 'worksheet-answers.pdf' : 'worksheet.pdf');
    await page.pdf({ path: file, format: 'A4', printBackground: true });
    await page.close();
    const size = fs.statSync(file).size;
    console.log(`✅ ${path.basename(file)} — ${size} bytes`);
    if (size < 1000) throw new Error('PDF quá nhỏ, có thể render lỗi.');
  }

  await browser.close();
  console.log('PDF pipeline OK.');
})().catch((e) => {
  console.error('❌', e);
  process.exit(1);
});
