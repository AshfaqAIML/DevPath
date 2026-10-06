"use client";

import * as React from "react";
import { BarChart3 } from "lucide-react";
import { cn } from "@/lib/utils";

interface ChartEmptyProps {
  message?: string;
  action?: React.ReactNode;
  className?: string;
}

/**
 * Empty state rendered inside a ChartCard when a series has no data.
 * Never leave a chart area blank.
 */
export function ChartEmpty({
  message = "No data yet — interact with the platform and this chart will come alive.",
  action,
  className,
}: ChartEmptyProps) {
  return (
    <div
      className={cn(
        "flex h-full min-h-40 flex-col items-center justify-center gap-3 rounded-lg border border-dashed p-6 text-center",
        className
      )}
      role="status"
    >
      <span className="flex size-10 items-center justify-center rounded-full bg-muted">
        <BarChart3 className="size-5 text-muted-foreground" aria-hidden />
      </span>
      <p className="max-w-xs text-sm text-muted-foreground">{message}</p>
      {action}
    </div>
  );
}
