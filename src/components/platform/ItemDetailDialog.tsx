"use client";

// ItemDetailDialog — item preview with contextual depth:
//  · Roadmap items render an interactive step-graph with per-step progress
//    (persisted to My Library) and a live progress bar.
//  · Simulator items surface a "Launch sandbox" CTA into the playable view.
import * as React from "react";
import Image from "next/image";
import Link from "next/link";
import { motion } from "framer-motion";
import {
  ArrowRight,
  BookOpen,
  Bookmark,
  Check,
  CheckCircle2,
  Clock,
  Eye,
  Hourglass,
  Play,
  Route,
  Sparkles,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { getAccent } from "@/lib/accent";
import { cn } from "@/lib/utils";
import { useLibrary, useLibraryHydrated } from "@/lib/library-store";
import { isPlayableSimulator, simulatorViewHref } from "@/lib/simulators";
import type { ResourceItemView, StepView } from "@/lib/platform";

interface ItemDetailDialogProps {
  item: ResourceItemView | null;
  onOpenChange: (open: boolean) => void;
}

export function ItemDetailDialog({ item, onOpenChange }: ItemDetailDialogProps) {
  const { toast } = useToast();
  const hydrated = useLibraryHydrated();
  const saved = useLibrary((s) => (item ? s.saved.includes(item.slug) : false));
  const completed = useLibrary((s) => (item ? s.completed.includes(item.slug) : false));
  const toggleSaved = useLibrary((s) => s.toggleSaved);
  const toggleCompleted = useLibrary((s) => s.toggleCompleted);
  const pushRecent = useLibrary((s) => s.pushRecent);

  // Track recently viewed (for the "Jump back in" strip) whenever an item opens
  React.useEffect(() => {
    if (!item) return;
    pushRecent({
      slug: item.slug,
      title: item.title,
      level: item.level,
      duration: item.duration,
      categorySlug: item.categorySlug,
      categoryTitle: item.categoryTitle,
      categoryIcon: item.categoryIcon,
      categoryAccent: item.categoryAccent,
    });
  }, [item, pushRecent]);

  if (!item) return null;
  const a = getAccent(item.categoryAccent);
  const isSimulator = item.categorySlug === "simulators";
  const playable = isSimulator && isPlayableSimulator(item.slug);

  return (
    <Dialog open={!!item} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] gap-0 overflow-y-auto p-0 sm:max-w-lg">
        <div className={cn("relative overflow-hidden border-b p-6", a.gradient)}>
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0 opacity-60 [background-image:radial-gradient(circle,var(--border)_1px,transparent_1px)] [background-size:18px_18px] [mask-image:radial-gradient(ellipse_80%_100%_at_60%_0%,black,transparent)]"
          />
          <div className="relative flex items-center gap-4">
            <div className={cn("relative size-16 shrink-0 overflow-hidden rounded-xl ring-1", a.iconWrap)}>
              <Image
                src={item.categoryIcon}
                alt={`${item.categoryTitle} category icon`}
                fill
                sizes="64px"
                className="object-cover"
              />
            </div>
            <div className="min-w-0">
              <DialogHeader className="space-y-1.5 text-left">
                <DialogTitle className="text-lg font-bold leading-tight">
                  {item.title}
                </DialogTitle>
                <DialogDescription className="flex items-center gap-1.5 text-xs">
                  <Route aria-hidden className="size-3.5" />
                  {item.categoryTitle} · {item.level}
                </DialogDescription>
              </DialogHeader>
            </div>
          </div>
        </div>

        <div className="space-y-4 p-6">
          <p className="text-sm leading-relaxed text-muted-foreground">
            {item.description}
          </p>

          <div className="flex flex-wrap items-center gap-2">
            {item.duration ? (
              <Badge variant="outline" className="gap-1.5 font-normal">
                <Clock aria-hidden className="size-3" />
                {item.duration}
              </Badge>
            ) : null}
            {item.featured ? (
              <Badge variant="outline" className="gap-1.5 font-normal">
                <Sparkles aria-hidden className="size-3" />
                Featured
              </Badge>
            ) : null}
            <Badge variant="outline" className="gap-1.5 font-normal">
              <Eye aria-hidden className="size-3" />
              {item.views} views
            </Badge>
            {item.tags.map((t) => (
              <span
                key={t}
                className="rounded bg-muted px-2 py-0.5 font-mono text-[11px] text-muted-foreground"
              >
                {t}
              </span>
            ))}
          </div>

          {/* Roadmap step-graph */}
          {item.steps.length > 0 && (
            <StepGraph item={item} steps={item.steps} />
          )}

          {/* Personal library actions */}
          {hydrated && (
            <div className="flex flex-wrap gap-2">
              <Button
                variant="outline"
                size="sm"
                className={cn(
                  "h-8 gap-1.5 rounded-lg text-xs",
                  saved && "border-amber-500/50 text-amber-600 dark:text-amber-400"
                )}
                onClick={() => {
                  const now = toggleSaved(item.slug);
                  toast({
                    title: now ? "Saved to your library" : "Removed from library",
                    description: now
                      ? `“${item.title}” is bookmarked — find it under My Library.`
                      : `“${item.title}” was removed from your saved items.`,
                  });
                }}
                aria-pressed={saved}
              >
                <Bookmark
                  aria-hidden
                  className={cn("size-3.5", saved && "fill-amber-500")}
                />
                {saved ? "Saved" : "Save for later"}
              </Button>
              <Button
                variant="outline"
                size="sm"
                className={cn(
                  "h-8 gap-1.5 rounded-lg text-xs",
                  completed && "border-emerald-500/50 text-emerald-600 dark:text-emerald-400"
                )}
                onClick={() => {
                  const now = toggleCompleted(item.slug);
                  toast({
                    title: now ? "Marked as complete 🏁" : "Marked as in progress",
                    description: now
                      ? `“${item.title}” moved to your completed list.`
                      : `“${item.title}” is back on your active list.`,
                  });
                }}
                aria-pressed={completed}
              >
                <Check aria-hidden className="size-3.5" />
                {completed ? "Completed" : "Mark complete"}
              </Button>
            </div>
          )}

          <div className="flex flex-col gap-2 pt-2 sm:flex-row">
            {playable ? (
              <Button asChild className="gap-2 sm:flex-1">
                <Link href={simulatorViewHref(item.slug)} onClick={() => onOpenChange(false)}>
                  <Play aria-hidden className="size-4" />
                  Launch sandbox
                </Link>
              </Button>
            ) : item.lessonCount && item.lessonCount > 0 ? (
              <Button asChild className="gap-2 sm:flex-1">
                <Link href={`/?course=${item.slug}`} onClick={() => onOpenChange(false)}>
                  <BookOpen aria-hidden className="size-4" />
                  Start course · {item.lessonCount} lessons
                </Link>
              </Button>
            ) : (
              <Button
                className="gap-2 sm:flex-1"
                onClick={() => {
                  toast({
                    title: isSimulator ? "Sandbox in the lab 🧪" : "Enrolled 🎉",
                    description: isSimulator
                      ? `“${item.title}” is being built — the Flexbox sandbox is live today.`
                      : `“${item.title}” is now on your learning queue.`,
                  });
                  onOpenChange(false);
                }}
              >
                {isSimulator ? "Notify me" : "Start learning"}
                <ArrowRight aria-hidden className="size-4" />
              </Button>
            )}
            <Button asChild variant="outline" className="gap-2">
              <Link href={`/?category=${item.categorySlug}`}>
                Browse {item.categoryTitle}
              </Link>
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ---------------------------------------------------------------------------
// StepGraph — vertical roadmap timeline with checkable milestone nodes
// ---------------------------------------------------------------------------

function StepGraph({ item, steps }: { item: ResourceItemView; steps: StepView[] }) {
  const { toast } = useToast();
  const hydrated = useLibraryHydrated();
  // Stable record reference — derive the per-item array outside the selector.
  const progressMap = useLibrary((s) => s.stepProgress);
  const toggleStep = useLibrary((s) => s.toggleStep);
  const done = hydrated ? progressMap[item.slug] ?? [] : [];
  const total = steps.length;
  const pct = total > 0 ? Math.round((done.length / total) * 100) : 0;
  const nextIndex = steps.findIndex((_, i) => !done.includes(i));
  const totalHours = steps.reduce((sum, s) => sum + (s.hours ?? 0), 0);
  const a = getAccent(item.categoryAccent);

  return (
    <section
      aria-label={`Roadmap steps — ${done.length} of ${total} complete`}
      className="overflow-hidden rounded-xl border"
    >
      <div className={cn("border-b bg-muted/40 px-4 py-3", a.gradient)}>
        <div className="flex items-center justify-between gap-2">
          <h3 className="flex items-center gap-2 text-sm font-semibold">
            <Route aria-hidden className={cn("size-4", a.text)} />
            Learning path
          </h3>
          <span className="text-xs tabular-nums text-muted-foreground">
            {done.length}/{total} done
            {totalHours > 0 && ` · ~${totalHours}h`}
          </span>
        </div>
        {/* Progress bar */}
        <div
          role="progressbar"
          aria-valuenow={pct}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label="Roadmap progress"
          className="mt-2.5 h-1.5 overflow-hidden rounded-full bg-background/80"
        >
          <motion.div
            className={cn("h-full rounded-full transition-all duration-500", a.dot)}
            initial={{ width: 0 }}
            animate={{ width: `${pct}%` }}
          />
        </div>
      </div>

      <ol className="max-h-[42vh] overflow-y-auto p-2">
        {steps.map((step, i) => {
          const isDone = done.includes(i);
          const isNext = i === nextIndex;
          return (
            <li key={`${step.title}-${i}`} className="relative flex gap-3 pb-1">
              {/* Connector line */}
              {i < total - 1 && (
                <span
                  aria-hidden
                  className={cn(
                    "absolute left-[15px] top-8 -bottom-1 w-px",
                    isDone ? a.dot : "bg-border"
                  )}
                />
              )}
              <button
                type="button"
                onClick={() => {
                  const now = toggleStep(item.slug, i);
                  if (now && done.length + 1 === total) {
                    toast({
                      title: "Roadmap complete 🎉",
                      description: `Every step of “${item.title}” is checked off. Time for the next path.`,
                    });
                  }
                }}
                aria-pressed={isDone}
                aria-label={`${isDone ? "Mark" : "Unmark"} step ${i + 1}: ${step.title}`}
                className={cn(
                  "relative z-10 mt-1 flex size-8 shrink-0 items-center justify-center rounded-full border-2 text-xs font-bold transition-all duration-200",
                  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
                  isDone
                    ? cn("text-white", a.dot)
                    : "border-border bg-background text-muted-foreground hover:border-foreground/40"
                )}
              >
                {isDone ? (
                  <Check aria-hidden className="size-4" />
                ) : (
                  <span className="tabular-nums">{i + 1}</span>
                )}
              </button>
              <div
                className={cn(
                  "mb-2 min-w-0 flex-1 rounded-lg border px-3 py-2.5 transition-all duration-200",
                  isDone && "border-transparent bg-muted/40",
                  isNext && !isDone && a.chip
                )}
              >
                <div className="flex items-center gap-2">
                  <p
                    className={cn(
                      "min-w-0 flex-1 truncate text-sm font-medium",
                      isDone && "text-muted-foreground line-through decoration-1"
                    )}
                  >
                    {step.title}
                  </p>
                  {step.hours != null && (
                    <span className="inline-flex shrink-0 items-center gap-1 text-[10px] tabular-nums text-muted-foreground">
                      <Hourglass aria-hidden className="size-3" />
                      {step.hours}h
                    </span>
                  )}
                </div>
                <p className="mt-0.5 line-clamp-2 text-xs leading-relaxed text-muted-foreground">
                  {step.detail}
                </p>
                {isNext && !isDone && (
                  <span className={cn("mt-1.5 inline-flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wide", a.text)}>
                    <CheckCircle2 aria-hidden className="size-3" />
                    Next up
                  </span>
                )}
              </div>
            </li>
          );
        })}
      </ol>
    </section>
  );
}
