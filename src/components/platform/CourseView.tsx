"use client";

// CourseView — the course-first learning experience.
//   /?course=slug                 → course overview (what you'll learn, prereqs, project)
//   /?course=slug&lesson=N        → lesson N (blocks, exercise, quiz)
//   /?course=slug&lesson=assessment → final assessment
// Progress is computed from real lesson records in the library store —
// never hardcoded. Content is fetched from the course APIs (never JSX).
import * as React from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import {
  ArrowLeft, ArrowRight, BookOpen, Check, ChevronRight, Clock, Compass,
  Flag, GraduationCap, Hammer, Layers, ListChecks, Sparkles, Target, Zap,
} from "lucide-react";

import type { CourseView as Course, LessonView } from "@/lib/course-types";
import type { ResourceItemView, CategoryView } from "@/lib/platform";
import { useLibrary, useLibraryHydrated } from "@/lib/library-store";
import { trackEvent } from "./platform-data";
import { LessonBlocks, renderInline, InterviewQuestion } from "./lesson/LessonBlocks";
import { QuizCard } from "./lesson/QuizCard";
import { ExerciseCard } from "./lesson/ExerciseCard";
import { getAccent } from "@/lib/accent";

interface CourseViewProps {
  course: Course;
  item: ResourceItemView;
  category: CategoryView;
  initialLesson: string | null;
}

type LessonTab = "overview" | number | "assessment";

function courseHref(slug: string) {
  return `/?course=${slug}`;
}
function lessonHref(slug: string, lesson: Exclude<LessonTab, "overview">) {
  return `/?course=${slug}&lesson=${lesson}`;
}

async function fetchLesson(slug: string, order: number): Promise<{ lesson: LessonView }> {
  const res = await fetch(`/api/courses/${slug}/lessons/${order}`);
  if (!res.ok) throw new Error("Failed to load lesson");
  return res.json();
}

