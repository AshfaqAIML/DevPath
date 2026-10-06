// Learning-track registry for the course catalog.
// Tracks are first-class data on ResourceItem (DB `track` column) and every
// UI surface (cards, dialogs, search, the Courses explorer filter, admin)
// renders them through this registry — no per-component hardcoded styles.
//
// Add a track here + set it on items to extend the taxonomy.

export const TRACKS = ["Frontend", "Backend", "Data", "DA/DS", "AI", "SDET", "Tools"] as const;

export type Track = (typeof TRACKS)[number];

export function isTrack(value: string | null | undefined): value is Track {
  return !!value && (TRACKS as readonly string[]).includes(value);
}

export interface TrackStyle {
  /** chip classes for cards / dialogs / filter buttons */
  chip: string;
  /** small solid dot (filter rows, admin tables) */
  dot: string;
  /** active-state filter button classes */
  active: string;
}

// All class strings are static so Tailwind can compile them.
// Palette deliberately avoids indigo/blue; Data uses teal, DA/DS orange,
// AI fuchsia, SDET amber, Tools violet.
export const trackStyles: Record<Track, TrackStyle> = {
  Frontend: {
    chip: "border-rose-500/30 bg-rose-500/10 text-rose-700 dark:text-rose-300",
    dot: "bg-rose-500",
    active: "border-rose-500/50 bg-rose-500/15 text-rose-700 dark:text-rose-300",
  },
  Backend: {
    chip: "border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300",
    dot: "bg-emerald-500",
    active: "border-emerald-500/50 bg-emerald-500/15 text-emerald-700 dark:text-emerald-300",
  },
  Data: {
    chip: "border-teal-500/30 bg-teal-500/10 text-teal-700 dark:text-teal-300",
    dot: "bg-teal-500",
    active: "border-teal-500/50 bg-teal-500/15 text-teal-700 dark:text-teal-300",
  },
  "DA/DS": {
    chip: "border-orange-500/30 bg-orange-500/10 text-orange-700 dark:text-orange-300",
    dot: "bg-orange-500",
    active: "border-orange-500/50 bg-orange-500/15 text-orange-700 dark:text-orange-300",
  },
  AI: {
    chip: "border-fuchsia-500/30 bg-fuchsia-500/10 text-fuchsia-700 dark:text-fuchsia-300",
    dot: "bg-fuchsia-500",
    active: "border-fuchsia-500/50 bg-fuchsia-500/15 text-fuchsia-700 dark:text-fuchsia-300",
  },
  SDET: {
    chip: "border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-300",
    dot: "bg-amber-500",
    active: "border-amber-500/50 bg-amber-500/15 text-amber-700 dark:text-amber-300",
  },
  Tools: {
    chip: "border-violet-500/30 bg-violet-500/10 text-violet-700 dark:text-violet-300",
    dot: "bg-violet-500",
    active: "border-violet-500/50 bg-violet-500/15 text-violet-700 dark:text-violet-300",
  },
};

/** Chip classes for an arbitrary track value (unknown tracks get a neutral chip). */
export function trackChip(track: string | null | undefined): string {
  return isTrack(track) ? trackStyles[track].chip : "border-border bg-muted text-muted-foreground";
}

/** Dot classes for an arbitrary track value. */
export function trackDot(track: string | null | undefined): string {
  return isTrack(track) ? trackStyles[track].dot : "bg-muted-foreground/40";
}
