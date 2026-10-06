"use client";

// CategoryExplorer — the real application section behind each category card.
// Search, level filtering and sorting all hit /api/resources; the count in
// the header is derived from the live categories query (DB-driven).
import * as React from "react";
import Image from "next/image";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import {
  ArrowLeft,
  Bookmark,
  ChevronRight,
  Layers,
  ListFilter,
  Loader2,
  Route,
  SearchX,
  Sparkles,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { getAccent } from "@/lib/accent";
import { TRACKS, trackStyles } from "@/lib/tracks";
import { useLibrary, useLibraryHydrated } from "@/lib/library-store";
import type { CategoryView, ResourceItemView } from "@/lib/platform";
import { fetchItems, trackEvent, type CategoriesPayload, type ItemsPayload } from "./platform-data";
import { ResourceItemCard } from "./ResourceItemCard";
import { ItemDetailDialog } from "./ItemDetailDialog";

const LEVELS = ["All", "Beginner", "Intermediate", "Advanced"] as const;
const SORTS = [
  { value: "featured", label: "Featured first" },
  { value: "popular", label: "Most viewed" },
  { value: "newest", label: "Newest" },
  { value: "az", label: "A → Z" },
] as const;

interface CategoryExplorerProps {
  category: CategoryView;
  initialItems: ResourceItemView[];
  /** deep-linked item (?item=slug) to open immediately */
  initialItemSlug?: string;
  categoriesData: CategoriesPayload;
}

export function CategoryExplorer({
  category,
  initialItems,
  initialItemSlug,
  categoriesData,
}: CategoryExplorerProps) {
  const live = categoriesData.categories.find((c) => c.slug === category.slug) ?? category;
  const a = getAccent(live.accent);

  const [q, setQ] = React.useState("");
  const [level, setLevel] = React.useState<(typeof LEVELS)[number]>("All");
  const [track, setTrack] = React.useState<string>("All");
  const [sort, setSort] = React.useState<(typeof SORTS)[number]["value"]>("featured");
  const [savedOnly, setSavedOnly] = React.useState(false);
  const [selected, setSelected] = React.useState<ResourceItemView | null>(null);

  // Track facets — derived from the SSR-fetched unfiltered list, so the
  // chips show stable per-track totals regardless of active filters.
  const trackCounts = React.useMemo(() => {
    const counts = new Map<string, number>();
    for (const i of initialItems) {
      if (i.track) counts.set(i.track, (counts.get(i.track) ?? 0) + 1);
    }
    return counts;
  }, [initialItems]);
  const hasTracks = trackCounts.size > 0;

  const hydrated = useLibraryHydrated();
  const saved = useLibrary((s) => s.saved);

  // Debounce the search input before hitting the API
  const [debouncedQ, setDebouncedQ] = React.useState("");
  React.useEffect(() => {
    const t = setTimeout(() => setDebouncedQ(q), 300);
    return () => clearTimeout(t);
  }, [q]);

  // Log search queries for analytics (only meaningful ones)
  const trackedRef = React.useRef(new Set<string>());
  React.useEffect(() => {
    if (debouncedQ.length >= 2 && !trackedRef.current.has(debouncedQ)) {
      trackedRef.current.add(debouncedQ);
      trackEvent("search", live.slug, debouncedQ);
    }
  }, [debouncedQ, live.slug]);

  const { data, isFetching } = useQuery<ItemsPayload>({
    queryKey: ["items", live.slug, debouncedQ, level, sort, track],
    queryFn: () => fetchItems({ category: live.slug, q: debouncedQ, level, sort, track }),
    initialData:
      debouncedQ === "" && level === "All" && sort === "featured" && track === "All"
        ? { items: initialItems }
        : undefined,
    placeholderData: (prev) => prev,
  });

  const items = React.useMemo(() => {
    const all = data?.items ?? [];
    return savedOnly ? all.filter((i) => saved.includes(i.slug)) : all;
  }, [data, savedOnly, saved]);

  // Deep-linked item (?item=slug) — open its dialog once after load
  const deepLinkHandled = React.useRef(false);
  React.useEffect(() => {
    if (initialItemSlug && !deepLinkHandled.current && items.length) {
      deepLinkHandled.current = true;
      const found = items.find((i) => i.slug === initialItemSlug);
      if (found) {
        setSelected(found);
        trackEvent("item_view", found.slug, found.title);
      }
    }
  }, [initialItemSlug, items]);

  const countLabel =
    live.count > 0 ? `${live.count} ${live.countLabel}` : live.badge ?? null;

  return (
    <div className="space-y-8">
      {/* Breadcrumb */}
      <nav aria-label="Breadcrumb" className="flex items-center gap-1.5 text-sm text-muted-foreground">
        <Link
          href="/"
          className="rounded inline-flex items-center gap-1 transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <ArrowLeft aria-hidden className="size-3.5" />
          All categories
        </Link>
        <ChevronRight aria-hidden className="size-3.5" />
        <span aria-current="page" className="font-medium text-foreground">
          {live.title}
        </span>
      </nav>

      {/* Category header */}
      <motion.header
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35 }}
        className={cn(
          "relative overflow-hidden rounded-2xl border p-6 sm:p-8",
          a.gradient
        )}
      >
        <div className="flex flex-col gap-5 sm:flex-row sm:items-center">
          <div className={cn("relative size-20 shrink-0 overflow-hidden rounded-2xl ring-1", a.iconWrap)}>
            <Image
              src={live.icon}
              alt={`${live.title} category icon`}
              fill
              sizes="80px"
              priority
              className="object-cover"
            />
          </div>
          <div className="min-w-0 space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
                {live.title}
              </h1>
              {live.badge ? (
                <span
                  className={cn(
                    "inline-flex items-center rounded-md border px-2 py-0.5 text-xs font-semibold",
                    a.badge
                  )}
                >
                  {live.badge}
                </span>
              ) : null}
              <span className="hidden items-center gap-1 rounded-md border bg-muted/50 px-2 py-0.5 font-mono text-[11px] text-muted-foreground sm:inline-flex">
                <Route aria-hidden className="size-3" />
                {live.route}
              </span>
            </div>
            <p className="max-w-2xl text-sm leading-relaxed text-muted-foreground">
              {live.description}
            </p>
            <p className="text-sm">
              {countLabel ? (
                <>
                  <span className="font-semibold tabular-nums text-foreground">
                    {live.count}
                  </span>{" "}
                  <span className="text-muted-foreground">
                    {live.countLabel} ·
                  </span>{" "}
                </>
              ) : null}
              <span className="text-muted-foreground">
                {items.length} shown
                {isFetching && q !== "" ? " · searching…" : ""}
              </span>
            </p>
          </div>
        </div>
      </motion.header>

      {/* Toolbar: search + level filter + saved filter + sort */}
      <div
        role="search"
        className="sticky top-20 z-30 flex flex-col gap-3 rounded-2xl border bg-background/85 p-4 shadow-sm backdrop-blur-md supports-[backdrop-filter]:bg-background/70 sm:flex-row sm:items-center"
      >
        <Input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder={`Search ${live.countLabel}…`}
          aria-label={`Search ${live.title}`}
          className="h-10 flex-1 rounded-lg bg-background"
          inputMode="search"
        />
        <ToggleGroup
          type="single"
          value={level}
          onValueChange={(v) => v && setLevel(v as (typeof LEVELS)[number])}
          variant="outline"
          aria-label="Filter by level"
          className="justify-start gap-1.5"
        >
          {LEVELS.map((l) => (
            <ToggleGroupItem
              key={l}
              value={l}
              size="sm"
              className="h-8 rounded-lg px-2.5 text-xs data-[state=on]:bg-primary data-[state=on]:text-primary-foreground"
            >
              {l}
            </ToggleGroupItem>
          ))}
        </ToggleGroup>
        <div className="flex items-center gap-2">
          {hydrated && (
            <Button
              type="button"
              variant={savedOnly ? "default" : "outline"}
              size="sm"
              onClick={() => setSavedOnly((v) => !v)}
              aria-pressed={savedOnly}
              className="h-9 gap-1.5 rounded-lg px-3 text-xs"
            >
              <Bookmark aria-hidden className={cn("size-3.5", savedOnly && "fill-current")} />
              Saved
              <span className="rounded-full bg-black/10 px-1.5 tabular-nums dark:bg-white/10">
                {saved.length}
              </span>
            </Button>
          )}
          <ListFilter aria-hidden className="size-4 text-muted-foreground" />
          <Select value={sort} onValueChange={(v) => setSort(v as typeof sort)}>
            <SelectTrigger className="h-9 w-[150px] rounded-lg text-xs" aria-label="Sort items">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {SORTS.map((s) => (
                <SelectItem key={s.value} value={s.value} className="text-xs">
                  {s.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Track facets (courses) — DB-driven, rendered from the tracks registry.
            Single-line horizontal scroll keeps the toolbar compact at every width;
            the right-edge fade hints that more chips are off-screen. */}
        {hasTracks && (
          <div className="relative w-full">
            <div
              role="group"
              aria-label="Filter by track"
              className="-mt-1 flex w-full items-center gap-1.5 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
            >
            <button
              type="button"
              onClick={() => setTrack("All")}
              aria-pressed={track === "All"}
              className={cn(
                "inline-flex shrink-0 items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                track === "All"
                  ? "border-primary/60 bg-primary/10 text-foreground"
                  : "border-border bg-muted/40 text-foreground/80 hover:border-foreground/30 hover:text-foreground"
              )}
            >
              <Layers aria-hidden className="size-3" />
              All tracks
              <span className="tabular-nums opacity-60">{initialItems.length}</span>
            </button>
            {TRACKS.filter((t) => trackCounts.has(t)).map((t) => {
              const ts = trackStyles[t];
              const active = track === t;
              return (
                <button
                  key={t}
                  type="button"
                  onClick={() => setTrack(active ? "All" : t)}
                  aria-pressed={active}
                  className={cn(
                    "inline-flex shrink-0 items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                    active
                      ? ts.active
                      : "border-border text-muted-foreground hover:border-foreground/30 hover:text-foreground"
                  )}
                >
                  <span aria-hidden className={cn("size-1.5 rounded-full", ts.dot)} />
                  {t}
                  <span className="tabular-nums opacity-60">{trackCounts.get(t)}</span>
                </button>
              );
            })}
            </div>
            <div
              aria-hidden
              className="pointer-events-none absolute inset-y-0 right-0 w-10 bg-gradient-to-r from-transparent to-background"
            />
          </div>
        )}
      </div>

      {/* Items grid */}
      {isFetching && items.length === 0 ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-44 rounded-2xl" />
          ))}
        </div>
      ) : items.length === 0 ? (
        <EmptyState
          mode={
            savedOnly
              ? "saved"
              : live.count > 0 || initialItems.length > 0
                ? "no-results"
                : "empty-category"
          }
          onReset={() => {
            setQ("");
            setLevel("All");
            setTrack("All");
            setSort("featured");
            setSavedOnly(false);
          }}
        />
      ) : (
        <div className="relative">
          {isFetching && (
            <div aria-hidden className="pointer-events-none absolute -top-6 right-0 z-10 inline-flex items-center gap-1.5 text-xs text-muted-foreground">
              <Loader2 aria-hidden className="size-3 animate-spin" />
              updating…
            </div>
          )}
          <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3" aria-label={`${live.title} items`}>
            {items.map((item, i) => (
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
        </div>
      )}

      <ItemDetailDialog item={selected} onOpenChange={(open) => !open && setSelected(null)} />
    </div>
  );
}

function EmptyState({
  mode,
  onReset,
}: {
  mode: "saved" | "no-results" | "empty-category";
  onReset: () => void;
}) {
  const copy =
    mode === "saved"
      ? {
          icon: Bookmark,
          title: "Nothing saved here yet",
          body: "Bookmark items with the save icon and they’ll show up in this filter — and in your library.",
          action: "Show all items",
        }
      : mode === "no-results"
        ? {
            icon: SearchX,
            title: "No results found",
            body: "Try a different search term or clear the filters.",
            action: "Clear filters",
          }
        : {
            icon: Sparkles,
            title: "Launching soon",
            body: "Simulator experiences are in active development and will be published here as soon as they’re ready.",
            action: null,
          };
  const Icon = copy.icon;
  return (
    <div className="flex flex-col items-center justify-center gap-4 rounded-2xl border border-dashed py-16 text-center">
      <span className="flex size-12 items-center justify-center rounded-2xl bg-muted">
        <Icon aria-hidden className="size-6 text-muted-foreground" />
      </span>
      <div className="space-y-1.5">
        <p className="font-semibold">{copy.title}</p>
        <p className="max-w-sm text-sm text-muted-foreground">{copy.body}</p>
      </div>
      {copy.action && (
        <Button variant="outline" size="sm" onClick={onReset}>
          {copy.action}
        </Button>
      )}
    </div>
  );
}
