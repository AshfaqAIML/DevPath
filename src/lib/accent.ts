// Accent theming for the category system.
// All class strings are static so Tailwind can compile them.

export type AccentKey = "amber" | "emerald" | "orange" | "rose" | "teal" | "zinc";

export interface AccentStyle {
  /** classes applied to the category badge */
  badge: string;
  /** ring around the icon plate */
  iconWrap: string;
  /** card border color on hover */
  hoverBorder: string;
  /** card glow shadow on hover */
  hoverShadow: string;
  /** accent text */
  text: string;
  /** small chips (level, meta) */
  chip: string;
  /** solid dot */
  dot: string;
  /** gradient wash */
  gradient: string;
  /** progress-like ring for icon */
  iconGlow: string;
}

export const accentStyles: Record<AccentKey, AccentStyle> = {
  amber: {
    badge: "border-amber-500/40 bg-amber-500/15 text-amber-600 dark:text-amber-300",
    iconWrap: "ring-amber-500/25",
    hoverBorder: "hover:border-amber-500/50",
    hoverShadow: "hover:shadow-amber-500/10",
    text: "text-amber-600 dark:text-amber-400",
    chip: "border-amber-500/25 bg-amber-500/10 text-amber-700 dark:text-amber-300",
    dot: "bg-amber-500",
    gradient: "bg-gradient-to-br from-amber-500/15 via-transparent to-transparent",
    iconGlow: "group-hover:shadow-[0_0_24px_-4px] group-hover:shadow-amber-500/40",
  },
  emerald: {
    badge: "border-emerald-500/40 bg-emerald-500/15 text-emerald-600 dark:text-emerald-300",
    iconWrap: "ring-emerald-500/25",
    hoverBorder: "hover:border-emerald-500/50",
    hoverShadow: "hover:shadow-emerald-500/10",
    text: "text-emerald-600 dark:text-emerald-400",
    chip: "border-emerald-500/25 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300",
    dot: "bg-emerald-500",
    gradient: "bg-gradient-to-br from-emerald-500/15 via-transparent to-transparent",
    iconGlow: "group-hover:shadow-[0_0_24px_-4px] group-hover:shadow-emerald-500/40",
  },
  orange: {
    badge: "border-orange-500/40 bg-orange-500/15 text-orange-600 dark:text-orange-300",
    iconWrap: "ring-orange-500/25",
    hoverBorder: "hover:border-orange-500/50",
    hoverShadow: "hover:shadow-orange-500/10",
    text: "text-orange-600 dark:text-orange-400",
    chip: "border-orange-500/25 bg-orange-500/10 text-orange-700 dark:text-orange-300",
    dot: "bg-orange-500",
    gradient: "bg-gradient-to-br from-orange-500/15 via-transparent to-transparent",
    iconGlow: "group-hover:shadow-[0_0_24px_-4px] group-hover:shadow-orange-500/40",
  },
  rose: {
    badge: "border-rose-500/40 bg-rose-500/15 text-rose-600 dark:text-rose-300",
    iconWrap: "ring-rose-500/25",
    hoverBorder: "hover:border-rose-500/50",
    hoverShadow: "hover:shadow-rose-500/10",
    text: "text-rose-600 dark:text-rose-400",
    chip: "border-rose-500/25 bg-rose-500/10 text-rose-700 dark:text-rose-300",
    dot: "bg-rose-500",
    gradient: "bg-gradient-to-br from-rose-500/15 via-transparent to-transparent",
    iconGlow: "group-hover:shadow-[0_0_24px_-4px] group-hover:shadow-rose-500/40",
  },
  teal: {
    badge: "border-teal-500/40 bg-teal-500/15 text-teal-600 dark:text-teal-300",
    iconWrap: "ring-teal-500/25",
    hoverBorder: "hover:border-teal-500/50",
    hoverShadow: "hover:shadow-teal-500/10",
    text: "text-teal-600 dark:text-teal-400",
    chip: "border-teal-500/25 bg-teal-500/10 text-teal-700 dark:text-teal-300",
    dot: "bg-teal-500",
    gradient: "bg-gradient-to-br from-teal-500/15 via-transparent to-transparent",
    iconGlow: "group-hover:shadow-[0_0_24px_-4px] group-hover:shadow-teal-500/40",
  },
  zinc: {
    badge: "border-border bg-muted text-foreground",
    iconWrap: "ring-border",
    hoverBorder: "hover:border-foreground/30",
    hoverShadow: "hover:shadow-foreground/10",
    text: "text-foreground",
    chip: "border-border bg-muted text-muted-foreground",
    dot: "bg-foreground",
    gradient: "bg-gradient-to-br from-foreground/5 via-transparent to-transparent",
    iconGlow: "group-hover:shadow-[0_0_24px_-4px] group-hover:shadow-foreground/30",
  },
};

export function getAccent(key: string | undefined | null): AccentStyle {
  return accentStyles[(key as AccentKey) in accentStyles ? (key as AccentKey) : "zinc"];
}
