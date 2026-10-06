"use client";

// CategoryHub — the five-category navigation system rendered near the top of
// the resources landing experience. Card data comes from the live categories
// query (SSR-seeded), never hardcoded in JSX.
import { motion } from "framer-motion";

import { ResourceCategoryCard } from "./ResourceCategoryCard";
import { categoryHref, trackEvent, type CategoriesPayload } from "./platform-data";
import { getAccent } from "@/lib/accent";
import { cn } from "@/lib/utils";

interface CategoryHubProps {
  data: CategoriesPayload;
  /** compact = tighter layout (used inside dialogs / small viewports) */
  compact?: boolean;
}

export function CategoryHub({ data }: CategoryHubProps) {
  const categories = data.categories.filter((c) => c.enabled);
  const totalPublished = data.categories.reduce((sum, c) => sum + c.count, 0);

  return (
    <section aria-labelledby="category-hub-heading" className="scroll-mt-24">
      <div className="flex flex-wrap items-end justify-between gap-x-6 gap-y-2">
        <div>
          <p className="text-xs font-medium uppercase tracking-[0.2em] text-muted-foreground">
            Category hub
          </p>
          <h2
            id="category-hub-heading"
            className="mt-1.5 text-xl font-bold tracking-tight sm:text-2xl"
          >
            Five ways to level up
          </h2>
        </div>
        <p className="text-sm text-muted-foreground">
          <span className="font-semibold tabular-nums text-foreground">
            {categories.length}
          </span>{" "}
          content types ·{" "}
          <span className="font-semibold tabular-nums text-foreground">
            {totalPublished}
          </span>{" "}
          published resources
        </p>
      </div>

      <nav
        aria-label="Resource categories"
        className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5"
      >
        {categories.map((c, i) => (
          <ResourceCategoryCard
            key={c.slug}
            title={c.title}
            description={c.tagline}
            count={c.count > 0 ? `${c.count} ${c.countLabel}` : null}
            icon={c.icon}
            href={categoryHref(c.slug)}
            badge={c.badge}
            badgeVariant={c.badgeVariant as "default" | "secondary" | "destructive" | "outline"}
            accent={c.accent}
            index={i}
            onNavigate={() => trackEvent("card_click", c.slug, c.title)}
          />
        ))}
      </nav>

      {/* the five-part information architecture, readable as one system */}
      <motion.ol
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.4, duration: 0.5 }}
        aria-label="Platform information architecture"
        className="mt-5 flex flex-wrap items-center gap-x-2 gap-y-2 text-xs text-muted-foreground"
      >
        {categories.map((c, i) => {
          const a = getAccent(c.accent);
          return (
            <li key={c.slug} className="flex items-center gap-2">
              {i > 0 && <span aria-hidden className="select-none opacity-50">→</span>}
              <span className="inline-flex items-center gap-1.5">
                <span aria-hidden className={cn("size-1.5 rounded-full", a.dot)} />
                {c.title}
              </span>
            </li>
          );
        })}
      </motion.ol>
    </section>
  );
}
