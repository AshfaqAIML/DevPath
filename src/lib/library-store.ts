"use client";

// My Library — client-side personal library persisted to localStorage via
// zustand persist. Tracks saved (bookmarked) items, completed items and a
// recently-viewed strip. Hydration is gated through `useLibraryHydrated` so
// SSR markup never mismatches the rehydrated client state.
import { useSyncExternalStore } from "react";
import { create } from "zustand";
import { persist } from "zustand/middleware";

export interface RecentEntry {
  slug: string;
  title: string;
  level: string;
  duration: string | null;
  categorySlug: string;
  categoryTitle: string;
  categoryIcon: string;
  categoryAccent: string;
  at: number;
}

interface CourseProgress {
  /** Completed lesson orders (1-based) */
  lessons: number[];
  /** Best final-assessment score 0–100 (undefined until attempted) */
  assessmentScore?: number;
  /** Epoch ms when the final assessment was passed */
  completedAt?: number;
}

interface LibraryState {
  saved: string[];
  completed: string[];
  recent: RecentEntry[];
  /** Roadmap step progress: item slug → set of completed step indices */
  stepProgress: Record<string, number[]>;
  /** Simulator challenge progress: sim slug → completed challenge ids */
  simProgress: Record<string, string[]>;
  /** Course learning progress: course slug → lesson/assessment records */
  courseProgress: Record<string, CourseProgress>;
  toggleSaved: (slug: string) => boolean;
  toggleCompleted: (slug: string) => boolean;
  isSaved: (slug: string) => boolean;
  isCompleted: (slug: string) => boolean;
  toggleStep: (slug: string, index: number) => boolean;
  getStepProgress: (slug: string) => number[];
  completeChallenge: (simSlug: string, challengeId: string) => void;
  completeLesson: (courseSlug: string, order: number) => void;
  isLessonDone: (courseSlug: string, order: number) => boolean;
  getCourseProgress: (courseSlug: string) => CourseProgress;
  recordAssessment: (courseSlug: string, score: number, passed: boolean) => void;
  pushRecent: (entry: Omit<RecentEntry, "at">) => void;
  clearRecent: () => void;
}

const MAX_RECENT = 10;

export const useLibrary = create<LibraryState>()(
  persist(
    (set, get) => ({
      saved: [],
      completed: [],
      recent: [],
      stepProgress: {},
      simProgress: {},
      courseProgress: {},
      toggleSaved: (slug) => {
        const has = get().saved.includes(slug);
        set({
          saved: has ? get().saved.filter((s) => s !== slug) : [slug, ...get().saved],
        });
        return !has;
      },
      toggleCompleted: (slug) => {
        const has = get().completed.includes(slug);
        set({
          completed: has
            ? get().completed.filter((s) => s !== slug)
            : [slug, ...get().completed],
        });
        return !has;
      },
      isSaved: (slug) => get().saved.includes(slug),
      isCompleted: (slug) => get().completed.includes(slug),
      toggleStep: (slug, index) => {
        const current = get().stepProgress[slug] ?? [];
        const has = current.includes(index);
        const next = has
          ? current.filter((i) => i !== index)
          : [...current, index];
        set({ stepProgress: { ...get().stepProgress, [slug]: next } });
        return !has;
      },
      getStepProgress: (slug) => get().stepProgress[slug] ?? [],
      completeChallenge: (simSlug, challengeId) => {
        const current = get().simProgress[simSlug] ?? [];
        if (current.includes(challengeId)) return;
        set({
          simProgress: { ...get().simProgress, [simSlug]: [...current, challengeId] },
        });
      },
      completeLesson: (courseSlug, order) => {
        const current = get().courseProgress[courseSlug]?.lessons ?? [];
        if (current.includes(order)) return;
        set({
          courseProgress: {
            ...get().courseProgress,
            [courseSlug]: {
              ...get().courseProgress[courseSlug],
              lessons: [...current, order],
            },
          },
        });
      },
      isLessonDone: (courseSlug, order) =>
        (get().courseProgress[courseSlug]?.lessons ?? []).includes(order),
      getCourseProgress: (courseSlug) => get().courseProgress[courseSlug] ?? { lessons: [] },
      recordAssessment: (courseSlug, score, passed) => {
        const prev = get().courseProgress[courseSlug] ?? { lessons: [] };
        const best = Math.max(prev.assessmentScore ?? 0, score);
        set({
          courseProgress: {
            ...get().courseProgress,
            [courseSlug]: {
              ...prev,
              assessmentScore: best,
              ...(passed ? { completedAt: prev.completedAt ?? Date.now() } : {}),
            },
          },
        });
        // Passing the assessment also marks the course item completed
        if (passed) {
          const completed = get().completed;
          if (!completed.includes(courseSlug)) {
            set({ completed: [courseSlug, ...completed] });
          }
        }
      },
      pushRecent: (entry) =>
        set({
          recent: [
            { ...entry, at: Date.now() },
            ...get().recent.filter((r) => r.slug !== entry.slug),
          ].slice(0, MAX_RECENT),
        }),
      clearRecent: () => set({ recent: [] }),
    }),
    { name: "devpath-library" }
  )
);

const emptySubscribe = () => () => {};

/**
 * True once the app is running on the client (after hydration) — gate any
 * UI that depends on the persisted localStorage state on this to avoid
 * SSR/client markup mismatches. Implemented with useSyncExternalStore so
 * no setState-in-effect is needed.
 */
export function useLibraryHydrated(): boolean {
  return useSyncExternalStore(
    emptySubscribe,
    () => true,
    () => false
  );
}
