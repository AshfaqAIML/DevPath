"use client";

import * as React from "react";
import { Bookmark, Check, Clock, Eye, Sparkles } from "lucide-react";

import { cn } from "@/lib/utils";
import { getAccent } from "@/lib/accent";
import { useLibrary, useLibraryHydrated } from "@/lib/library-store";
import type { ResourceItemView } from "@/lib/platform";

const levelStyles: Record<string, string> = {
  Beginner: "border-emerald-500/25 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300",
  Intermediate: "border-amber-500/25 bg-amber-500/10 text-amber-700 dark:text-amber-300",
  Advanced: "border-rose-500/25 bg-rose-500/10 text-rose-700 dark:text-rose-300",
};

interface ResourceItemCardProps {
  item: ResourceItemView;
  onSelect?: (item: ResourceItemView) => void;
  index?: number;
}

export function ResourceItemCard({ item, onSelect, index = 0 }: ResourceItemCardProps) {
  const a = getAccent(item.categoryAccent);
  const levelClass = levelStyles[item.level] ?? levelStyles.Beginner;
  const hydrated = useLibraryHydrated();
  const saved = useLibrary((s) => s.saved.includes(item.slug));
  const completed = useLibrary((s) => s.completed.includes(item.slug));
  const toggleSaved = useLibrary((s) => s.toggleSaved);

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={() => onSelect?.(item)}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onSelect?.(item);
        }
      }}
      aria-label={`Open ${item.title}`}
      className={cn(
        "group relative flex h-full cursor-pointer flex-col gap-3 rounded-2xl border bg-card p-5 text-left shadow-sm",
        "transition-all duration-300 ease-out",
        "hover:-translate-y-1 hover:shadow-lg",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
        completed && "border-emerald-500/30",
        a.hoverBorder
      )}
      style={{ animationDelay: `${Math.min(index * 30, 300)}ms` }}
    >
      <div
        aria-hidden
        className={cn(
          "pointer-events-none absolute inset-0 rounded-2xl opacity-0 transition-opacity duration-300 group-hover:opacity-100",
          a.gradient
        )}
      />

      {/* hover sheen sweep */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 overflow-hidden rounded-2xl"
      >
        <div className="absolute -inset-x-full h-full rotate-12 bg-gradient-to-r from-transparent via-white/[0.07] to-transparent transition-transform duration-700 ease-out group-hover:translate-x-full" />
      </div>

      <div className="relative flex items-start justify-between gap-2">
        <span
          className={cn(
            "inline-flex items-center rounded-md border px-2 py-0.5 text-[11px] font-medium",
            levelClass
          )}
        >
          {item.level}
        </span>
        <span className="flex items-center gap-1.5">
          {!item.published && (
            <span className="inline-flex items-center rounded-md border border-dashed px-2 py-0.5 text-[11px] font-medium text-muted-foreground">
              Draft
            </span>
          )}
          {item.featured && (
            <span
              className={cn(
                "inline-flex items-center gap-1 rounded-md border px-2 py-0.5 text-[11px] font-medium",
                a.chip
              )}
            >
              <Sparkles aria-hidden className="size-3" />
              Featured
            </span>
          )}
        </span>
      </div>

      <h3 className="relative text-sm font-semibold leading-snug text-card-foreground transition-colors group-hover:text-foreground">
        {item.title}
        {completed && (
          <span
            title="Completed"
            className="ml-1.5 inline-flex size-4 translate-y-0.5 items-center justify-center rounded-full bg-emerald-500/15 text-emerald-600 dark:text-emerald-400"
          >
            <Check aria-hidden className="size-3" />
            <span className="sr-only">(completed)</span>
          </span>
        )}
      </h3>

      <p className="relative line-clamp-2 text-xs leading-relaxed text-muted-foreground/90">
        {item.description}
      </p>

      <div className="relative mt-auto flex flex-wrap items-center gap-x-3 gap-y-1.5 pt-1 text-[11px] text-muted-foreground">
        {item.duration ? (
          <span className="inline-flex items-center gap-1">
            <Clock aria-hidden className="size-3" />
            {item.duration}
          </span>
        ) : null}
        {item.tags.slice(0, 2).map((t) => (
          <span key={t} className="rounded bg-muted px-1.5 py-0.5 font-mono text-[10px]">
            {t}
          </span>
        ))}
        <span className="ml-auto inline-flex items-center gap-2.5">
          {hydrated && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                toggleSaved(item.slug);
              }}
              aria-label={saved ? `Remove ${item.title} from saved` : `Save ${item.title} for later`}
              aria-pressed={saved}
              className={cn(
                "inline-flex size-7 items-center justify-center rounded-full transition-all duration-200",
                "text-muted-foreground hover:bg-muted hover:text-foreground",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                saved ? "text-amber-500 hover:text-amber-600" : "opacity-60 hover:opacity-100"
              )}
            >
              <Bookmark
                aria-hidden
                className={cn(
                  "size-3.5 transition-transform duration-200",
                  saved && "fill-amber-500 scale-110"
                )}
              />
            </button>
          )}
          <span className="inline-flex items-center gap-1 tabular-nums">
            <Eye aria-hidden className="size-3" />
            {item.views}
          </span>
        </span>
      </div>
    </div>
  );
}
