# 🎓 Kids LMS — Quản lý học tập tại nhà

Ứng dụng quản lý học tập cho 2 bé (tiểu học/THCS). Phụ huynh nhập giáo trình dạng
text, AI (Claude) tự tạo bài tập & đề kiểm tra, chấm bài qua ảnh, và xuất PDF để in.

**Stack:** Next.js 14 (App Router) · NestJS · PostgreSQL + Prisma · BullMQ/Redis ·
Anthropic Claude API · Puppeteer.

## Cấu trúc thư mục

```
ELearning/
├── docker-compose.yml      # PostgreSQL + Redis (local)
├── .env.example            # mẫu biến môi trường
├── backend/                # NestJS API + Prisma + AI + queue + PDF
│   ├── prisma/schema.prisma   # ⭐ Schema đầy đủ 8 bảng
│   └── src/
└── frontend/               # Next.js 14 (App Router, Tailwind)
    └── app/
```

## Sơ đồ dữ liệu

```
Student ──< Subject ──< Curriculum ──< Session ──< Exercise ──< ExerciseResult
   │           │                          │
   │           └──< Exam >──(n:n)── Session (các buổi tổng hợp vào đề)
   │                 └──< ExamResult (chấm ảnh bài làm, nhiều lần)
```

- **Không** quản lý theo học kỳ. Exam là **bất thường**, tổng hợp từ Session đã học.
- Đánh giá = điểm `ExerciseResult` (từng buổi) + `ExamResult` (các đợt kiểm tra).

## Chạy Phase 1

### 1. Khởi động hạ tầng

```bash
docker compose up -d          # bật PostgreSQL (5432) + Redis (6379)
docker compose ps             # kiểm tra healthy
```

### 2. Backend

```bash
cd backend
cp .env.example .env          # điền ANTHROPIC_API_KEY
npm install
npm run prisma:generate
npm run prisma:migrate -- --name init   # tạo bảng trong DB
npm run db:seed               # (tuỳ chọn) tạo 2 học sinh mẫu
npm run start:dev             # API tại http://localhost:3001/api
```

Kiểm tra: `http://localhost:3001/api/health` → `{ "status": "ok", "db": "up" }`

### 3. Frontend

```bash
cd frontend
cp .env.example .env.local
npm install
npm run dev                   # http://localhost:3000
```

## Lộ trình

| Phase | Nội dung | Trạng thái |
|-------|----------|------------|
| 1 | Setup project · DB schema · Layout UI | ✅ |
| 2 | CRUD Student/Subject · Nhập giáo trình → AI parse Sessions (BullMQ) | ✅ |
| 3 | AI tạo bài tập · Xem bài tập · Xuất PDF (Puppeteer) | ✅ |
| 4 | Tạo đề thi (AI) · PDF đề+đáp án · Upload ảnh → Vision chấm | ✅ |
| 5 | Dashboard báo cáo · Biểu đồ điểm · Đánh giá tổng hợp AI | ✅ |

## API (Phase 2)

| Method | Endpoint | Chức năng |
|--------|----------|-----------|
| `GET/POST` | `/api/students` · `/api/students/:id` | CRUD học sinh |
| `GET/POST` | `/api/subjects?studentId=` · `/api/subjects/:id` | CRUD môn học |
| `POST` | `/api/curriculums` | Nhập text → đẩy job AI parse vào queue |
| `GET` | `/api/curriculums/:id` | Polling tiến độ parse + danh sách Session |
| `POST` | `/api/curriculums/:id/reparse` | Chạy lại nếu parse lỗi |
| `GET` | `/api/sessions?subjectId=` | Danh sách buổi học |
| `PATCH` | `/api/sessions/:id` | Gán YouTube, đánh dấu đã học, ghi chú |
| `POST` | `/api/exercises` | AI tạo bài tập cho 1 buổi (job ngầm) |
| `GET` | `/api/exercises?sessionId=` · `/api/exercises/:id` | Xem bài tập / polling |
| `POST` | `/api/exercises/:id/regenerate` | Tạo lại bài tập |
| `GET` | `/api/exercises/:id/pdf` · `?answers=1` | Xuất phiếu PDF / bản đáp án |
| `POST` | `/api/exams` | AI tạo đề tổng hợp từ buổi đã học (job ngầm) |
| `GET` | `/api/exams?subjectId=` · `/api/exams/:id` | Danh sách / chi tiết đề |
| `GET` | `/api/exams/:id/pdf` · `?answers=1` | Xuất PDF đề thi / bản đáp án |
| `POST` | `/api/exam-results` | Upload ảnh (multipart) → Claude Vision chấm |
| `GET` | `/api/exam-results?examId=` | Lịch sử các lần chấm |
| `POST` | `/api/exercises/:id/result` | Nhập điểm bài tập của buổi |
| `GET` | `/api/reports/overview` | Tổng quan dashboard (TB điểm 2 bé) |
| `GET` | `/api/reports/student/:id` | Timeline điểm + TB theo môn |
| `POST` | `/api/reports/student/:id/assessment` | AI đánh giá điểm mạnh/yếu + gợi ý |

> Các luồng tạo nội dung AI chạy ngầm bằng **BullMQ worker** (`CurriculumProcessor`,
> `ExerciseProcessor`, `ExamProcessor`) — Redis bắt buộc chạy. Frontend polling mỗi 3s
> tới khi `status = PARSED` / `READY`.
>
> Riêng **chấm bài** (`POST /exam-results`) chạy **đồng bộ**: request chờ Claude Vision
> chấm xong (~15–30s) rồi trả kết quả luôn. Ảnh lưu ở `uploads/exam-images/`.

### Puppeteer (xuất PDF)

Cài deps **không** tự tải Chromium (đã skip cho nhẹ). Chạy 1 lần để tải trình duyệt cho PDF:

```bash
cd backend
npx puppeteer browsers install chrome
# Smoke test pipeline PDF (không cần DB/Redis):
node scripts/test-pdf.cjs   # → backend/test-output/*.pdf
```
