"use client";

/**
 * First-visit app-install prompt state — a tiny external store read via
 * useSyncExternalStore (hydration-safe, lint-clean, cross-component).
 *
 * Rules:
 *  - Only Android visitors are eligible (never iOS/desktop).
 *  - First visit shows the prompt; dismissal is persisted and re-triggers
 *    after NEXT_PUBLIC_APP_PROMPT_RETRIGGER_DAYS days.
 *  - A recorded download permanently silences auto-prompts.
 *  - Master switch: NEXT_PUBLIC_APP_PROMPT_ENABLED=false.
 *  - QA URL param `appPrompt`: 1 = force show, auto = simulate Android
 *    (respects dismissal), 0 = force hide.
 */
export interface AppPromptState {
  firstVisitAt: number;
  visits: number;
  dismissedAt?: number;
  downloadedAt?: number;
}

const STORAGE_KEY = "devpath.appPrompt.v1";
const DAY_MS = 24 * 60 * 60 * 1000;

let state: AppPromptState | null = null;
let hydrated = false;
const listeners = new Set<() => void>();

function emit() {
  listeners.forEach((l) => l());
}

function persist() {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    // storage unavailable — degrade gracefully
  }
}

/** One-time per-page init: reads state and counts this visit. */
function init() {
  if (hydrated || typeof window === "undefined") return;
  hydrated = true;
  let existing: AppPromptState | null = null;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    existing = raw ? (JSON.parse(raw) as AppPromptState) : null;
  } catch {
    existing = null;
  }
  state = existing
    ? { ...existing, visits: (existing.visits ?? 0) + 1 }
    : { firstVisitAt: Date.now(), visits: 1 };
  persist();
}

function update(mutate: (prev: AppPromptState) => AppPromptState) {
  init();
  state = mutate(state ?? { firstVisitAt: Date.now(), visits: 1 });
  persist();
  emit();
}

export const appPromptStore = {
  subscribe(listener: () => void): () => void {
    listeners.add(listener);
    return () => listeners.delete(listener);
  },
  getSnapshot(): AppPromptState | null {
    init();
    return state;
  },
  getServerSnapshot(): AppPromptState | null {
    return null;
  },
  dismiss() {
    update((prev) => ({ ...prev, dismissedAt: Date.now() }));
  },
  markDownloaded() {
    update((prev) => ({ ...prev, downloadedAt: Date.now() }));
  },
  reset() {
    if (typeof window !== "undefined") {
      try {
        window.localStorage.removeItem(STORAGE_KEY);
      } catch {
        // ignore
      }
    }
    state = null;
    emit();
  },
};

export function readAppPromptOverride():
  | "force"
  | "simulate-android"
  | "hidden"
  | null {
  if (typeof window === "undefined") return null;
  const raw = new URLSearchParams(window.location.search).get("appPrompt");
  if (raw === "1") return "force";
  if (raw === "auto") return "simulate-android";
  if (raw === "0") return "hidden";
  return null;
}

export function appPromptEnabled(): boolean {
  return process.env.NEXT_PUBLIC_APP_PROMPT_ENABLED !== "false";
}

export function appPromptRetriggerMs(): number {
  const days = Number(process.env.NEXT_PUBLIC_APP_PROMPT_RETRIGGER_DAYS ?? "14");
  return (Number.isFinite(days) && days >= 0 ? days : 14) * DAY_MS;
}
