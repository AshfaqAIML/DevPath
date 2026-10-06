"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

export interface ActivityDay {
  date: string; // YYYY-MM-DD
  count: number;
}

interface ActivityHeatmapProps {
  days: ActivityDay[];
  /** Number of trailing weeks to render */
  weeks?: number;
  color?: string;
  className?: string;
}

const OPACITY_STEPS = [0.08, 0.25, 0.45, 0.7, 1];

/**
 * GitHub-style contribution heatmap for learner activity streaks.
 * Pure CSS grid — no chart library needed.
 */
export function ActivityHeatmap({
  days,
  weeks = 12,
  color = "var(--chart-1)",
  className,
}: ActivityHeatmapProps) {
  const cells = React.useMemo(() => {
    const byDate = new Map(days.map((d) => [d.date, d.count]));
    const max = Math.max(1, ...days.map((d) => d.count));
    const total = weeks * 7;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const out: (ActivityDay & { level: number })[] = [];
    for (let i = total - 1; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(d.getDate() - i);
      const key = d.toISOString().slice(0, 10);
      const count = byDate.get(key) ?? 0;
      const level =
        count === 0
          ? 0
          : Math.min(
              OPACITY_STEPS.length - 1,
              Math.ceil((count / max) * (OPACITY_STEPS.length - 1))
            );
      out.push({ date: key, count, level });
    }
    return out;
  }, [days, weeks]);

  const totalActive = cells.filter((c) => c.count > 0).length;

  return (
    <div className={cn("space-y-2", className)}>
      <div
        className="grid grid-flow-col grid-rows-7 gap-1 overflow-x-auto pb-1"
        role="img"
        aria-label={`Activity heatmap: active on ${totalActive} of the last ${cells.length} days`}
      >
        {cells.map((cell) => (
          <span
            key={cell.date}
            title={`${cell.count} event${cell.count === 1 ? "" : "s"} on ${cell.date}`}
            aria-hidden
            className="size-3 rounded-[4px] border border-border/60"
            style={{
              background:
                cell.level === 0
                  ? "var(--muted)"
                  : `color-mix(in oklab, ${color} ${Math.round(OPACITY_STEPS[cell.level] * 100)}%, transparent)`,
            }}
          />
        ))}
      </div>
      <div className="flex items-center justify-between text-[11px] text-muted-foreground">
        <span>
          {totalActive} active day{totalActive === 1 ? "" : "s"} · last{" "}
          {weeks} weeks
        </span>
        <span className="flex items-center gap-1" aria-hidden>
          Less
          {OPACITY_STEPS.map((_, i) => (
            <span
              key={i}
              className="size-3 rounded-[4px] border border-border/60"
              style={{
                background:
                  i === 0
                    ? "var(--muted)"
                    : `color-mix(in oklab, ${color} ${Math.round(OPACITY_STEPS[i] * 100)}%, transparent)`,
              }}
            />
          ))}
          More
        </span>
      </div>
    </div>
  );
}
