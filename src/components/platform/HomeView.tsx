"use client";

// HomeView — the resources landing experience: hero, the category hub
// (the primary navigation mechanism), trending content, featured picks and
// the personalized "jump back in" strip from the local library.
import * as React from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowDown, ArrowRight, Flame, History, Play, Search, Sparkles } from "lucide-react";

import { Button } from "@/components/ui/button";
import { GetAppButton } from "@/components/app-install/GetAppButton";
import { getAccent } from "@/lib/accent";
import { cn } from "@/lib/utils";
import { SPOTLIGHT_SIM, isPlayableSimulator, simulatorViewHref } from "@/lib/simulators";
import { useLibrary, useLibraryHydrated } from "@/lib/library-store";
import type { ResourceItemView } from "@/lib/platform";
import { CategoryHub } from "./CategoryHub";
import { ResourceItemCard } from "./ResourceItemCard";
import { ItemDetailDialog } from "./ItemDetailDialog";
import { type CategoriesPayload, trackEvent } from "./platform-data";

interface HomeViewProps {
  categoriesData: CategoriesPayload;
  featuredItems: ResourceItemView[];
  trendingItems: ResourceItemView[];
  onOpenSearch: () => void;
}

/** Section heading with a small accent bar for visual rhythm. */
function SectionHeading({
  id,
  icon: Icon,
  iconClass,
  title,
  trailing,
}: {
  id: string;
  icon: React.ComponentType<{ className?: string; "aria-hidden"?: boolean }>;
  iconClass?: string;
  title: string;
  trailing?: React.ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
      <div className="flex items-center gap-3">
        <span aria-hidden className="h-5 w-1 rounded-full bg-gradient-to-b from-amber-400 to-orange-500" />
        <Icon aria-hidden className={cn("size-4", iconClass)} />
        <h2 id={id} className="text-lg font-bold tracking-tight sm:text-xl">
          {title}
        </h2>
      </div>
      {trailing}
    </div>
  );
}

