"use client";

// ResourceCategoryCard — the reusable category card used by the platform's
// category hub. All content (title, count, icon, badge, href) is passed via
// props so it is driven entirely by the data/configuration layer.
import * as React from "react";
import Image from "next/image";
import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowUpRight } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { getAccent } from "@/lib/accent";

export interface ResourceCategoryCardProps {
  /** Category name, e.g. "Masterclass" */
  title: string;
  /** Short supporting copy shown under the count */
  description?: string;
  /** Pre-formatted metadata line, e.g. "15 workshops" — derived from the DB */
  count?: string | null;
  /** Locally managed icon path under /public */
  icon: string;
  /** Navigation target for the card */
  href: string;
  /** Optional badge text, e.g. "New" */
  badge?: string | null;
  /** Badge visual variant */
  badgeVariant?: "default" | "secondary" | "destructive" | "outline";
  /** Accent key used for hover/badge theming */
  accent?: string;
  /** Fired when the card is clicked (analytics) */
  onNavigate?: () => void;
  /** Stagger index for entrance animation */
  index?: number;
  className?: string;
}

/** "15 workshops" → { num: "15", rest: "workshops" } for typographic emphasis */
function splitCount(count: string) {
  const m = count.match(/^(\d+)\s+(.*)$/);
  if (!m) return null;
  return { num: m[1], rest: m[2] };
}

export function ResourceCategoryCard({
  title,
  description,
  count,
  icon,
  href,
  badge,
  badgeVariant = "default",
  accent,
  onNavigate,
  index = 0,
  className,
}: ResourceCategoryCardProps) {
  const a = getAccent(accent);
  const parts = count ? splitCount(count) : null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 18 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45, delay: Math.min(index * 0.06, 0.3), ease: "easeOut" }}
      className={className}
    >
      <Link
        href={href}
        onClick={onNavigate}
        aria-label={
          count
            ? `${title} — ${count}`
            : `${title}${description ? ` — ${description}` : ""}`
        }
        className={cn(
          "group relative flex h-full flex-col gap-3 rounded-2xl border bg-card p-5 shadow-sm",
          "transition-all duration-300 ease-out",
          "hover:-translate-y-1.5 hover:shadow-xl",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
          a.hoverShadow,
          a.hoverBorder
        )}
      >
        {/* accent wash that fades in on hover */}
        <div
          aria-hidden
          className={cn(
            "pointer-events-none absolute inset-0 rounded-2xl opacity-0 transition-opacity duration-300 group-hover:opacity-100",
            a.gradient
          )}
        />

        {/* sheen sweep on hover */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 overflow-hidden rounded-2xl"
        >
          <div className="absolute -inset-x-full h-full rotate-12 bg-gradient-to-r from-transparent via-white/[0.08] to-transparent transition-transform duration-700 ease-out group-hover:translate-x-full" />
        </div>

        {/* top accent hairline */}
        <div
          aria-hidden
          className={cn(
            "absolute inset-x-4 top-0 h-px bg-gradient-to-r from-transparent to-transparent opacity-40 transition-opacity duration-300 group-hover:opacity-100",
            "via-foreground/25"
          )}
        />

        <div className="relative flex items-start justify-between gap-2">
          <div
            className={cn(
              "relative size-14 shrink-0 overflow-hidden rounded-xl ring-1",
              a.iconWrap,
              "transition-all duration-300 group-hover:scale-[1.06]",
              a.iconGlow
            )}
          >
            <Image
              src={icon}
              alt={`${title} category icon`}
              fill
              sizes="(max-width: 640px) 56px, 56px"
              className="object-cover"
            />
          </div>
          {badge ? (
            <Badge
              variant={badgeVariant}
              className={cn(
                "relative text-[11px] tracking-wide",
                a.badge,
                badge === "New" && "before:absolute before:-left-2 before:top-1/2 before:size-1.5 before:-translate-y-1/2 before:rounded-full before:bg-current before:animate-badge-glow"
              )}
            >
              {badge}
            </Badge>
          ) : null}
        </div>

        <div className="relative mt-auto flex items-center gap-1.5">
          <h3 className="text-base font-semibold leading-tight text-card-foreground">
            {title}
          </h3>
          <ArrowUpRight
            aria-hidden
            className="size-4 shrink-0 -translate-x-1 translate-y-1 text-muted-foreground opacity-0 transition-all duration-300 group-hover:translate-x-0 group-hover:translate-y-0 group-hover:opacity-100"
          />
        </div>

        {count ? (
          <p className="relative text-sm leading-snug">
            <span className="font-semibold tabular-nums text-foreground">
              {parts?.num ?? count}
            </span>{" "}
            <span className="text-muted-foreground">{parts?.rest ?? ""}</span>
          </p>
        ) : null}

        {description ? (
          <p className="relative line-clamp-2 text-xs leading-relaxed text-muted-foreground/90">
            {description}
          </p>
        ) : null}
      </Link>
    </motion.div>
  );
}
