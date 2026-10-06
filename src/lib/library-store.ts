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

interface LibraryState {
  saved: string[];
  completed: string[];
  recent: RecentEntry[];
  toggleSaved: (slug: string) => boolean;
  toggleCompleted: (slug: string) => boolean;
  isSaved: (slug: string) => boolean;
  isCompleted: (slug: string) => boolean;
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
