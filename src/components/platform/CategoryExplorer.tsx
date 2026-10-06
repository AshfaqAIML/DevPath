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
  ChevronRight,
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
  const [sort, setSort] = React.useState<(typeof SORTS)[number]["value"]>("featured");
  const [selected, setSelected] = React.useState<ResourceItemView | null>(null);

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
    queryKey: ["items", live.slug, debouncedQ, level, sort],
    queryFn: () => fetchItems({ category: live.slug, q: debouncedQ, level, sort }),
    initialData:
      debouncedQ === "" && level === "All" && sort === "featured"
        ? { items: initialItems }
        : undefined,
    placeholderData: (prev) => prev,
  });

  const items = data?.items ?? [];

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

      {/* Toolbar: search + level filter + sort */}
      <div
        role="search"
        className="flex flex-col gap-3 rounded-2xl border bg-card/60 p-4 sm:flex-row sm:items-center"
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
          hasAnyContent={live.count > 0 || initialItems.length > 0}
          onReset={() => {
            setQ("");
            setLevel("All");
            setSort("featured");
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
  hasAnyContent,
  onReset,
}: {
  hasAnyContent: boolean;
  onReset: () => void;
}) {
  return (
    <div className="flex flex-col items-center justify-center gap-4 rounded-2xl border border-dashed py-16 text-center">
      <span className="flex size-12 items-center justify-center rounded-2xl bg-muted">
        {hasAnyContent ? (
          <SearchX aria-hidden className="size-6 text-muted-foreground" />
        ) : (
          <Sparkles aria-hidden className="size-6 text-muted-foreground" />
        )}
      </span>
      <div className="space-y-1.5">
        <p className="font-semibold">
          {hasAnyContent ? "No results found" : "Launching soon"}
        </p>
        <p className="max-w-sm text-sm text-muted-foreground">
          {hasAnyContent
            ? "Try a different search term or clear the filters."
            : "Simulator experiences are in active development and will be published here as soon as they’re ready."}
        </p>
      </div>
      {hasAnyContent && (
        <Button variant="outline" size="sm" onClick={onReset}>
          Clear filters
        </Button>
      )}
    </div>
  );
}
