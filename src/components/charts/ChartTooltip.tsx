"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

interface TooltipEntry {
  name?: React.ReactNode;
  value?: number | string | Array<number | string>;
  color?: string;
  dataKey?: string | number;
  payload?: Record<string, unknown>;
}

interface ChartTooltipContentProps {
  active?: boolean;
  payload?: TooltipEntry[];
  label?: string | number;
  /** Maps a dataKey to a human label */
  labelMap?: Record<string, string>;
  /** Formats a raw value for display */
  formatValue?: (value: number | string, dataKey: string) => React.ReactNode;
}

/**
 * Theme-aware tooltip for all recharts surfaces.
 * Pass as `content={<ChartTooltipContent />}`.
 */
export function ChartTooltipContent({
  active,
  payload,
  label,
  labelMap,
  formatValue,
}: ChartTooltipContentProps) {
  if (!active || !payload || payload.length === 0) return null;
  return (
    <div className="rounded-lg border bg-popover px-3 py-2 text-xs shadow-xl">
      {label !== undefined && label !== "" ? (
        <p className="mb-1.5 font-mono font-semibold text-popover-foreground">
          {label}
        </p>
      ) : null}
      <ul className="space-y-1">
        {payload.map((entry, i) => {
          const key = String(entry.dataKey ?? entry.name ?? i);
          const displayLabel =
            labelMap?.[key] ??
            (typeof entry.name === "string" ? entry.name : key);
          const raw = Array.isArray(entry.value)
            ? entry.value.join(" – ")
            : (entry.value ?? "");
          return (
            <li
              key={`${key}-${i}`}
              className="flex items-center gap-2 text-muted-foreground"
            >
              <span
                className={cn("size-2 shrink-0 rounded-full")}
                style={{ background: entry.color ?? "var(--chart-1)" }}
                aria-hidden
              />
              <span>{displayLabel}</span>
              <span className="ml-auto pl-4 font-mono font-semibold text-popover-foreground">
                {formatValue && typeof raw !== "object"
                  ? formatValue(raw as number | string, key)
                  : String(raw)}
              </span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
