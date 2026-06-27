export type GenStatus = 'PENDING' | 'GENERATING' | 'READY' | 'FAILED';
export type CurriculumStatus = 'DRAFT' | 'PARSING' | 'PARSED' | 'FAILED';
export type SessionStatus = 'PENDING' | 'DONE';

export type Role = 'PARENT' | 'STUDENT';

export interface AuthUser {
  id: string;
  role: Role;
  name: string;
  parentId?: string;
}

export interface SessionVideo {
  id: string;
  sessionId: string;
  url: string;
  label?: string | null;
  orderIndex: number;
}

export interface Student {
  id: string;
  name: string;
  username?: string;
  gradeLevel: string;
  age?: number | null;
  notes?: string | null;
  subjects?: Subject[];
  _count?: { subjects: number };
}

export interface Subject {
  id: string;
  studentId: string;
  name: string;
  description?: string | null;
  student?: Student;
  curriculums?: Curriculum[];
  _count?: { curriculums: number; sessions: number; exams: number };
}

export interface Curriculum {
  id: string;
  subjectId: string;
  rawText: string;
  status: CurriculumStatus;
  aiParsed: boolean;
  error?: string | null;
  sessions?: Session[];
  _count?: { sessions: number };
}

export interface Session {
  id: string;
  title: string;
  objective?: string | null;
  content?: string | null;
  orderIndex: number;
  youtubeUrl?: string | null;
  status: SessionStatus;
  notes?: string | null;
  subject?: Subject;
  exercises?: Exercise[];
  videos?: SessionVideo[];
  _count?: { exercises: number };
}

export interface ExerciseQuestion {
  type: 'multiple_choice' | 'short_answer' | 'essay';
  question: string;
  options?: string[];
  points?: number;
}

export interface ExerciseGradedItem {
  index: number;
  awarded: number;
  max: number;
  correct?: boolean;
  comment?: string;
}

export interface ExerciseResultItem {
  id: string;
  score: number;
  maxScore: number;
  note?: string | null;
  answersJson?: string[] | null;
  detailJson?: { items?: ExerciseGradedItem[] } | null;
  aiFeedback?: string | null;
  source?: string | null;
  gradedAt: string;
}

/** Kết quả AI chấm bài tập trả về ngay khi học sinh nộp. */
export interface ExerciseGradingResult {
  items: ExerciseGradedItem[];
  total: number;
  maxTotal: number;
  feedback: string;
}

export interface Exercise {
  id: string;
  sessionId: string;
  title?: string | null;
  status: GenStatus;
  error?: string | null;
  contentJson?: { instructions?: string; questions?: ExerciseQuestion[] };
  results?: ExerciseResultItem[];
}

export interface Exam {
  id: string;
  title: string;
  status: GenStatus;
  error?: string | null;
  totalPoints: number;
  contentJson?: {
    multipleChoice?: { question: string; options?: string[]; points?: number }[];
    essay?: { question: string; points?: number }[];
  };
  results?: ExamResult[];
  _count?: { sessions: number; results: number };
}

export interface ExamResult {
  id: string;
  examId: string;
  imageUrls: string[];
  scoreTotal: number;
  maxScore: number;
  presentationNote?: string | null;
  aiFeedback?: string | null;
  scoreDetailJson?: {
    multipleChoice?: { index: number; studentAnswer?: string; correct?: boolean; awarded: number; max: number }[];
    essay?: { index: number; awarded: number; max: number; comment?: string }[];
  };
  takenAt: string;
}

export interface OverviewStudent {
  id: string;
  name: string;
  gradeLevel: string;
  subjectsCount: number;
  examCount: number;
  exerciseCount: number;
  avgExam: number | null;
  avgExercise: number | null;
  avgOverall: number | null;
  latestExam: { score: number; takenAt: string } | null;
}

export interface TimelinePoint {
  date: string;
  type: 'exam' | 'exercise';
  label: string;
  subject: string;
  score: number;
}

export interface SubjectAvg {
  subjectId: string;
  subjectName: string;
  avgExam: number | null;
  avgExercise: number | null;
  avgOverall: number | null;
}

export interface StudentReport {
  student: { id: string; name: string; gradeLevel: string };
  timeline: TimelinePoint[];
  bySubject: SubjectAvg[];
  examResults: {
    id: string;
    title: string;
    subject: string;
    score: number;
    presentationNote?: string | null;
    aiFeedback?: string | null;
    takenAt: string;
  }[];
}

export interface Assessment {
  summary: string;
  strengths: string[];
  weaknesses: string[];
  suggestions: string[];
}

export type AiProvider = 'anthropic' | 'gemini';

export interface AiModelInfo {
  id: string;
  label: string;
  provider: AiProvider;
  vision: boolean;
  hint?: string;
  /** Đã cấu hình API key cho provider của model này chưa. */
  configured: boolean;
  isDefault: boolean;
}

export interface AiModelsResponse {
  models: AiModelInfo[];
  defaultModel: string;
}

/** Cấu hình số câu khi AI tạo bài tập / đề kiểm tra (theo từng phụ huynh). */
export interface QuestionConfig {
  exerciseMcCount: number;
  exerciseEssayCount: number;
  examMcCount: number;
  examEssayCount: number;
}
