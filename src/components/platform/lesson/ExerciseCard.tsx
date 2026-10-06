"use client";

// ExerciseCard — "Try It Yourself" with progressive hints (reveal one at a
// time), then the solution + "why this works", per the content spec.
import * as React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Check, Dumbbell, Lightbulb, Sparkles } from "lucide-react";
import type { Exercise } from "@/lib/course-types";
import { CodeBlock, renderInline } from "./LessonBlocks";

export function ExerciseCard({ exercise }: { exercise: Exercise }) {
  const [hintsShown, setHintsShown] = React.useState(0);
  const [solutionShown, setSolutionShown] = React.useState(false);
  const maxHints = exercise.hints.length;

  return (
    <section
      aria-label="Try it yourself"
      className="rounded-2xl border border-amber-500/30 bg-gradient-to-b from-amber-500/[0.06] to-transparent p-5 sm:p-6"
    >
      <header className="mb-3 flex items-center gap-2.5">
        <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-500/15 text-amber-600 dark:text-amber-400">
          <Dumbbell className="h-4 w-4" aria-hidden="true" />
        </span>
        <h3 className="text-base font-semibold text-foreground">Try it yourself</h3>
      </header>

      <p className="text-[15px] leading-relaxed text-foreground/90">
        {renderInline(exercise.prompt, "ex-prompt")}
      </p>

      {exercise.code ? (
        <div className="mt-1">
          <CodeBlock code={exercise.code} lang={exercise.lang ?? "ts"} caption="Starting point" />
        </div>
      ) : null}

      {/* Progressive hints */}
      {maxHints > 0 ? (
        <div className="mt-4 space-y-2.5">
          {exercise.hints.slice(0, hintsShown).map((hint, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex gap-2.5 rounded-lg border border-amber-500/25 bg-amber-500/[0.07] px-3.5 py-2.5"
              role="status"
            >
              <Lightbulb className="mt-0.5 h-4 w-4 shrink-0 text-amber-500" aria-hidden="true" />
              <p className="text-sm leading-relaxed text-foreground/90">
                <span className="font-semibold text-amber-600 dark:text-amber-400">
                  Hint {i + 1}:{" "}
                </span>
                {renderInline(hint, `hint-${i}`)}
              </p>
            </motion.div>
          ))}

          {hintsShown < maxHints ? (
            <button
              type="button"
              onClick={() => setHintsShown((h) => h + 1)}
              className="flex items-center gap-2 rounded-lg border border-amber-500/35 bg-amber-500/10 px-3.5 py-2 text-sm font-medium text-amber-700 transition-all hover:bg-amber-500/20 hover:shadow-sm hover:shadow-amber-500/10 focus-visible:outline focus-visible:outline-2 focus-visible:outline-amber-500 dark:text-amber-300"
            >
              <Lightbulb className="h-4 w-4" aria-hidden="true" />
              Show Hint {hintsShown + 1}
              <span className="font-mono text-[10px] text-amber-600/70 dark:text-amber-400/70">
                {hintsShown}/{maxHints}
              </span>
            </button>
          ) : null}
        </div>
      ) : null}

      {/* Solution reveal */}
      <div className="mt-4">
        {!solutionShown ? (
          <button
            type="button"
            onClick={() => setSolutionShown(true)}
            className="flex items-center gap-2 rounded-lg border border-border bg-background px-3.5 py-2 text-sm font-medium text-foreground transition-all hover:border-teal-500/50 hover:bg-teal-500/[0.05] focus-visible:outline focus-visible:outline-2 focus-visible:outline-teal-500"
          >
            <Sparkles className="h-4 w-4 text-teal-500" aria-hidden="true" />
            Reveal solution
          </button>
        ) : (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className="rounded-xl border border-teal-500/30 bg-teal-500/[0.04] p-4"
          >
            <p className="mb-2 flex items-center gap-2 text-sm font-semibold text-teal-700 dark:text-teal-300">
              <Check className="h-4 w-4" aria-hidden="true" />
              Solution
            </p>
            <CodeBlock code={exercise.solution} lang={exercise.lang ?? "ts"} />
            {exercise.why ? (
              <div className="mt-2 rounded-lg border-l-2 border-teal-500/50 bg-teal-500/[0.05] px-3.5 py-2.5">
                <p className="text-sm leading-relaxed text-foreground/90">
                  <span className="font-semibold text-teal-600 dark:text-teal-400">
                    Why this works:{" "}
                  </span>
                  {renderInline(exercise.why, "ex-why")}
                </p>
              </div>
            ) : null}
          </motion.div>
        )}
      </div>
    </section>
  );
}
