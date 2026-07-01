# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**Kids LMS** — Learning management system for elementary/middle school students (2 children).
- Parents input curriculum as text
- Claude AI auto-generates exercises & exams from curriculum sessions
- Grading via Claude Vision (upload exercise photos)
- PDF export (Puppeteer) for printing

**Tech Stack:** Next.js 14 (App Router) · NestJS · PostgreSQL + Prisma · BullMQ/Redis · Anthropic Claude API · Puppeteer

---

## Development Setup

### Prerequisites
- Node.js 18+
- Docker + Docker Compose (for PostgreSQL + Redis)
- Anthropic API key (required for AI features)

### Quick Start

```bash
# 1. Start infrastructure (PostgreSQL, Redis)
docker compose up -d
docker compose ps  # verify healthy

# 2. Backend (http://localhost:3001/api)
cd backend
cp .env.example .env  # fill ANTHROPIC_API_KEY
npm install
npm run prisma:generate
npm run prisma:migrate -- --name init
npm run db:seed        # optional: seed test data
npm run start:dev

# 3. Frontend (http://localhost:3000)
cd frontend
cp .env.example .env.local
npm install
npm run dev
```

### Health Check
```bash
# Backend health
curl http://localhost:3001/api/health

# Database schema
npm run prisma:studio  # browse schema at http://localhost:5555
```

### Common Commands

**Backend:**
```bash
npm run build                  # production build
npm run start                  # run production build
npm run start:dev              # watch mode (dev)
npm run prisma:studio          # GUI schema browser
npm run prisma:migrate -- --name <name>  # create migration
npm run db:seed                # populate test data
```

**Frontend:**
```bash
npm run dev                    # dev server with HMR
npm run build                  # production build
npm run start                  # run production server
npm run lint                   # ESLint check
```

**PDF Generation:**
```bash
# First-time setup: download Chromium (skip during CI)
npx puppeteer browsers install chrome

# Test PDF pipeline (no DB/Redis needed)
cd backend && node scripts/test-pdf.cjs  # outputs backend/test-output/*.pdf
```

---

## Architecture Overview

### Data Model
```
Student ──< Subject ──< Curriculum ──< Session ──< Exercise ──< ExerciseResult
   │           │                          │
   │           └──< Exam >──(n:n)── Session
   │                 └──< ExamResult (Vision grading)
```

- **Student:** Child account
- **Subject:** Subject per student (Math, Vietnamese, etc.)
- **Curriculum:** Teacher-provided lesson text (parsed into sessions)
- **Session:** Auto-parsed lesson unit (with YouTube URL, notes)
- **Exercise:** Exercise set for a session (AI-generated)
- **ExerciseResult:** Student exercise score entry
- **Exam:** Composite exam combining multiple sessions (AI-generated)
- **ExamResult:** Graded exam with score (Claude Vision analyzes uploaded photo)

### Backend Module Structure

Located in `backend/src/`:

| Module | Purpose |
|--------|---------|
| `auth/` | JWT auth, role-based access |
| `students/` | CRUD students |
| `subjects/` | CRUD subjects per student |
| `curriculums/` | Ingest curriculum text → trigger parsing job |
| `sessions/` | CRUD sessions (parsed from curriculum) |
| `exercises/` | CRUD exercises, trigger generation job, PDF export |
| `exams/` | CRUD exams, trigger generation job, PDF export |
| `exam-results/` | Upload photo → Claude Vision grading (sync) |
| `reports/` | Dashboard analytics, AI assessment |
| `queue/` | BullMQ workers (parsing, exercise/exam generation) |
| `ai/` | Claude/Gemini API wrapper, prompts |
| `pdf/` | Puppeteer PDF generation |
| `storage/` | File upload (multer + S3/R2) |
| `prisma/` | ORM schema & migrations |
| `providers/` | Anthropic & Google SDK instances |
| `dto/` | Data validation (class-validator) |

### Key Design Patterns

**Async Job Processing (BullMQ):**
- Curriculum parsing, Exercise generation, Exam creation run as queued jobs
- Frontend polls for completion every 3 seconds until `status = PARSED` or `READY`
- Workers in `backend/src/queue/processors/`

**Synchronous Grading:**
- `POST /api/exam-results` blocks until Claude Vision returns score (~15–30s)
- Photos stored in `uploads/exam-images/` (or S3/R2)

**PDF Generation:**
- Puppeteer converts HTML → PDF (uses Chrome headless)
- `GET /api/exercises/:id/pdf`, `GET /api/exams/:id/pdf`

**CORS & Static Files:**
- Configured in `backend/src/main.ts`
- Frontend: `http://localhost:3000`
- Uploads served from `/uploads` prefix

### Frontend Structure

