"use client";

// GlobalSearch — the platform-wide Ctrl/⌘+K palette. Searches every published
// item across the five categories and deep-links into the category view.
import * as React from "react";
import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { Play, Search } from "lucide-react";

import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@/components/ui/command";
import { trackEvent, fetchItems } from "./platform-data";
import { getAccent } from "@/lib/accent";
import { isPlayableSimulator, simulatorViewHref } from "@/lib/simulators";
import { cn } from "@/lib/utils";
import type { CategoriesPayload } from "./platform-data";

interface GlobalSearchProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  categoriesData: CategoriesPayload;
}

export function GlobalSearch({ open, onOpenChange, categoriesData }: GlobalSearchProps) {
  const router = useRouter();

  // Load the full catalog when the palette opens (small dataset)
  const { data } = useQuery({
    queryKey: ["items", "all-catalog"],
    queryFn: () => fetchItems({}),
    enabled: open,
    staleTime: 60_000,
  });

  // ⌘K / Ctrl+K
  React.useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        onOpenChange(!open);
      }
    };
    document.addEventListener("keydown", down);
    return () => document.removeEventListener("keydown", down);
  }, [open, onOpenChange]);

  const items = data?.items ?? [];
  const categories = categoriesData.categories.filter((c) => c.enabled);

  const go = (href: string) => {
    onOpenChange(false);
    router.push(href);
  };

  return (
    <CommandDialog open={open} onOpenChange={onOpenChange} aria-label="Search the platform">
      <CommandInput placeholder="Search courses, roadmaps, guides…" />
      <CommandList className="max-h-[70vh]">
        <CommandEmpty>No results found.</CommandEmpty>

        <CommandGroup heading="Categories">
          {categories.map((c) => {
            const a = getAccent(c.accent);
            return (
              <CommandItem
                key={`cat-${c.slug}`}
                value={`${c.title} category ${c.countLabel}`}
                onSelect={() => {
                  trackEvent("search", c.slug, `jump:${c.title}`);
                  go(`/?category=${c.slug}`);
                }}
              >
                <span aria-hidden className={cn("size-2 rounded-full", a.dot)} />
                <span className="font-medium">{c.title}</span>
                <span className="ml-auto text-xs text-muted-foreground">
                  {c.count > 0 ? `${c.count} ${c.countLabel}` : (c.badge ?? "")}
                </span>
              </CommandItem>
            );
          })}
        </CommandGroup>
        <CommandSeparator />

        {categories.map((c) => {
          const catItems = items.filter((i) => i.categorySlug === c.slug);
          if (!catItems.length) return null;
          const a = getAccent(c.accent);
          return (
            <CommandGroup key={`group-${c.slug}`} heading={`${c.title} · ${c.count} ${c.countLabel}`}>
              {catItems.map((i) => {
                const playable =
                  i.categorySlug === "simulators" && isPlayableSimulator(i.slug);
                return (
                  <CommandItem
                    key={i.id}
                    value={`${i.title} ${i.tags.join(" ")} ${i.level} ${c.title}`}
                    onSelect={() => {
                      trackEvent("item_view", i.slug, i.title);
                      go(
                        playable
                          ? simulatorViewHref(i.slug)
                          : `/?category=${c.slug}&item=${i.slug}`
                      );
                    }}
                  >
                    {playable ? (
                      <span className="flex size-3.5 shrink-0 items-center justify-center rounded-full bg-teal-500/20 text-teal-600 dark:text-teal-400" aria-hidden>
                        <Play className="size-2 fill-current" />
                      </span>
                    ) : (
                      <Search aria-hidden className="size-3.5 text-muted-foreground" />
                    )}
                    <span className="truncate">{i.title}</span>
                    <span
                      aria-hidden
                      className={cn("ml-1.5 size-1.5 shrink-0 rounded-full", a.dot)}
                    />
                    {playable && (
                      <span className="ml-auto rounded border border-teal-500/40 bg-teal-500/10 px-1.5 py-px text-[10px] font-semibold text-teal-600 dark:text-teal-300">
                        Play
                      </span>
                    )}
                  </CommandItem>
                );
              })}
            </CommandGroup>
          );
        })}
      </CommandList>
    </CommandDialog>
  );
}
