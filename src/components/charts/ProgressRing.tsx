"use client";

import * as React from "react";
import { motion, useReducedMotion } from "framer-motion";
import { cn } from "@/lib/utils";

interface ProgressRingProps {
  /** 0–100 */
  value: number;
  size?: number;
  stroke?: number;
  label?: React.ReactNode;
  sublabel?: React.ReactNode;
  color?: string;
  trackClassName?: string;
  className?: string;
}

/**
 * Animated progress ring for course completion, assessment scores, etc.
 */
export function ProgressRing({
  value,
  size = 120,
  stroke = 10,
  label,
  sublabel,
  color = "var(--chart-1)",
  className,
}: ProgressRingProps) {
  const reduceMotion = useReducedMotion();
  const clamped = Math.max(0, Math.min(100, value));
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;

  return (
    <div
      className={cn(
        "inline-flex flex-col items-center justify-center gap-1",
        className
      )}
      role="img"
      aria-label={`Progress ${Math.round(clamped)} percent`}
    >
      <div className="relative" style={{ width: size, height: size }}>
        <svg width={size} height={size} className="-rotate-90">
          <circle
            cx={size / 2}
            cy={size / 2}
            r={r}
            fill="none"
            strokeWidth={stroke}
            className="stroke-muted"
          />
          <motion.circle
            cx={size / 2}
            cy={size / 2}
            r={r}
            fill="none"
            stroke={color}
            strokeWidth={stroke}
            strokeLinecap="round"
            strokeDasharray={c}
            initial={{ strokeDashoffset: c }}
            animate={{ strokeDashoffset: c * (1 - clamped / 100) }}
            transition={
              reduceMotion ? { duration: 0 } : { duration: 1, ease: "easeOut" }
            }
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          {label ?? (
            <span className="font-display text-2xl font-bold tabular-nums">
              {Math.round(clamped)}%
            </span>
          )}
          {sublabel}
        </div>
      </div>
    </div>
  );
}
