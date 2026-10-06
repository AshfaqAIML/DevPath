"use client";

// MyLibraryView — the user's personal library: saved (bookmarked) items,
// recently viewed strip and completed items. All state is client-persisted
// (localStorage) and resolved against the live catalog via /api/resources.
import * as React from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import {
  ArrowRight,
  BookmarkCheck,
  Check,
  Clock,
  Compass,
  GraduationCap,
  History,
  Library as LibraryIcon,
  Route,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { getAccent } from "@/lib/accent";
import { isPlayableSimulator, simulatorViewHref } from "@/lib/simulators";
import { useLibrary, useLibraryHydrated } from "@/lib/library-store";
import type { ResourceItemView } from "@/lib/platform";
import { fetchItems, trackEvent, type CategoriesPayload } from "./platform-data";
import { ResourceItemCard } from "./ResourceItemCard";
import { ItemDetailDialog } from "./ItemDetailDialog";

interface MyLibraryViewProps {
  categoriesData: CategoriesPayload;
}

export function MyLibraryView({ categoriesData }: MyLibraryViewProps) {
  const hydrated = useLibraryHydrated();
  const saved = useLibrary((s) => s.saved);
  const completed = useLibrary((s) => s.completed);
  const recent = useLibrary((s) => s.recent);
  const stepProgressMap = useLibrary((s) => s.stepProgress);
  const courseProgressMap = useLibrary((s) => s.courseProgress);
  const clearRecent = useLibrary((s) => s.clearRecent);
  const [selected, setSelected] = React.useState<ResourceItemView | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ["items", "library-catalog"],
    queryFn: () => fetchItems({}),
    staleTime: 60_000,
  });

  const catalog = React.useMemo(
    () => data?.items ?? [],
    [data]
  );
  const bySlug = React.useMemo(() => {
    const m = new Map<string, ResourceItemView>();
    for (const i of catalog) m.set(i.slug, i);
    return m;
  }, [catalog]);

  const savedItems = saved.map((s) => bySlug.get(s)).filter(Boolean) as ResourceItemView[];
  const completedItems = completed.map((s) => bySlug.get(s)).filter(Boolean) as ResourceItemView[];
  // recently viewed that are still published in the catalog
  const recentEntries = recent.filter((r) => bySlug.has(r.slug));
  // Roadmaps with checked-off steps (any progress, not yet fully complete)
  const inProgressPaths = Object.entries(stepProgressMap)
    .filter(([slug, steps]) => steps.length > 0 && !completed.includes(slug))
    .map(([slug, steps]) => {
      const item = bySlug.get(slug);
      if (!item || item.steps.length === 0) return null;
      const done = steps.filter((i) => i < item.steps.length).length;
      return { item, done, total: item.steps.length, pct: Math.round((done / item.steps.length) * 100) };
    })
    .filter(Boolean)
    .sort((x, y) => y!.pct - x!.pct) as { item: ResourceItemView; done: number; total: number; pct: number }[];
  // Courses with real lesson content + started progress (not yet passed)
  const inProgressCourses = Object.entries(courseProgressMap)
    .filter(([slug, p]) => p.lessons.length > 0 && !p.completedAt)
    .map(([slug, p]) => {
      const item = bySlug.get(slug);
      const total = item?.lessonCount ?? 0;
      if (!item || total === 0) return null;
      const done = p.lessons.filter((n) => n <= total).length;
      const next = Math.min(...item.lessonCount ? Array.from({ length: total }, (_, i) => i + 1).filter((n) => !p.lessons.includes(n)) : [1], 1);
      return { item, done, total, pct: Math.round((done / total) * 100), next, assessmentScore: p.assessmentScore };
    })
    .filter(Boolean)
    .sort((x, y) => y!.pct - x!.pct) as { item: ResourceItemView; done: number; total: number; pct: number; next: number; assessmentScore?: number }[];
  const hasAnything = savedItems.length > 0 || completedItems.length > 0 || recentEntries.length > 0 || inProgressPaths.length > 0 || inProgressCourses.length > 0;
  const totalStepsDone = inProgressPaths.reduce((s, p) => s + p.done, 0);
  const totalLessonsDone = inProgressCourses.reduce((s, c) => s + c.done, 0);

  const stats = [
    { label: "Saved", value: savedItems.length, icon: BookmarkCheck },
    { label: "Lessons done", value: totalLessonsDone, icon: GraduationCap },
    { label: "Steps completed", value: totalStepsDone, icon: Route },
    { label: "Completed", value: completedItems.length, icon: Check },
  ];

  return (
    <div className="space-y-10">
      {/* Header */}
      <motion.header
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35 }}
        className="relative overflow-hidden rounded-2xl border bg-gradient-to-br from-amber-500/10 via-transparent to-transparent p-6 sm:p-8"
      >
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 opacity-60 [background-image:radial-gradient(circle,var(--border)_1px,transparent_1px)] [background-size:24px_24px] [mask-image:radial-gradient(ellipse_70%_80%_at_70%_20%,black,transparent)]"
        />
        <div className="relative flex flex-col gap-4 sm:flex-row sm:items-center">
          <span className="flex size-14 items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-lg">
            <LibraryIcon aria-hidden className="size-7" />
          </span>
          <div className="space-y-1">
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">My library</h1>
              <BadgePill />
            </div>
            <p className="max-w-xl text-sm leading-relaxed text-muted-foreground">
              Everything you bookmarked, opened or completed — kept locally on
              this device and always one click away.
            </p>
          </div>
        </div>
      </motion.header>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 sm:gap-4">
        {stats.map((s, i) => (
          <motion.div
            key={s.label}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.05 * i, duration: 0.35 }}
            className="rounded-2xl border bg-card p-4 sm:p-5"
          >
            <div className="flex items-center justify-between">
              <p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
                {s.label}
              </p>
              <s.icon aria-hidden className="size-4 text-muted-foreground" />
            </div>
            <p className="mt-1.5 text-2xl font-bold tabular-nums sm:text-3xl">
              {hydrated ? s.value : "—"}
            </p>
          </motion.div>
        ))}
      </div>

      {isLoading && !catalog.length ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-44 rounded-2xl" />
          ))}
        </div>
      ) : !hydrated ? null : !hasAnything ? (
        <EmptyLibrary />
      ) : (
        <>
          {/* Recently viewed strip */}
          {recentEntries.length > 0 && (
            <section aria-labelledby="recent-heading" className="space-y-4">
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2.5">
                  <History aria-hidden className="size-4 text-muted-foreground" />
                  <h2 id="recent-heading" className="text-lg font-bold tracking-tight">
                    Jump back in
                  </h2>
                </div>
                <button
                  type="button"
                  onClick={clearRecent}
                  className="rounded-lg px-2.5 py-1 text-xs text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  Clear history
                </button>
              </div>
              <ul className="grid gap-2.5 sm:grid-cols-2">
                {recentEntries.slice(0, 6).map((r) => {
                  const a = getAccent(r.categoryAccent);
                  const playable = r.categorySlug === "simulators" && isPlayableSimulator(r.slug);
                  const isCourseWithLessons =
                    r.categorySlug === "courses" && (bySlug.get(r.slug)?.lessonCount ?? 0) > 0;
                  return (
                    <li key={r.slug}>
                      <Link
                        href={
                          playable
                            ? simulatorViewHref(r.slug)
                            : isCourseWithLessons
                              ? `/?course=${r.slug}`
                              : `/?category=${r.categorySlug}&item=${r.slug}`
                        }
                        onClick={() => trackEvent("item_view", r.slug, r.title)}
                        className={cn(
                          "group flex items-center gap-3 rounded-xl border bg-card p-3 transition-all duration-200",
                          "hover:-translate-y-0.5 hover:shadow-md",
                          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
                          a.hoverBorder
                        )}
                      >
                        <span
                          aria-hidden
                          className={cn("size-2 shrink-0 rounded-full", a.dot)}
                        />
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-sm font-medium leading-tight">
                            {r.title}
                          </span>
                          <span className="block truncate text-[11px] text-muted-foreground">
                            {r.categoryTitle}
                            {r.duration ? ` · ${r.duration}` : ""}
                          </span>
                        </span>
                        <ArrowRight
                          aria-hidden
                          className="size-3.5 shrink-0 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100"
                        />
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </section>
          )}

          {/* Learning paths in motion — roadmap step progress */}
          {inProgressPaths.length > 0 && (
            <section aria-labelledby="paths-heading" className="space-y-4">
              <div className="flex items-center gap-2.5">
                <Route aria-hidden className="size-4 text-emerald-500" />
                <h2 id="paths-heading" className="text-lg font-bold tracking-tight">
                  Learning paths in motion
                </h2>
                <span className="rounded-full bg-muted px-2 py-0.5 text-xs tabular-nums text-muted-foreground">
                  {inProgressPaths.length}
                </span>
              </div>
              <ul className="grid gap-3 sm:grid-cols-2">
                {inProgressPaths.map(({ item, done, total, pct }) => {
                  const a = getAccent(item.categoryAccent);
                  return (
                    <li key={item.id}>
                      <Link
                        href={`/?category=${item.categorySlug}&item=${item.slug}`}
                        onClick={() => trackEvent("item_view", item.slug, item.title)}
                        className={cn(
                          "group block rounded-xl border bg-card p-4 transition-all duration-200",
                          "hover:-translate-y-0.5 hover:shadow-md",
                          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
                          a.hoverBorder
                        )}
                      >
                        <div className="flex items-center justify-between gap-3">
                          <p className="min-w-0 truncate text-sm font-medium">{item.title}</p>
                          <span className="shrink-0 text-xs tabular-nums text-muted-foreground">
                            {done}/{total}
                          </span>
                        </div>
                        <div
                          role="progressbar"
                          aria-valuenow={pct}
                          aria-valuemin={0}
                          aria-valuemax={100}
                          aria-label={`${item.title} progress`}
                          className="mt-2.5 h-1.5 overflow-hidden rounded-full bg-muted"
                        >
                          <div
                            className={cn("h-full rounded-full transition-all duration-500", a.dot)}
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                        <p className="mt-2 text-[11px] text-muted-foreground">
                          {pct}% · {total - done} steps to go
                          <ArrowRight
                            aria-hidden
                            className="ml-1 inline size-3 opacity-0 transition-opacity group-hover:opacity-100"
                          />
                        </p>
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </section>
          )}

          {/* Courses in progress — real lesson-content progress */}
          {inProgressCourses.length > 0 && (
            <section aria-labelledby="courses-heading" className="space-y-4">
              <div className="flex items-center gap-2.5">
                <GraduationCap aria-hidden className="size-4 text-teal-500" />
                <h2 id="courses-heading" className="text-lg font-bold tracking-tight">
                  Courses in progress
                </h2>
                <span className="rounded-full bg-muted px-2 py-0.5 text-xs tabular-nums text-muted-foreground">
                  {inProgressCourses.length}
                </span>
              </div>
              <ul className="grid gap-3 sm:grid-cols-2">
                {inProgressCourses.map(({ item, done, total, pct, next, assessmentScore }) => (
                  <li key={item.id}>
                    <Link
                      href={`/?course=${item.slug}&lesson=${next}`}
                      className={cn(
                        "group block rounded-xl border bg-card p-4 transition-all duration-200",
                        "hover:-translate-y-0.5 hover:shadow-md",
                        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
                        getAccent(item.categoryAccent).hoverBorder
                      )}
                    >
                      <div className="flex items-center justify-between gap-3">
                        <p className="min-w-0 truncate text-sm font-medium">{item.title}</p>
                        <span className="shrink-0 text-xs tabular-nums text-muted-foreground">
                          {done}/{total} lessons
                        </span>
                      </div>
                      <div
                        role="progressbar"
                        aria-valuenow={pct}
                        aria-valuemin={0}
                        aria-valuemax={100}
                        aria-label={`${item.title} course progress`}
                        className="mt-2.5 h-1.5 overflow-hidden rounded-full bg-muted"
                      >
                        <div
                          className="h-full rounded-full bg-teal-500 transition-all duration-500"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                      <p className="mt-2 flex items-center gap-1 text-[11px] text-muted-foreground">
                        {pct}% · continue with lesson {next}
                        {assessmentScore !== undefined ? ` · best assessment ${assessmentScore}%` : ""}
                        <ArrowRight
                          aria-hidden
                          className="ml-auto size-3 opacity-0 transition-opacity group-hover:opacity-100"
                        />
                      </p>
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          )}

          {/* Saved grid */}
          <section aria-labelledby="saved-heading" className="space-y-4">
            <div className="flex items-center gap-2.5">
              <BookmarkCheck aria-hidden className="size-4 text-amber-500" />
              <h2 id="saved-heading" className="text-lg font-bold tracking-tight">
                Saved for later
              </h2>
              <span className="rounded-full bg-muted px-2 py-0.5 text-xs tabular-nums text-muted-foreground">
                {savedItems.length}
              </span>
            </div>
            {savedItems.length === 0 ? (
              <p className="rounded-2xl border border-dashed p-6 text-center text-sm text-muted-foreground">
                Nothing saved yet — tap the bookmark icon on any card to stash it here.
              </p>
            ) : (
              <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {savedItems.map((item, i) => (
                  <li key={item.id} className="h-full">
                    <ResourceItemCard
                      item={item}
                      index={i}
                      onSelect={(it) => {
                        setSelected(it);
                        trackEvent("item_view", it.slug, it.title);
                      }}
                    />
                  </li>
                ))}
              </ul>
            )}
          </section>

          {/* Completed grid */}
          {completedItems.length > 0 && (
            <section aria-labelledby="completed-heading" className="space-y-4">
              <div className="flex items-center gap-2.5">
                <Check aria-hidden className="size-4 text-emerald-500" />
                <h2 id="completed-heading" className="text-lg font-bold tracking-tight">
                  Completed
                </h2>
                <span className="rounded-full bg-muted px-2 py-0.5 text-xs tabular-nums text-muted-foreground">
                  {completedItems.length}
                </span>
              </div>
              <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {completedItems.map((item, i) => (
                  <li key={item.id} className="h-full">
                    <ResourceItemCard
                      item={item}
                      index={i}
                      onSelect={(it) => {
                        setSelected(it);
                        trackEvent("item_view", it.slug, it.title);
                      }}
                    />
                  </li>
                ))}
              </ul>
            </section>
          )}
        </>
      )}

      <ItemDetailDialog item={selected} onOpenChange={(open) => !open && setSelected(null)} />
    </div>
  );
}

function BadgePill() {
  const saved = useLibrary((s) => s.saved.length);
  const completed = useLibrary((s) => s.completed.length);
  const total = saved + completed;
  if (!total) return null;
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-500/40 bg-amber-500/10 px-2.5 py-0.5 text-xs font-medium text-amber-600 dark:text-amber-300">
      <Clock aria-hidden className="size-3" />
      {total} tracked
    </span>
  );
}

function EmptyLibrary() {
  return (
    <div className="flex flex-col items-center justify-center gap-4 rounded-2xl border border-dashed py-16 text-center">
      <span className="flex size-12 items-center justify-center rounded-2xl bg-muted">
        <Compass aria-hidden className="size-6 text-muted-foreground" />
      </span>
      <div className="space-y-1.5">
        <p className="font-semibold">Your library is empty</p>
        <p className="max-w-sm text-sm text-muted-foreground">
          Save courses with the bookmark icon, mark items complete as you finish
          them, and everything you open will show up under “Jump back in”.
        </p>
      </div>
      <Button asChild variant="outline" size="sm" className="gap-2">
        <Link href="/">
          Browse the platform
          <ArrowRight aria-hidden className="size-4" />
        </Link>
      </Button>
    </div>
  );
}
