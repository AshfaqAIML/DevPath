// Client-safe content types shared by course UI components.
// (src/lib/courses.ts imports the DB — this file has zero server deps so
// client components can import types freely.)

export type QuizQuestion = {
  q: string;
  options: string[];
  answer: number;
  explain: string;
  difficulty?: "easy" | "medium" | "hard";
};

export type Exercise = {
  prompt: string;
  hints: string[];
  solution: string;
  why: string;
  code?: string;
  lang?: string;
};

export type ContentBlock =
  | { t: "h"; text: string }
  | { t: "p"; text: string }
  | { t: "list"; ordered?: boolean; items: string[] }
  | {
      t: "callout";
      variant: "info" | "tip" | "warn" | "danger";
      title?: string;
      text: string;
    }
  | { t: "code"; lang: string; code: string; caption?: string; highlight?: number[] }
  | { t: "table"; headers: string[]; rows: string[][] }
  | { t: "diagram"; caption?: string; nodes: string[] }
  | { t: "keytakeaways"; title?: string; items: string[] }
  | { t: "interview"; q: string; a: string };

export type LessonSummary = {
  id: string;
  order: number;
  slug: string;
  title: string;
  objective: string;
  minutes: number;
  xp: number;
  published: boolean;
  quizCount: number;
  hasExercise: boolean;
};

export type LessonView = LessonSummary & {
  why: string;
  blocks: ContentBlock[];
  exercise: Exercise | null;
  quiz: QuizQuestion[];
  summary: string;
  next: string;
};

export type CourseProject = {
  title: string;
  summary: string;
  requirements: string[];
  technical: string[];
  architecture: string;
  steps: string[];
  evaluation: string[];
  stretch: string[];
};

export type CourseView = {
  courseSlug: string;
  subtitle: string;
  audience: string;
  outcomes: string[];
  prereqSlugs: string[];
  technologies: string[];
  skills: string[];
  assessment: QuizQuestion[];
  passScore: number;
  project: CourseProject | null;
  interviewQs: { q: string; a: string }[];
  version: string;
  contentStatus: string;
  lessonCount: number;
  totalMinutes: number;
  xpTotal: number;
  lessons: LessonSummary[];
  updatedAt: string;
};

/** Stable query keys for the course APIs. */
export const courseKeys = {
  course: (slug: string) => ["course", slug] as const,
  lesson: (slug: string, order: number | "assessment") =>
    ["course", slug, "lesson", order] as const,
};