export function CourseView({ course, item, category, initialLesson }: CourseViewProps) {
  const router = useRouter();
  const sp = useSearchParams();
  const hydrated = useLibraryHydrated();
  const accent = getAccent(category.accent);

  const lessonParam = sp.get("lesson") ?? initialLesson;
  const tab: LessonTab = !lessonParam
    ? "overview"
    : lessonParam === "assessment"
      ? "assessment"
      : Math.max(1, Math.min(Number(lessonParam) || 1, course.lessons.length));

  // Progress — computed from real lesson records
  const courseProgress = useLibrary((s) => s.courseProgress[course.courseSlug]);
  const completedLessons = hydrated ? courseProgress?.lessons ?? [] : [];
  const doneCount = completedLessons.filter((n) => n <= course.lessonCount).length;
  const progressPct = course.lessonCount
    ? Math.round((doneCount / course.lessonCount) * 100)
    : 0;
  const assessmentPassed = Boolean(hydrated && courseProgress?.completedAt);

  const completeLesson = useLibrary((s) => s.completeLesson);
  const recordAssessment = useLibrary((s) => s.recordAssessment);
  const pushRecent = useLibrary((s) => s.pushRecent);

  // Recents + item analytics on course open
  React.useEffect(() => {
    pushRecent({
      slug: item.slug,
      title: item.title,
      level: item.level,
      duration: item.duration,
      categorySlug: category.slug,
      categoryTitle: category.title,
      categoryIcon: category.icon,
      categoryAccent: category.accent,
    });
     
  }, [course.courseSlug]);

  const nextLesson = Math.min(...course.lessons.filter((l) => !completedLessons.includes(l.order)).map((l) => l.order), Infinity);

  return (
    <div className="mx-auto max-w-6xl">
      {/* Breadcrumb */}
      <nav aria-label="Breadcrumb" className="mb-4 flex items-center gap-1.5 text-sm text-muted-foreground">
        <Link href={`/?category=${category.slug}`} className="transition-colors hover:text-foreground">
          {category.title}
        </Link>
        <ChevronRight className="h-3.5 w-3.5" aria-hidden="true" />
        <span className="text-foreground" aria-current="page">{item.title}</span>
        {tab !== "overview" ? (
          <>
            <ChevronRight className="h-3.5 w-3.5" aria-hidden="true" />
            <span className="text-foreground">{tab === "assessment" ? "Final assessment" : `Lesson ${tab}`}</span>
          </>
        ) : null}
      </nav>

      {/* Course header */}
      <header className="mb-6 overflow-hidden rounded-2xl border border-border bg-card/60">
        <div className={`h-1 w-full ${accent.dot} opacity-80`} aria-hidden="true" />
        <div className="p-5 sm:p-7">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="min-w-0">
              <div className="mb-2 flex flex-wrap items-center gap-2">
                <span className={`rounded-full border px-2.5 py-0.5 text-[11px] font-semibold ${accent.chip}`}>
                  {item.level}
                </span>
                <span className="rounded-full border border-border bg-muted px-2.5 py-0.5 text-[11px] font-medium text-muted-foreground">
                  v{course.version}
                </span>
                {assessmentPassed ? (
                  <span className="flex items-center gap-1 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2.5 py-0.5 text-[11px] font-semibold text-emerald-600 dark:text-emerald-400">
                    <GraduationCap className="h-3 w-3" aria-hidden="true" />
                    Completed
                  </span>
                ) : null}
              </div>
              <h1 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
                {item.title}
              </h1>
              {course.subtitle ? (
                <p className="mt-1.5 max-w-2xl text-sm leading-relaxed text-muted-foreground sm:text-[15px]">
                  {course.subtitle}
                </p>
              ) : null}
            </div>

            {tab === "overview" ? (
              <button
                type="button"
                onClick={() => {
                  const target = Number.isFinite(nextLesson) ? nextLesson : 1;
                  trackEvent("card_click", course.courseSlug, "start-course");
                  router.push(lessonHref(course.courseSlug, target));
                }}
                className={`flex shrink-0 items-center gap-2 rounded-xl px-5 py-2.5 text-sm font-semibold text-white shadow-lg transition-transform hover:scale-[1.02] active:scale-100 ${accent.dot} ${accent.iconGlow ? "" : ""} shadow-black/20 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-500`}
              >
                <BookOpen className="h-4 w-4" aria-hidden="true" />
                {doneCount > 0 ? `Continue · lesson ${nextLesson}` : "Start course"}
              </button>
            ) : null}
          </div>

          <dl className="mt-5 flex flex-wrap gap-x-6 gap-y-2 text-sm">
            <div className="flex items-center gap-1.5">
              <Layers className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
              <dt className="sr-only">Lessons</dt>
              <dd className="font-medium text-foreground">{course.lessonCount} lessons</dd>
            </div>
            <div className="flex items-center gap-1.5">
              <Clock className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
              <dt className="sr-only">Total time</dt>
              <dd className="font-medium text-foreground">
                {course.totalMinutes >= 60
                  ? `${Math.floor(course.totalMinutes / 60)}h ${course.totalMinutes % 60 ? `${course.totalMinutes % 60}m` : ""}`.trim()
                  : `${course.totalMinutes}m`}
              </dd>
            </div>
            <div className="flex items-center gap-1.5">
              <Zap className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
              <dt className="sr-only">XP</dt>
              <dd className="font-medium text-foreground">{course.xpTotal} XP</dd>
            </div>
            <div className="flex items-center gap-1.5">
              <ListChecks className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
              <dt className="sr-only">Quizzes</dt>
              <dd className="font-medium text-foreground">
                {course.lessons.reduce((s, l) => s + l.quizCount, 0)} quiz questions
              </dd>
            </div>
          </dl>

          {/* Progress bar — computed from lesson records */}
          <div className="mt-5">
            <div className="mb-1.5 flex items-center justify-between text-xs">
              <span className="text-muted-foreground">
                {doneCount} of {course.lessonCount} lessons complete
              </span>
              <span className={`font-mono font-semibold ${accent.text}`}>{progressPct}%</span>
            </div>
            <div
              className="h-2.5 overflow-hidden rounded-full bg-muted"
              role="progressbar"
              aria-valuenow={progressPct}
              aria-valuemin={0}
              aria-valuemax={100}
              aria-label="Course progress"
            >
              <div
                className={`h-full rounded-full ${accent.dot} transition-[width] duration-500`}
                style={{ width: `${progressPct}%` }}
              />
            </div>
          </div>
        </div>
      </header>

      <div className="grid gap-6 lg:grid-cols-[260px_1fr]">
        {/* Curriculum sidebar */}
        <aside className="min-w-0 lg:sticky lg:top-24 lg:self-start">
          <nav aria-label="Course curriculum" className="rounded-2xl border border-border bg-card/60 p-4">
            <p className="mb-3 flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              <Compass className="h-3.5 w-3.5" aria-hidden="true" />
              Curriculum
            </p>
            <ol className="space-y-1">
              {course.lessons.map((l) => {
                const isCurrent = tab === l.order;
                const isDone = completedLessons.includes(l.order);
                return (
                  <li key={l.id}>
                    <Link
                      href={lessonHref(course.courseSlug, l.order)}
                      className={`flex items-start gap-2.5 rounded-lg px-2.5 py-2 text-sm transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-teal-500 ${
                        isCurrent
                          ? `${accent.text} font-semibold ${course.lessonCount ? "" : ""} bg-accent/10`
                          : "text-foreground/80 hover:bg-muted/70"
                      }`}
                      aria-current={isCurrent ? "page" : undefined}
                    >
                      <span
                        className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border font-mono text-[10px] font-semibold ${
                          isDone
                            ? "border-emerald-500/50 bg-emerald-500/15 text-emerald-600 dark:text-emerald-400"
                            : isCurrent
                              ? `border-current ${accent.text}`
                              : "border-border text-muted-foreground"
                        }`}
                        aria-hidden="true"
                      >
                        {isDone ? <Check className="h-3 w-3" /> : l.order}
                      </span>
                      <span className="flex-1 leading-snug">{l.title}</span>
                      <span className="hidden shrink-0 font-mono text-[10px] text-muted-foreground sm:inline">
                        {l.minutes}m
                      </span>
                    </Link>
                  </li>
                );
              })}
              <li className="border-t border-border/60 pt-1">
                <Link
                  href={lessonHref(course.courseSlug, "assessment")}
                  className={`flex items-start gap-2.5 rounded-lg px-2.5 py-2 text-sm transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-teal-500 ${
                    tab === "assessment"
                      ? `${accent.text} font-semibold bg-accent/10`
                      : "text-foreground/80 hover:bg-muted/70"
                  }`}
                >
                  <span
                    className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border ${
                      assessmentPassed
                        ? "border-emerald-500/50 bg-emerald-500/15 text-emerald-600 dark:text-emerald-400"
                        : "border-border text-muted-foreground"
                    }`}
                    aria-hidden="true"
                  >
                    {assessmentPassed ? <Check className="h-3 w-3" /> : <Flag className="h-3 w-3" />}
                  </span>
                  <span className="flex-1 leading-snug">Final assessment</span>
                  <span className="mt-0.5 shrink-0 font-mono text-[10px] text-muted-foreground">
                    {course.assessment.length}q
                  </span>
                </Link>
              </li>
            </ol>
          </nav>
        </aside>

        {/* Main content */}
        <div className="min-w-0">
          {tab === "overview" ? (
            <CourseOverview
              course={course}
              accent={accent}
              onStart={() => {
                const target = Number.isFinite(nextLesson) ? nextLesson : 1;
                router.push(lessonHref(course.courseSlug, target));
              }}
            />
          ) : tab === "assessment" ? (
            <AssessmentView
              course={course}
              accent={accent}
              onResult={(score, passed) =>
                recordAssessment(course.courseSlug, score, passed)
              }
              courseSlugForAnalytics={course.courseSlug}
            />
          ) : (
            <LessonPane
              course={course}
              order={tab}
              completedLessons={completedLessons}
              completeLesson={(order) => {
                completeLesson(course.courseSlug, order);
                trackEvent("lesson_complete", course.courseSlug, `lesson-${order}`);
              }}
              router={router}
            />
          )}
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------

function CourseOverview({
  course,
  accent,
  onStart,
}: {
  course: Course;
  accent: ReturnType<typeof getAccent>;
  onStart: () => void;
}) {
  return (
    <div className="space-y-6">
      <motion.section
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="rounded-2xl border border-border bg-card/60 p-5 sm:p-6"
        aria-labelledby="wyl-title"
      >
        <h2 id="wyl-title" className="mb-4 flex items-center gap-2.5 text-base font-semibold text-foreground">
          <span className={`flex h-8 w-8 items-center justify-center rounded-lg ${accent.chip}`}>
            <Target className="h-4 w-4" aria-hidden="true" />
          </span>
          What you&apos;ll learn
        </h2>
        <ul className="grid gap-2.5 sm:grid-cols-2">
          {course.outcomes.map((o, i) => (
            <li key={i} className="flex gap-2.5 text-sm leading-relaxed text-foreground/90">
              <Check className={`mt-0.5 h-4 w-4 shrink-0 ${accent.text}`} aria-hidden="true" />
              <span>{renderInline(o, `oc-${i}`)}</span>
            </li>
          ))}
        </ul>
      </motion.section>

      <div className="grid gap-6 md:grid-cols-2">
        <section className="rounded-2xl border border-border bg-card/60 p-5" aria-labelledby="audience-title">
          <h2 id="audience-title" className="mb-3 text-base font-semibold text-foreground">
            Who this course is for
          </h2>
          <p className="text-sm leading-relaxed text-foreground/85">
            {renderInline(course.audience, "aud")}
          </p>
        </section>
        <section className="rounded-2xl border border-border bg-card/60 p-5" aria-labelledby="prereq-title">
          <h2 id="prereq-title" className="mb-3 text-base font-semibold text-foreground">
            Prerequisites
          </h2>
          {course.prereqSlugs.length > 0 ? (
            <ul className="space-y-2">
              {course.prereqSlugs.map((slug) => (
                <li key={slug}>
                  <Link
                    href={`/?category=courses&item=${slug}`}
                    className="flex items-center gap-2 text-sm text-foreground/85 transition-colors hover:text-foreground"
                  >
                    <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" aria-hidden="true" />
                    <span className="capitalize">{slug.replace(/-/g, " ")}</span>
                  </Link>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-muted-foreground">No prerequisites — jump right in.</p>
          )}
        </section>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {course.technologies.length > 0 ? (
          <section className="rounded-2xl border border-border bg-card/60 p-5" aria-labelledby="tech-title">
            <h2 id="tech-title" className="mb-3 text-base font-semibold text-foreground">
              Technologies & tools
            </h2>
            <div className="flex flex-wrap gap-2">
              {course.technologies.map((t, i) => (
                <span key={i} className={`rounded-full border px-2.5 py-1 text-xs font-medium ${accent.chip}`}>
                  {t}
                </span>
              ))}
            </div>
          </section>
        ) : null}
        {course.skills.length > 0 ? (
          <section className="rounded-2xl border border-border bg-card/60 p-5" aria-labelledby="skills-title">
            <h2 id="skills-title" className="mb-3 text-base font-semibold text-foreground">
              Skills you&apos;ll practice
            </h2>
            <div className="flex flex-wrap gap-2">
              {course.skills.map((s, i) => (
                <span key={i} className="rounded-full border border-border bg-muted px-2.5 py-1 text-xs font-medium text-muted-foreground">
                  {s}
                </span>
              ))}
            </div>
          </section>
        ) : null}
      </div>

      {/* Final assessment + project teaser */}
      <div className="grid gap-6 md:grid-cols-2">
        <section className="rounded-2xl border border-teal-500/25 bg-gradient-to-br from-teal-500/[0.06] to-transparent p-5">
          <h2 className="mb-2 flex items-center gap-2 text-base font-semibold text-foreground">
            <Flag className="h-4 w-4 text-teal-500" aria-hidden="true" />
            Final assessment
          </h2>
          <p className="text-sm leading-relaxed text-foreground/85">
            {course.assessment.length} questions across concepts, code reading and debugging —
            pass with {course.passScore}% to complete the course.
          </p>
        </section>
        {course.project ? (
          <section className="rounded-2xl border border-amber-500/25 bg-gradient-to-br from-amber-500/[0.06] to-transparent p-5">
            <h2 className="mb-2 flex items-center gap-2 text-base font-semibold text-foreground">
              <Hammer className="h-4 w-4 text-amber-500" aria-hidden="true" />
              Capstone project
            </h2>
            <p className="text-sm leading-relaxed text-foreground/85">
              {course.project.summary}
            </p>
          </section>
        ) : null}
      </div>

      <button
        type="button"
        onClick={onStart}
        className={`flex w-full items-center justify-center gap-2 rounded-xl px-6 py-3.5 text-base font-semibold text-white shadow-lg shadow-black/20 transition-transform hover:scale-[1.01] active:scale-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-500 ${accent.dot}`}
      >
        <BookOpen className="h-5 w-5" aria-hidden="true" />
        Start lesson 1
        <ArrowRight className="h-4 w-4" aria-hidden="true" />
      </button>

      {course.interviewQs.length > 0 ? (
        <section aria-labelledby="interview-title" className="rounded-2xl border border-border bg-card/60 p-5 sm:p-6">
          <h2 id="interview-title" className="mb-2 flex items-center gap-2.5 text-base font-semibold text-foreground">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg border border-violet-500/30 bg-violet-500/10 text-violet-600 dark:text-violet-400">
              <Sparkles className="h-4 w-4" aria-hidden="true" />
            </span>
            Interview preparation
          </h2>
          <p className="mb-3 text-sm text-muted-foreground">
            How this course&apos;s knowledge reads in a hiring conversation — try answering before revealing.
          </p>
          {course.interviewQs.map((qa, i) => (
            <InterviewQuestion key={i} q={qa.q} a={qa.a} />
          ))}
        </section>
      ) : null}
    </div>
  );
}

// ---------------------------------------------------------------------------

function LessonPane({
  course,
  order,
  completedLessons,
  completeLesson,
  router,
}: {
  course: Course;
  order: number;
  completedLessons: number[];
  completeLesson: (order: number) => void;
  router: ReturnType<typeof useRouter>;
}) {
  const { data, isLoading, isError } = useQuery({
    queryKey: ["course", course.courseSlug, "lesson", order],
    queryFn: () => fetchLesson(course.courseSlug, order),
  });

  // lesson analytics
  React.useEffect(() => {
    trackEvent("lesson_view", course.courseSlug, `lesson-${order}`);
  }, [course.courseSlug, order]);

  const lesson = data?.lesson;
  const isDone = completedLessons.includes(order);
  const hasNext = order < course.lessonCount;

  if (isLoading) {
    return (
      <div className="space-y-4" aria-busy="true" aria-label="Loading lesson">
        <div className="h-7 w-2/3 animate-pulse rounded-lg bg-muted" />
        <div className="h-24 animate-pulse rounded-xl bg-muted/60" />
        <div className="h-4 w-full animate-pulse rounded bg-muted" />
        <div className="h-4 w-5/6 animate-pulse rounded bg-muted" />
        <div className="h-40 animate-pulse rounded-xl bg-muted/60" />
      </div>
    );
  }

  if (isError || !lesson) {
    return (
      <div className="rounded-2xl border border-border p-8 text-center">
        <p className="text-sm text-muted-foreground">
          This lesson couldn&apos;t be loaded. It may be unpublished.
        </p>
        <Link
          href={courseHref(course.courseSlug)}
          className="mt-3 inline-flex items-center gap-2 text-sm font-medium text-teal-600 hover:underline dark:text-teal-400"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden="true" />
          Back to course
        </Link>
      </div>
    );
  }

  return (
    <motion.article
      key={order}
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25 }}
      className="max-w-[46rem]"
    >
      {/* Lesson header */}
      <header className="mb-6">
        <div className="mb-2 flex flex-wrap items-center gap-2 text-xs">
          <span className="rounded-full border border-border bg-muted px-2.5 py-0.5 font-mono font-semibold text-muted-foreground">
            Lesson {order} / {course.lessonCount}
          </span>
          <span className="flex items-center gap-1 rounded-full border border-border bg-muted px-2.5 py-0.5 text-muted-foreground">
            <Clock className="h-3 w-3" aria-hidden="true" />
            {lesson.minutes} min
          </span>
          <span className="flex items-center gap-1 rounded-full border border-border bg-muted px-2.5 py-0.5 text-muted-foreground">
            <Zap className="h-3 w-3" aria-hidden="true" />
            {lesson.xp} XP
          </span>
          {isDone ? (
            <span className="flex items-center gap-1 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2.5 py-0.5 font-medium text-emerald-600 dark:text-emerald-400">
              <Check className="h-3 w-3" aria-hidden="true" />
              Completed
            </span>
          ) : null}
        </div>
        <h2 className="text-xl font-bold tracking-tight text-foreground sm:text-2xl">
          {lesson.title}
        </h2>
        {lesson.objective ? (
          <div className="mt-3 rounded-xl border-l-2 border-teal-500/70 bg-teal-500/[0.05] px-4 py-3.5">
            <p className="text-sm leading-relaxed text-foreground/90">
              <span className="font-semibold text-teal-600 dark:text-teal-400">
                In this lesson you will:{" "}
              </span>
              {renderInline(lesson.objective, "obj")}
            </p>
          </div>
        ) : null}
        {lesson.why ? (
          <div className="mt-3 px-4 text-sm leading-relaxed text-muted-foreground">
            <span className="font-semibold text-foreground/80">Why this matters — </span>
            {renderInline(lesson.why, "why")}
          </div>
        ) : null}
      </header>

      {/* Content blocks */}
      <LessonBlocks blocks={lesson.blocks} />

      {/* Exercise */}
      {lesson.exercise ? (
        <div className="mt-8">
          <ExerciseCard exercise={lesson.exercise} />
        </div>
      ) : null}

      {/* Quiz */}
      {lesson.quiz.length > 0 ? (
        <div className="mt-8">
          <QuizCard
            questions={lesson.quiz}
            courseSlug={course.courseSlug}
            label={`lesson-${order}`}
            title="Quick quiz"
          />
        </div>
      ) : null}

      {/* Summary + next */}
      {lesson.summary || lesson.next ? (
        <section className="mt-8 rounded-2xl border border-border bg-card/60 p-5 sm:p-6">
          {lesson.summary ? (
            <>
              <h3 className="mb-3 text-sm font-semibold uppercase tracking-wider text-muted-foreground">
                Lesson summary
              </h3>
              <p className="text-[15px] leading-relaxed text-foreground/90">
                {renderInline(lesson.summary, "sum")}
              </p>
            </>
          ) : null}
          {lesson.next ? (
            <div className="mt-4 rounded-xl border border-teal-500/25 bg-teal-500/[0.05] px-4 py-3">
              <p className="text-sm leading-relaxed text-foreground/90">
                <span className="font-semibold text-teal-600 dark:text-teal-400">
                  What&apos;s next:{" "}
                </span>
                {renderInline(lesson.next, "next")}
              </p>
            </div>
          ) : null}
        </section>
      ) : null}

      {/* Footer nav */}
      <footer className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex gap-2">
          {order > 1 ? (
            <Link
              href={lessonHref(course.courseSlug, order - 1)}
              className="flex items-center gap-1.5 rounded-lg border border-border px-3.5 py-2 text-sm font-medium text-foreground/80 transition-colors hover:bg-muted"
            >
              <ArrowLeft className="h-4 w-4" aria-hidden="true" />
              Lesson {order - 1}
            </Link>
          ) : (
            <Link
              href={courseHref(course.courseSlug)}
              className="flex items-center gap-1.5 rounded-lg border border-border px-3.5 py-2 text-sm font-medium text-foreground/80 transition-colors hover:bg-muted"
            >
              <ArrowLeft className="h-4 w-4" aria-hidden="true" />
              Overview
            </Link>
          )}
        </div>
        <div className="flex gap-2">
          {!isDone ? (
            <button
              type="button"
              onClick={() => completeLesson(order)}
              className="flex items-center gap-2 rounded-lg border border-emerald-500/40 bg-emerald-500/10 px-4 py-2 text-sm font-semibold text-emerald-700 transition-all hover:bg-emerald-500/20 dark:text-emerald-300"
            >
              <Check className="h-4 w-4" aria-hidden="true" />
              Mark complete
            </button>
          ) : null}
          {hasNext ? (
            <Link
              href={lessonHref(course.courseSlug, order + 1)}
              onClick={() => completeLesson(order)}
              className="flex items-center gap-2 rounded-lg border border-border bg-foreground px-4 py-2 text-sm font-semibold text-background transition-transform hover:scale-[1.02]"
            >
              Next lesson
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </Link>
          ) : (
            <Link
              href={lessonHref(course.courseSlug, "assessment")}
              onClick={() => completeLesson(order)}
              className="flex items-center gap-2 rounded-lg border border-teal-500/40 bg-teal-500/10 px-4 py-2 text-sm font-semibold text-teal-700 transition-transform hover:scale-[1.02] dark:text-teal-300"
            >
              <Flag className="h-4 w-4" aria-hidden="true" />
              Final assessment
            </Link>
          )}
        </div>
      </footer>
    </motion.article>
  );
}

// ---------------------------------------------------------------------------

function AssessmentView({
  course,
  accent,
  onResult,
  courseSlugForAnalytics,
}: {
  course: Course;
  accent: ReturnType<typeof getAccent>;
  onResult: (score: number, passed: boolean) => void;
  courseSlugForAnalytics: string;
}) {
  if (course.assessment.length === 0) {
    return (
      <div className="rounded-2xl border border-border p-8 text-center text-sm text-muted-foreground">
        The final assessment for this course is being prepared.
      </div>
    );
  }
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-6"
    >
      <header>
        <div className="mb-2 flex items-center gap-2 text-xs">
          <span className={`rounded-full border px-2.5 py-0.5 font-mono font-semibold ${accent.chip}`}>
            Course finale
          </span>
        </div>
        <h2 className="text-xl font-bold tracking-tight text-foreground sm:text-2xl">
          Final assessment
        </h2>
        <p className="mt-2 max-w-2xl text-sm leading-relaxed text-muted-foreground">
          {course.assessment.length} questions mixing concepts, code reading, debugging and applied
          scenarios. Score {course.passScore}% or higher to complete the course — every answer
          explains itself, so a wrong turn is still a lesson.
        </p>
      </header>
      <QuizCard
        questions={course.assessment}
        courseSlug={courseSlugForAnalytics}
        label="assessment"
        title="Final assessment"
        isAssessment
        passScore={course.passScore}
        onAssessmentResult={onResult}
      />
      {course.project ? <ProjectCard project={course.project} /> : null}
    </motion.div>
  );
}

function ProjectCard({
  project,
}: {
  project: NonNullable<Course["project"]>;
}) {
  return (
    <section className="rounded-2xl border border-amber-500/30 bg-gradient-to-b from-amber-500/[0.05] to-transparent p-5 sm:p-6" aria-labelledby="proj-title">
      <h2 id="proj-title" className="mb-2 flex items-center gap-2.5 text-base font-semibold text-foreground">
        <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-500/15 text-amber-600 dark:text-amber-400">
          <Hammer className="h-4 w-4" aria-hidden="true" />
        </span>
        Capstone project — {project.title}
      </h2>
      <p className="mb-4 text-sm leading-relaxed text-foreground/85">{project.summary}</p>
      <div className="grid gap-5 md:grid-cols-2">
        <div>
          <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Functional requirements
          </h3>
          <ul className="space-y-2">
            {project.requirements.map((r, i) => (
              <li key={i} className="flex gap-2 text-sm leading-relaxed text-foreground/85">
                <Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-amber-500/70" aria-hidden="true" />
                <span>{renderInline(r, `pr-${i}`)}</span>
              </li>
            ))}
          </ul>
        </div>
        <div>
          <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Implementation steps
          </h3>
          <ol className="space-y-2">
            {project.steps.map((s, i) => (
              <li key={i} className="flex gap-2 text-sm leading-relaxed text-foreground/85">
                <span className="mt-0.5 flex h-4.5 w-4.5 shrink-0 items-center justify-center rounded-full bg-amber-500/15 font-mono text-[10px] font-semibold text-amber-600 dark:text-amber-400" aria-hidden="true">
                  {i + 1}
                </span>
                <span>{renderInline(s, `ps-${i}`)}</span>
              </li>
            ))}
          </ol>
        </div>
        <div>
          <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Evaluation criteria
          </h3>
          <ul className="space-y-2">
            {project.evaluation.map((e, i) => (
              <li key={i} className="flex gap-2 text-sm leading-relaxed text-foreground/85">
                <Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-500/70" aria-hidden="true" />
                <span>{renderInline(e, `pe-${i}`)}</span>
              </li>
            ))}
          </ul>
        </div>
        <div>
          <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Stretch goals
          </h3>
          <ul className="space-y-2">
            {project.stretch.map((s, i) => (
              <li key={i} className="flex gap-2 text-sm leading-relaxed text-foreground/85">
                <Sparkles className="mt-0.5 h-3.5 w-3.5 shrink-0 text-violet-500/70" aria-hidden="true" />
                <span>{renderInline(s, `px-${i}`)}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
      <div className="mt-4 rounded-lg border-l-2 border-amber-500/50 bg-amber-500/[0.05] px-4 py-2.5 text-sm text-foreground/85">
        <span className="font-semibold text-amber-600 dark:text-amber-400">Architecture — </span>
        {project.architecture}
      </div>
    </section>
  );
}