Located in `frontend/app/`:
- **App Router** (Next.js 14) — file-based routing
- **Tailwind CSS** — utility styles
- **Layouts, pages, components** — colocate by feature

---

## Environment Variables

### Backend (.env)
```
DATABASE_URL=postgresql://postgres:CHANGE_ME@localhost:5432/kids_lms?schema=public
REDIS_HOST=localhost
REDIS_PORT=6379
ANTHROPIC_API_KEY=sk-ant-...
ANTHROPIC_MODEL=claude-opus-4-8
PORT=3001
NODE_ENV=development
UPLOAD_DIR=./uploads
APP_PIN=1234
```

### Frontend (.env.local)
```
NEXT_PUBLIC_API_URL=http://localhost:3001/api
```

### Production (.github/workflows/deploy.yml)
See [DEPLOYMENT.md](DEPLOYMENT.md) for secrets setup via GitHub Actions.

---

## Testing & Debugging

### Run Single Test (if test suite exists)
```bash
npm run test -- <test-file-pattern>
```

### Database Debugging
- **Prisma Studio:** `npm run prisma:studio`
- **Raw SQL:** Connect to PostgreSQL directly with your tool

### API Debugging
- **Health check:** `curl http://localhost:3001/api/health`
- **Test curriculum parsing:** POST `/api/curriculums` with text, poll `/api/curriculums/:id`
- **Test grading:** POST `/api/exam-results` with exam photo

### Logs
- **Backend:** Logged to stdout in dev mode (watch terminal running `npm run start:dev`)
- **Redis/Queue:** Inspect via `npm run prisma:studio` (check job queues if BullMQ tables exposed)

---

## Deployment Pipeline

**CI/CD: GitHub Actions → GHCR → VPS**

1. Push to `main` → GitHub Actions triggers `build-and-push` job
2. Build & push Docker images to GHCR (backend + frontend)
3. SSH into VPS, pull new images, run `docker compose up -d`
4. Cloudflare proxy handles HTTPS & DNS

**VPS Setup:**
- Docker + compose plugin only (no build, no git, no `.env` file)
- Secrets injected as env vars at deploy time (not stored on VPS)
- See [DEPLOYMENT.md](DEPLOYMENT.md) for full setup

**To Deploy:**
```bash
git push origin main  # GitHub Actions auto-deploys
```

---

## Important Files & Locations

| Path | Purpose |
|------|---------|
| `backend/prisma/schema.prisma` | 📋 Complete database schema |
| `backend/src/main.ts` | 🚀 NestJS bootstrap (CORS, static files, middleware) |
| `backend/src/ai/ai-exception.filter.ts` | 🛡️ Global error handling for Claude API |
| `backend/.env.example` | 🔐 Environment template |
| `frontend/app/` | 📄 Next.js App Router pages & components |
| `docker-compose.yml` | 🐳 Local dev (PostgreSQL, Redis) |
| `docker-compose.prod.yml` | 🐳 Production stack (+ Caddy, Cloudflare R2) |
| `.github/workflows/deploy.yml` | 🚀 CI/CD pipeline |
| `DEPLOYMENT.md` | 📖 Full deployment guide |

---

## Common Workflows

### Adding a New API Endpoint
1. Define DTO in `backend/src/{feature}/dto/` (use class-validator)
2. Create controller method in `backend/src/{feature}/{feature}.controller.ts`
3. Implement service logic in `backend/src/{feature}/{feature}.service.ts`
4. If async work needed: create job processor in `backend/src/queue/processors/`
5. Register in feature module

### Updating Database Schema
1. Modify `backend/prisma/schema.prisma`
2. Create migration: `npm run prisma:migrate -- --name <name>`
3. Review generated SQL before confirming
4. Restart backend to regenerate Prisma client

### Generating AI Content (Exercise/Exam)
- Curriculum parsing → AI prompts in `backend/src/ai/prompts/`
- Queue jobs trigger Claude API calls
- Check `backend/src/queue/processors/` for worker logic
- Claude model specified in `.env` as `ANTHROPIC_MODEL`

### Exporting PDF
- Call `/api/exercises/:id/pdf` or `/api/exams/:id/pdf`
- Puppeteer converts prepared HTML to PDF
- Requires Chrome installed (see "PDF Generation" section)

---

## Notes for Future Sessions

- **Token Economy:** Use `/clear` between unrelated tasks; keep prompts specific with file paths.
- **Model Selection:** Default to latest Claude for complex reasoning; use Haiku for simple text processing.
- **Fast Mode:** Use `/fast` for quicker responses on non-critical work (`/model haiku` or `/fast`).
- **Memory:** This CLAUDE.md persists context; update it as architecture evolves.

---

**Last Updated:** 2026-07-01  
**Stack Versions:** Node 18+ · NestJS 11 · Next.js 14 · Prisma 6 · React 18 · Tailwind 3
