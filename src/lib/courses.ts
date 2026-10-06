// Course content data layer — server-side access to courses & lessons.
//
// The content architecture is course-first:
//   Course → Curriculum (Lesson[]) → Exercise → Hints → Solution → Quiz
//   → Final Assessment → Project
//
// All teaching content lives in the database as structured JSON blocks
// (see ContentBlock below) that the frontend renders through reusable
// components — content is never hardcoded in JSX, and admins can edit it
// without touching frontend source code. Initial content is seeded from
// versioned files under content/courses/<slug>/.
import { db } from "@/lib/db";

// ---------------------------------------------------------------------------
// Shared content types (mirrored on the client via src/lib/course-types.ts)

/** A single multiple-choice quiz / assessment question. */
export type QuizQuestion = {
  q: string;
  options: string[];
  /** Index of the correct option (0-based) */
  answer: number;
  explain: string;
  difficulty?: "easy" | "medium" | "hard";
};

/** A "Try It Yourself" exercise with progressive hints + solution. */
export type Exercise = {
  prompt: string;
  /** Progressive hints, revealed one at a time (1–3) */
  hints: string[];
  solution: string;
  /** "Why this works" — the reasoning behind the solution */
  why: string;
  code?: string;
  lang?: string;
};

/**
 * A content block in a lesson body. The renderer maps each `t` to a
 * reusable component: Callout, CodeBlock, Diagram, KeyTakeaways,
 * InterviewQuestion, table, list, …
 */
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

// ---------------------------------------------------------------------------
// View types returned by the APIs

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
  /** Calculated from lesson records — never manually maintained */
  lessonCount: number;
  totalMinutes: number;
  xpTotal: number;
  lessons: LessonSummary[];
  updatedAt: string;
};

// ---------------------------------------------------------------------------
// Parsing helpers (defensive: malformed JSON degrades to empty, never throws)

function parseJson<T>(raw: string | null | undefined, fallback: T): T {
  if (!raw) return fallback;
  try {
    const parsed = JSON.parse(raw);
    return (parsed ?? fallback) as T;
  } catch {
    return fallback;
  }
}

function isQuizQuestion(q: unknown): q is QuizQuestion {
  if (!q || typeof q !== "object") return false;
  const o = q as Record<string, unknown>;
  return (
    typeof o.q === "string" &&
    Array.isArray(o.options) &&
    typeof o.answer === "number" &&
    typeof o.explain === "string"
  );
}

export function parseQuiz(raw: string): QuizQuestion[] {
  return parseJson<unknown[]>(raw, [])
    .filter(isQuizQuestion)
    .map((q) => ({
      q: q.q,
      options: q.options.map(String),
      answer: q.answer,
      explain: q.explain,
      difficulty: q.difficulty,
    }));
}

export function parseExercise(raw: string | null): Exercise | null {
  const ex = parseJson<Exercise | null>(raw, null);
  if (!ex || typeof ex.prompt !== "string" || typeof ex.solution !== "string")
    return null;
  return {
    prompt: ex.prompt,
    hints: Array.isArray(ex.hints) ? ex.hints.map(String) : [],
    solution: ex.solution,
    why: typeof ex.why === "string" ? ex.why : "",
    code: typeof ex.code === "string" ? ex.code : undefined,
    lang: typeof ex.lang === "string" ? ex.lang : undefined,
  };
}

export function parseBlocks(raw: string): ContentBlock[] {
  const blocks = parseJson<unknown[]>(raw, []);
  if (!Array.isArray(blocks)) return [];
  return blocks.filter(
    (b): b is ContentBlock =>
      !!b && typeof b === "object" && typeof (b as Record<string, unknown>).t === "string"
  );
}

// ---------------------------------------------------------------------------
// Queries

/** Slugs of courses that have live lesson content (status published + ≥1 lesson). */
export async function getCourseSlugs(): Promise<string[]> {
  const rows = await db.lesson.groupBy({
    by: ["courseSlug"],
    where: { published: true, course: { contentStatus: "published" } },
    _count: { _all: true },
  });
  return rows.map((r) => r.courseSlug);
}

/** Map of courseSlug → published lesson count (drives "N lessons" chips). */
export async function getLessonCounts(): Promise<Record<string, number>> {
  const rows = await db.lesson.groupBy({
    by: ["courseSlug"],
    where: { published: true, course: { contentStatus: "published" } },
    _count: { _all: true },
  });
  return Object.fromEntries(rows.map((r) => [r.courseSlug, r._count._all]));
}

export async function getCourse(
  courseSlug: string,
  opts: { includeDrafts?: boolean } = {}
): Promise<CourseView | null> {
  const course = await db.course.findUnique({
    where: { courseSlug },
    include: { lessons: true },
  });
  if (!course) return null;

  const quizCache = new Map<string, number>();
  const lessons = course.lessons
    .filter((l) => opts.includeDrafts || l.published)
    .sort((a, b) => a.order - b.order)
    .map((l) => {
      const quizCount = quizCache.get(l.id) ?? parseQuiz(l.quiz).length;
      quizCache.set(l.id, quizCount);
      return {
        id: l.id,
        order: l.order,
        slug: l.slug,
        title: l.title,
        objective: l.objective,
        minutes: l.minutes,
        xp: l.xp,
        published: l.published,
        quizCount,
        hasExercise: parseExercise(l.exercise) !== null,
      };
    });

  const project = parseJson<CourseProject | null>(course.project, null);

  return {
    courseSlug: course.courseSlug,
    subtitle: course.subtitle,
    audience: course.audience,
    outcomes: parseJson<string[]>(course.outcomes, []).map(String),
    prereqSlugs: parseJson<string[]>(course.prereqSlugs, []).map(String),
    technologies: parseJson<string[]>(course.technologies, []).map(String),
    skills: parseJson<string[]>(course.skills, []).map(String),
    assessment: parseQuiz(course.assessment),
    passScore: course.passScore,
    project:
      project && typeof project.title === "string" && Array.isArray(project.requirements)
        ? project
        : null,
    interviewQs: parseJson<{ q: string; a: string }[]>(course.interviewQs, []).filter(
      (q) => typeof q.q === "string" && typeof q.a === "string"
    ),
    version: course.version,
    contentStatus: course.contentStatus,
    lessonCount: lessons.length,
    totalMinutes: lessons.reduce((sum, l) => sum + l.minutes, 0),
    xpTotal: lessons.reduce((sum, l) => sum + l.xp, 0),
    lessons,
    updatedAt: course.updatedAt.toISOString(),
  };
}

export async function getLesson(
  courseSlug: string,
  order: number,
  opts: { includeDrafts?: boolean } = {}
): Promise<LessonView | null> {
  const lesson = await db.lesson.findFirst({
    where: {
      courseSlug,
      order,
      ...(opts.includeDrafts ? {} : { published: true }),
    },
  });
  if (!lesson) return null;

  return {
    id: lesson.id,
    order: lesson.order,
    slug: lesson.slug,
    title: lesson.title,
    objective: lesson.objective,
    why: lesson.why,
    minutes: lesson.minutes,
    xp: lesson.xp,
    published: lesson.published,
    quizCount: parseQuiz(lesson.quiz).length,
    hasExercise: parseExercise(lesson.exercise) !== null,
    blocks: parseBlocks(lesson.blocks),
    exercise: parseExercise(lesson.exercise),
    quiz: parseQuiz(lesson.quiz),
    summary: lesson.summary,
    next: lesson.next,
  };
}
