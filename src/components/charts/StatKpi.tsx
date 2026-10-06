"use client";

import * as React from "react";
import { animate, useReducedMotion } from "framer-motion";
import { ArrowDownRight, ArrowUpRight, Minus } from "lucide-react";
import { Area, AreaChart, ResponsiveContainer } from "recharts";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

function useCountUp(target: number, format: (n: number) => string) {
  const reduceMotion = useReducedMotion();
  const [text, setText] = React.useState(() => format(target));
  React.useEffect(() => {
    if (reduceMotion) {
      setText(format(target));
      return;
    }
    const controls = animate(0, target, {
      duration: 0.9,
      ease: "easeOut",
      onUpdate: (v) => setText(format(v)),
    });
    return () => controls.stop();
  }, [target, reduceMotion, format]);
  return text;
}

interface StatKpiProps {
  label: string;
  value: number;
  /** Percent change vs previous period; null hides the delta badge */
  delta?: number | null;
  deltaInverted?: boolean;
  spark?: number[];
  sparkColor?: string;
  format?: (n: number) => string;
  icon?: React.ReactNode;
}

/**
 * KPI card with animated counter, delta badge and sparkline.
 */
export function StatKpi({
  label,
  value,
  delta = null,
  deltaInverted = false,
  spark = [],
  sparkColor = "var(--chart-1)",
  format = (n) => Math.round(n).toLocaleString(),
  icon,
}: StatKpiProps) {
  const display = useCountUp(value, format);
  const positive = delta !== null && delta > 0.05;
  const negative = delta !== null && delta < -0.05;
  const good = deltaInverted ? negative : positive;
  const bad = deltaInverted ? positive : negative;

  return (
    <Card className="overflow-hidden">
      <CardContent className="p-5">
        <div className="flex items-center justify-between gap-2">
          <p className="text-sm text-muted-foreground">{label}</p>
          {icon}
        </div>
        <div className="mt-1 flex items-end justify-between gap-3">
          <p
            className="font-display text-3xl font-bold tracking-tight tabular-nums"
            aria-live="polite"
          >
            {display}
          </p>
          {delta !== null && (
            <span
              className={cn(
                "mb-1 inline-flex items-center gap-0.5 rounded-full border px-2 py-0.5 font-mono text-xs",
                good &&
                  "border-emerald-500/30 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
                bad &&
                  "border-rose-500/30 bg-rose-500/10 text-rose-600 dark:text-rose-400",
                !good &&
                  !bad &&
                  "border-border bg-muted text-muted-foreground"
              )}
            >
              {positive ? (
                <ArrowUpRight className="size-3.5" aria-hidden />
              ) : negative ? (
                <ArrowDownRight className="size-3.5" aria-hidden />
              ) : (
                <Minus className="size-3.5" aria-hidden />
              )}
              {Math.abs(delta).toFixed(1)}%
            </span>
          )}
        </div>
        {spark.length > 1 && (
          <div className="mt-3 h-10" aria-hidden>
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart
                data={spark.map((v, i) => ({ i, v }))}
                margin={{ top: 2, right: 0, bottom: 0, left: 0 }}
              >
                <defs>
                  <linearGradient
                    id={`kpi-spark-${label.replace(/\W+/g, "-")}`}
                    x1="0"
                    y1="0"
                    x2="0"
                    y2="1"
                  >
                    <stop
                      offset="0%"
                      stopColor={sparkColor}
                      stopOpacity={0.45}
                    />
                    <stop
                      offset="100%"
                      stopColor={sparkColor}
                      stopOpacity={0}
                    />
                  </linearGradient>
                </defs>
                <Area
                  type="monotone"
                  dataKey="v"
                  stroke={sparkColor}
                  strokeWidth={1.5}
                  fill={`url(#kpi-spark-${label.replace(/\W+/g, "-")})`}
                  isAnimationActive={false}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
