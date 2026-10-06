"use client";

// QuizCard — interactive end-of-lesson quiz / final assessment.
// Every question carries options, the correct answer and an explanation;
// selections lock per question with instant feedback, then explanations.
import * as React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Award, Check, RotateCcw, X } from "lucide-react";
import type { QuizQuestion } from "@/lib/course-types";
import { trackEvent } from "../platform-data";
import { renderInline } from "./LessonBlocks";

const DIFFICULTY_STYLES: Record<string, string> = {
  easy: "border-emerald-500/25 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
  medium: "border-amber-500/25 bg-amber-500/10 text-amber-600 dark:text-amber-400",
  hard: "border-rose-500/25 bg-rose-500/10 text-rose-600 dark:text-rose-400",
};

export function QuizCard({
  questions,
  courseSlug,
  label,
  title = "Quick quiz",
  isAssessment = false,
  passScore,
  onAssessmentResult,
}: {
  questions: QuizQuestion[];
  courseSlug: string;
  label: string;
  title?: string;
  isAssessment?: boolean;
  passScore?: number;
  onAssessmentResult?: (score: number, passed: boolean) => void;
}) {
  const [answers, setAnswers] = React.useState<Record<number, number>>({});
  const answeredCount = Object.keys(answers).length;

  const answerQuestion = (qi: number, oi: number) => {
    if (answers[qi] !== undefined) return; // locked once answered
    const next = { ...answers, [qi]: oi };
    setAnswers(next);
    trackEvent("quiz_attempt", courseSlug, `${label}:q${qi + 1}`);
  };

  const correctCount = questions.reduce(
    (sum, q, qi) => sum + (answers[qi] === q.answer ? 1 : 0),
    0
  );
  const allAnswered = answeredCount === questions.length && questions.length > 0;
  const score = questions.length
    ? Math.round((correctCount / questions.length) * 100)
    : 0;
  const passed = score >= (passScore ?? 70);

  // Report assessment results once every question is answered
  React.useEffect(() => {
    if (isAssessment && allAnswered && onAssessmentResult) {
      onAssessmentResult(score, passed);
      if (passed) {
        trackEvent("assessment_pass", courseSlug, `score:${score}`);
      }
    }
     
  }, [allAnswered]);

  const reset = () => setAnswers({});

  return (
    <section
      aria-label={title}
      className="rounded-2xl border border-border bg-card/60 p-5 sm:p-6"
    >
      <header className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2.5">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-teal-500/15 text-teal-600 dark:text-teal-400">
            {isAssessment ? <Award className="h-4 w-4" aria-hidden="true" /> : <Check className="h-4 w-4" aria-hidden="true" />}
          </span>
          <div>
            <h3 className="text-base font-semibold text-foreground">{title}</h3>
            <p className="text-xs text-muted-foreground">
              {isAssessment
                ? `${questions.length} questions · ${passScore ?? 70}% to pass`
                : `${questions.length} questions · instant feedback`}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 font-mono text-xs text-muted-foreground">
          <span aria-live="polite">
            {answeredCount}/{questions.length} answered
          </span>
          {answeredCount > 0 ? (
            <button
              type="button"
              onClick={reset}
              className="flex items-center gap-1 rounded-md border border-border px-2 py-1 text-[11px] font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            >
              <RotateCcw className="h-3 w-3" aria-hidden="true" />
              Reset
            </button>
          ) : null}
        </div>
      </header>

      <div className="space-y-5">
        {questions.map((q, qi) => {
          const chosen = answers[qi];
          const answered = chosen !== undefined;
          const correct = chosen === q.answer;
          return (
            <div
              key={qi}
              className={`rounded-xl border p-4 transition-colors ${
                !answered
                  ? "border-border bg-background/40"
                  : correct
                    ? "border-emerald-500/40 bg-emerald-500/[0.05]"
                    : "border-rose-500/40 bg-rose-500/[0.04]"
              }`}
            >
              <div className="mb-3 flex items-start justify-between gap-3">
                <p className="text-sm font-medium leading-relaxed text-foreground">
                  <span className="mr-2 font-mono text-xs text-muted-foreground">{qi + 1}.</span>
                  {renderInline(q.q, `qq-${qi}`)}
                </p>
                {q.difficulty ? (
                  <span
                    className={`shrink-0 rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${DIFFICULTY_STYLES[q.difficulty] ?? DIFFICULTY_STYLES.medium}`}
                  >
                    {q.difficulty}
                  </span>
                ) : null}
              </div>
              <div className="grid gap-2 sm:grid-cols-2" role="radiogroup" aria-label={`Question ${qi + 1}`}>
                {q.options.map((opt, oi) => {
                  const isChosen = chosen === oi;
                  const isAnswer = q.answer === oi;
                  const showCorrect = answered && isAnswer;
                  const showWrong = answered && isChosen && !isAnswer;
                  return (
                    <button
                      key={oi}
                      type="button"
                      role="radio"
                      aria-checked={isChosen}
                      disabled={answered}
                      onClick={() => answerQuestion(qi, oi)}
                      className={`flex items-start gap-2.5 rounded-lg border px-3.5 py-2.5 text-left text-sm transition-all focus-visible:outline focus-visible:outline-2 focus-visible:outline-teal-500 ${
                        !answered
                          ? "border-border bg-background hover:border-teal-500/50 hover:bg-teal-500/[0.04] cursor-pointer"
                          : showCorrect
                            ? "border-emerald-500/50 bg-emerald-500/10 cursor-default"
                            : showWrong
                              ? "border-rose-500/50 bg-rose-500/10 cursor-default"
                              : "border-border/60 bg-background/50 opacity-60 cursor-default"
                      }`}
                    >
                      <span className="mt-0.5 flex h-4.5 w-4.5 shrink-0 items-center justify-center rounded-full border font-mono text-[10px] font-semibold">
                        {String.fromCharCode(65 + oi)}
                      </span>
                      <span className="flex-1 text-foreground/90">{renderInline(opt, `op-${qi}-${oi}`)}</span>
                      {showCorrect ? (
                        <Check className="mt-0.5 h-4 w-4 shrink-0 text-emerald-500" aria-label="Correct answer" />
                      ) : showWrong ? (
                        <X className="mt-0.5 h-4 w-4 shrink-0 text-rose-500" aria-label="Your incorrect choice" />
                      ) : null}
                    </button>
                  );
                })}
              </div>
              <AnimatePresence>
                {answered ? (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    className="overflow-hidden"
                  >
                    <div
                      className={`mt-3 rounded-lg border-l-2 px-3.5 py-2.5 text-sm leading-relaxed ${
                        correct
                          ? "border-emerald-500/60 bg-emerald-500/[0.06] text-foreground/90"
                          : "border-amber-500/60 bg-amber-500/[0.06] text-foreground/90"
                      }`}
                      role="status"
                    >
                      <span className={`font-semibold ${correct ? "text-emerald-600 dark:text-emerald-400" : "text-amber-600 dark:text-amber-400"}`}>
                        {correct ? "Correct — " : "Not quite — "}
                      </span>
                      {renderInline(q.explain, `ex-${qi}`)}
                    </div>
                  </motion.div>
                ) : null}
              </AnimatePresence>
            </div>
          );
        })}
      </div>

      {isAssessment && allAnswered ? (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className={`mt-5 rounded-xl border p-5 text-center ${
            passed
              ? "border-emerald-500/40 bg-gradient-to-b from-emerald-500/[0.1] to-transparent"
              : "border-amber-500/40 bg-gradient-to-b from-amber-500/[0.08] to-transparent"
          }`}
          role="status"
        >
          <p className="font-mono text-3xl font-bold tracking-tight text-foreground">
            {score}%
          </p>
          <p className={`mt-1 text-sm font-semibold ${passed ? "text-emerald-600 dark:text-emerald-400" : "text-amber-600 dark:text-amber-400"}`}>
            {passed
              ? "Passed — course complete! 🎉"
              : `Not passed — ${passScore ?? 70}% required. Review the explanations and try again.`}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            {correctCount} of {questions.length} correct
          </p>
        </motion.div>
      ) : null}
    </section>
  );
}