export function HomeView({ categoriesData, featuredItems, trendingItems, onOpenSearch }: HomeViewProps) {
  const [selected, setSelected] = React.useState<ResourceItemView | null>(null);
  const categories = categoriesData.categories.filter((c) => c.enabled);
  const total = categoriesData.categories.reduce((s, c) => s + c.count, 0);

  const hydrated = useLibraryHydrated();
  const recent = useLibrary((s) => s.recent);
  const recentEntries = hydrated ? recent.slice(0, 5) : [];

  const openItem = (it: ResourceItemView) => {
    setSelected(it);
    trackEvent("item_view", it.slug, it.title);
  };

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
          className="pointer-events-none absolute -left-24 -top-24 size-72 animate-pulse-slow rounded-full bg-amber-500/10 blur-3xl"
        />
        <div
          aria-hidden
          className="pointer-events-none absolute -bottom-24 -right-24 size-72 animate-pulse-slow rounded-full bg-emerald-500/10 blur-3xl [animation-delay:1.5s]"
        />
        {/* top accent line */}
        <div
          aria-hidden
          className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-amber-500/40 to-transparent"
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
            <span className="relative bg-gradient-to-r from-amber-500 via-orange-500 to-rose-500 bg-clip-text text-transparent">
              level up
              <span
                aria-hidden
                className="absolute -inset-x-2 -bottom-1 h-[3px] rounded-full bg-gradient-to-r from-transparent via-amber-500/50 to-transparent"
              />
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
            practical guides and interactive simulators — five content types
            plus finished courses, one cohesive learning system.
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
            <GetAppButton size="lg" variant="outline" className="gap-2 rounded-xl" />
          </motion.div>

          {/* Spotlight: the newly shipped interactive sandbox */}
          {isPlayableSimulator(SPOTLIGHT_SIM.slug) && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.5, delay: 0.3 }}
            >
              <Link
                href={simulatorViewHref(SPOTLIGHT_SIM.slug)}
                onClick={() => trackEvent("card_click", "simulators", "hero-spotlight")}
                className="group inline-flex items-center gap-2 rounded-full border border-teal-500/30 bg-teal-500/[0.07] py-1 pl-1 pr-3 text-xs font-medium text-teal-700 transition-all hover:border-teal-500/50 hover:bg-teal-500/15 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring dark:text-teal-300"
              >
                <span className="flex size-5 items-center justify-center rounded-full bg-teal-500 text-teal-50 transition-transform duration-300 group-hover:scale-110" aria-hidden>
                  <Play className="size-2.5 fill-current" />
                </span>
                {SPOTLIGHT_SIM.label}
                <ArrowRight aria-hidden className="size-3 transition-transform duration-300 group-hover:translate-x-0.5" />
              </Link>
            </motion.div>
          )}

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

      {/* Jump back in — personalized strip from the local library */}
      {recentEntries.length > 0 && (
        <section aria-labelledby="jump-heading" className="space-y-4">
          <SectionHeading
            id="jump-heading"
            icon={History}
            iconClass="text-muted-foreground"
            title="Jump back in"
            trailing={
              <Button asChild variant="ghost" size="sm" className="h-7 gap-1.5 rounded-lg text-xs">
                <Link href="/?view=library">
                  My library
                  <ArrowRight aria-hidden className="size-3.5" />
                </Link>
              </Button>
            }
          />
          <ul className="grid gap-2.5 sm:grid-cols-2 lg:grid-cols-3">
            {recentEntries.map((r) => {
              const a = getAccent(r.categoryAccent);
              const playable = r.categorySlug === "simulators" && isPlayableSimulator(r.slug);
              return (
                <li key={r.slug}>
                  <Link
                    href={
                      playable
                        ? simulatorViewHref(r.slug)
                        : r.categorySlug === "courses"
                          // courses with lesson content open the course view;
                          // catalog-only courses fall back to the category view
                          ? `/?course=${r.slug}`
                          : `/?category=${r.categorySlug}&item=${r.slug}`
                    }
                    className={cn(
                      "group flex items-center gap-3 rounded-xl border bg-card p-3 transition-all duration-200",
                      "hover:-translate-y-0.5 hover:shadow-md",
                      "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
                      a.hoverBorder
                    )}
                  >
                    <span
                      aria-hidden
                      className={cn("size-2 shrink-0 rounded-full", a.dot)}
                    />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-medium leading-tight">
                        {r.title}
                      </span>
                      <span className="block truncate text-[11px] text-muted-foreground">
                        {r.categoryTitle}
                        {r.duration ? ` · ${r.duration}` : ""}
                      </span>
                    </span>
                    <ArrowRight
                      aria-hidden
                      className="size-3.5 shrink-0 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100"
                    />
                  </Link>
                </li>
              );
            })}
          </ul>
        </section>
      )}

      {/* The category hub — the core navigation mechanism */}
      <CategoryHub data={categoriesData} />

      {/* Trending now — most viewed across the platform */}
      {trendingItems.length > 0 && (
        <section aria-labelledby="trending-heading" className="space-y-5">
          <SectionHeading
            id="trending-heading"
            icon={Flame}
            iconClass="text-orange-500"
            title="Trending now"
            trailing={
              <span className="text-xs text-muted-foreground">most viewed this cycle</span>
            }
          />
          <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {trendingItems.slice(0, 6).map((item, i) => (
              <li key={item.id} className="h-full">
                <ResourceItemCard item={item} index={i} onSelect={openItem} />
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* Featured across the platform */}
      {featuredItems.length > 0 && (
        <section aria-labelledby="featured-heading" className="space-y-5">
          <SectionHeading
            id="featured-heading"
            icon={Sparkles}
            iconClass="text-amber-500"
            title="Editor&rsquo;s picks"
            trailing={
              <span className="text-xs text-muted-foreground">featured across all categories</span>
            }
          />
          <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {featuredItems.slice(0, 6).map((item, i) => (
              <li key={item.id} className="h-full">
                <ResourceItemCard item={item} index={i} onSelect={openItem} />
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* CTA band */}
      <section className="relative overflow-hidden rounded-3xl border bg-gradient-to-br from-primary/10 via-transparent to-transparent px-6 py-10 text-center sm:px-10">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 opacity-50 [background-image:radial-gradient(circle,var(--border)_1px,transparent_1px)] [background-size:22px_22px] [mask-image:radial-gradient(ellipse_60%_80%_at_50%_100%,black,transparent)]"
        />
        <h2 className="relative text-balance text-xl font-bold tracking-tight sm:text-2xl">
          Not sure where to start?
        </h2>
        <p className="relative mx-auto mt-2 max-w-md text-sm text-muted-foreground">
          Pick a career path in Roadmaps and the platform will point you to the
          masterclasses, courses and cheatsheets you need at every step.
        </p>
        <Button asChild className="relative mt-5 gap-2 rounded-xl">
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
