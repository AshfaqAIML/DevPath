"use client";

// HomeView — the resources landing experience: hero, the five-category hub
// (the primary navigation mechanism), and featured content across categories.
import * as React from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowDown, Search, Sparkles } from "lucide-react";

import { Button } from "@/components/ui/button";
import { getAccent } from "@/lib/accent";
import { cn } from "@/lib/utils";
import type { ResourceItemView } from "@/lib/platform";
import { CategoryHub } from "./CategoryHub";
import { ResourceItemCard } from "./ResourceItemCard";
import { ItemDetailDialog } from "./ItemDetailDialog";
import { type CategoriesPayload, trackEvent } from "./platform-data";

interface HomeViewProps {
  categoriesData: CategoriesPayload;
  featuredItems: ResourceItemView[];
  onOpenSearch: () => void;
}

export function HomeView({ categoriesData, featuredItems, onOpenSearch }: HomeViewProps) {
  const [selected, setSelected] = React.useState<ResourceItemView | null>(null);
  const categories = categoriesData.categories.filter((c) => c.enabled);
  const total = categoriesData.categories.reduce((s, c) => s + c.count, 0);

  return (
    <div className="space-y-14 sm:space-y-16">
      {/* Hero */}
      <section className="relative overflow-hidden rounded-3xl border bg-card/40 px-5 py-10 sm:px-10 sm:py-20">
        {/* decorative dot grid + glows */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 opacity-60 [background-image:radial-gradient(circle,var(--border)_1px,transparent_1px)] [background-size:26px_26px] [mask-image:radial-gradient(ellipse_70%_60%_at_50%_40%,black,transparent)]"
        />
        <div
          aria-hidden
          className="pointer-events-none absolute -left-24 -top-24 size-72 rounded-full bg-amber-500/10 blur-3xl"
        />
        <div
          aria-hidden
          className="pointer-events-none absolute -bottom-24 -right-24 size-72 rounded-full bg-emerald-500/10 blur-3xl"
        />

        <div className="relative mx-auto max-w-2xl space-y-6 text-center">
          <motion.p
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
            className="mx-auto inline-flex items-center gap-2 rounded-full border bg-background/60 px-3.5 py-1.5 text-xs font-medium text-muted-foreground backdrop-blur"
          >
            <span aria-hidden className="relative flex size-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-60" />
              <span className="relative inline-flex size-2 rounded-full bg-emerald-500" />
            </span>
            The developer learning platform
          </motion.p>

          <motion.h1
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.08 }}
            className="text-balance text-3xl font-bold leading-tight tracking-tight sm:text-5xl sm:leading-[1.1]"
          >
            Everything you need to{" "}
            <span className="bg-gradient-to-r from-amber-500 via-orange-500 to-rose-500 bg-clip-text text-transparent">
              level up
            </span>{" "}
            as a developer
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.16 }}
            className="text-pretty text-balance text-sm leading-relaxed text-muted-foreground sm:text-base"
          >
            Deep masterclasses, guided career roadmaps, focused mini courses,
            practical guides and interactive simulators — five content types,
            one cohesive learning system.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.24 }}
            className="flex flex-col items-center justify-center gap-3 sm:flex-row"
          >
            <Button asChild size="lg" className="gap-2 rounded-xl">
              <a href="#category-hub">
                Browse categories
                <ArrowDown aria-hidden className="size-4" />
              </a>
            </Button>
            <Button
              variant="outline"
              size="lg"
              className="gap-2 rounded-xl"
              onClick={onOpenSearch}
            >
              <Search aria-hidden className="size-4" />
              Search everything
              <kbd className="ml-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium text-muted-foreground">
                ⌘K
              </kbd>
            </Button>
          </motion.div>

          <motion.dl
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5, delay: 0.32 }}
            className="flex flex-wrap items-center justify-center gap-x-5 gap-y-2 pt-2 text-xs text-muted-foreground"
          >
            <div className="flex items-center gap-1.5">
              <dt className="sr-only">Published resources</dt>
              <dd>
                <span className="font-semibold tabular-nums text-foreground">{total}</span>{" "}
                published resources
              </dd>
            </div>
            {categories.map((c) => {
              const a = getAccent(c.accent);
              return (
                <div key={c.slug} className="flex items-center gap-1.5">
                  <dt>
                    <span aria-hidden className={cn("size-1.5 rounded-full", a.dot)} />
                    <span className="sr-only">{c.title}</span>
                  </dt>
                  <dd>
                    {c.count > 0 ? (
                      <>
                        <span className="font-semibold tabular-nums text-foreground">
                          {c.count}
                        </span>{" "}
                        {c.countLabel}
                      </>
                    ) : (
                      c.badge
                    )}
                  </dd>
                </div>
              );
            })}
          </motion.dl>
        </div>
      </section>

      {/* The category hub — the core navigation mechanism */}
      <CategoryHub data={categoriesData} />

      {/* Featured across the platform */}
      {featuredItems.length > 0 && (
        <section aria-labelledby="featured-heading" className="space-y-5">
          <div className="flex items-center gap-2.5">
            <Sparkles aria-hidden className="size-4 text-amber-500" />
            <h2 id="featured-heading" className="text-lg font-bold tracking-tight sm:text-xl">
              Editor&rsquo;s picks
            </h2>
            <span className="text-xs text-muted-foreground">
              featured across all categories
            </span>
          </div>
          <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {featuredItems.slice(0, 6).map((item, i) => (
              <li key={item.id} className="h-full">
                <ResourceItemCard
                  item={item}
                  index={i}
                  onSelect={(it) => {
                    setSelected(it);
                    trackEvent("item_view", it.slug, it.title);
                  }}
                />
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* CTA band */}
      <section className="relative overflow-hidden rounded-3xl border bg-gradient-to-br from-primary/10 via-transparent to-transparent px-6 py-10 text-center sm:px-10">
        <h2 className="text-balance text-xl font-bold tracking-tight sm:text-2xl">
          Not sure where to start?
        </h2>
        <p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground">
          Pick a career path in Roadmaps and the platform will point you to the
          masterclasses, courses and cheatsheets you need at every step.
        </p>
        <Button asChild className="mt-5 gap-2 rounded-xl">
          <Link
            href="/?category=roadmaps"
            onClick={() => trackEvent("card_click", "roadmaps", "cta-roadmaps")}
          >
            Explore Roadmaps
          </Link>
        </Button>
      </section>

      <ItemDetailDialog item={selected} onOpenChange={(open) => !open && setSelected(null)} />
    </div>
  );
}
