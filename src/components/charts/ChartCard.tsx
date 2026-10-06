"use client";

import * as React from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface ChartCardProps {
  title: string;
  description?: string;
  /** Right-side controls, e.g. a range toggle */
  action?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
  /** Height of the chart area; reserving it up-front prevents layout shift */
  height?: number | string;
  contentClassName?: string;
}

/**
 * Standard framed container for every dashboard/admin chart.
 * Reserves a fixed chart height so async data never causes layout shift.
 */
export function ChartCard({
  title,
  description,
  action,
  children,
  className,
  height = 260,
  contentClassName,
}: ChartCardProps) {
  return (
    <Card className={cn("flex flex-col overflow-hidden", className)}>
      <CardHeader className="flex flex-row items-start justify-between gap-4 space-y-0">
        <div className="space-y-1">
          <CardTitle className="font-display text-base">{title}</CardTitle>
          {description ? (
            <CardDescription>{description}</CardDescription>
          ) : null}
        </div>
        {action ? <div className="shrink-0">{action}</div> : null}
      </CardHeader>
      <CardContent
        className={cn("flex-1", contentClassName)}
        style={{ height }}
      >
        {children}
      </CardContent>
    </Card>
  );
}
