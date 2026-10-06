"use client";

import * as React from "react";
import Link from "next/link";
import { useTheme } from "next-themes";
import { Compass, Menu, Moon, Search, Settings2, Sun, Bookmark } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { categoryHref, trackEvent, type CategoriesPayload } from "./platform-data";
import { useLibrary, useLibraryHydrated } from "@/lib/library-store";
import { getAccent } from "@/lib/accent";
import { cn } from "@/lib/utils";

interface SiteHeaderProps {
  data: CategoriesPayload;
  onOpenSearch: () => void;
  activeCategory?: string | null;
}

export function SiteHeader({ data, onOpenSearch, activeCategory }: SiteHeaderProps) {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = React.useState(false);
  const [mobileOpen, setMobileOpen] = React.useState(false);
  const libraryHydrated = useLibraryHydrated();
  const savedCount = useLibrary((s) => s.saved.length);
  React.useEffect(() => setMounted(true), []);

  const categories = data.categories.filter((c) => c.enabled);

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/80 backdrop-blur-md supports-[backdrop-filter]:bg-background/60">
      <div className="mx-auto flex h-16 max-w-6xl items-center gap-3 px-4 sm:px-6">
        {/* Brand */}
        <Link
          href="/"
          className="flex items-center gap-2.5 rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          aria-label="DevPath home"
        >
          <span className="flex size-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <Compass className="size-4.5" aria-hidden />
          </span>
          <span className="hidden text-lg font-bold tracking-tight sm:block">
            DevPath
          </span>
        </Link>

        {/* Desktop category nav — the five-part IA as primary navigation */}
        <nav
          aria-label="Primary"
          className="ml-2 hidden items-center gap-1 md:flex"
        >
          {categories.map((c) => {
            const a = getAccent(c.accent);
            const active = activeCategory === c.slug;
            return (
              <Link
                key={c.slug}
                href={categoryHref(c.slug)}
                onClick={() => trackEvent("card_click", c.slug, c.title)}
                className={cn(
                  "relative rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                  active
                    ? "text-foreground"
                    : "text-muted-foreground hover:text-foreground"
                )}
                aria-current={active ? "page" : undefined}
              >
                {c.title}
                {c.badge ? (
                  <span
                    className={cn(
                      "ml-1.5 inline-flex items-center rounded border px-1 py-px text-[10px] font-semibold",
                      a.badge
                    )}
                  >
                    {c.badge}
                  </span>
                ) : null}
                <span
                  aria-hidden
                  className={cn(
                    "absolute inset-x-3 -bottom-px h-0.5 rounded-full transition-opacity",
                    a.dot,
                    active ? "opacity-100" : "opacity-0"
                  )}
                />
              </Link>
            );
          })}
        </nav>

        <div className="ml-auto flex items-center gap-1.5">
          {/* Global search */}
          <Button
            variant="outline"
            size="sm"
            onClick={onOpenSearch}
            className="h-9 gap-2 rounded-lg px-3 text-muted-foreground"
            aria-label="Search the platform"
          >
            <Search className="size-4" aria-hidden />
            <span className="hidden lg:block">Search</span>
            <kbd className="ml-1 hidden rounded border bg-muted px-1.5 font-mono text-[10px] font-medium text-muted-foreground lg:block">
              ⌘K
            </kbd>
          </Button>

          {/* My library — saved items badge */}
          <Button
            variant="ghost"
            size="icon"
            className="relative size-9 rounded-lg"
            asChild
          >
            <Link href="/?view=library" aria-label="Open my library">
              <Bookmark className="size-4.5" aria-hidden />
              {libraryHydrated && savedCount > 0 && (
                <span
                  aria-hidden
                  className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-amber-500 px-1 text-[10px] font-bold tabular-nums text-amber-950"
                >
                  {savedCount > 9 ? "9+" : savedCount}
                </span>
              )}
            </Link>
          </Button>

          {/* Theme toggle */}
          <Button
            variant="ghost"
            size="icon"
            className="size-9 rounded-lg"
            onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
            aria-label="Toggle color theme"
          >
            {mounted ? (
              theme === "dark" ? (
                <Sun className="size-4.5" aria-hidden />
              ) : (
                <Moon className="size-4.5" aria-hidden />
              )
            ) : (
              <Moon className="size-4.5" aria-hidden />
            )}
          </Button>

          {/* Admin console entry */}
          <Button
            variant="ghost"
            size="icon"
            className="hidden size-9 rounded-lg sm:inline-flex"
            asChild
          >
            <Link href="/?view=admin" aria-label="Open admin console">
              <Settings2 className="size-4.5" aria-hidden />
            </Link>
          </Button>

          {/* Mobile nav */}
          <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
            <SheetTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="size-9 rounded-lg md:hidden"
                aria-label="Open navigation menu"
              >
                <Menu className="size-5" aria-hidden />
              </Button>
            </SheetTrigger>
            <SheetContent side="right" className="w-72 p-0">
              <SheetDescription className="sr-only">
                Browse the five resource categories of the platform
              </SheetDescription>
              <div className="flex h-full flex-col">
                <div className="flex items-center gap-2.5 border-b px-5 py-4">
                  <span className="flex size-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
                    <Compass className="size-4.5" aria-hidden />
                  </span>
                  <SheetTitle className="text-base font-bold">DevPath</SheetTitle>
                </div>
                <nav aria-label="Resource categories" className="flex-1 overflow-y-auto p-3">
                  {categories.map((c) => {
                    const a = getAccent(c.accent);
                    return (
                      <Link
                        key={c.slug}
                        href={categoryHref(c.slug)}
                        onClick={() => {
                          trackEvent("card_click", c.slug, c.title);
                          setMobileOpen(false);
                        }}
                        className={cn(
                          "flex items-center justify-between rounded-xl px-4 py-3 text-sm font-medium transition-colors hover:bg-accent",
                          activeCategory === c.slug && "bg-accent"
                        )}
                      >
                        <span className="flex items-center gap-3">
                          <span aria-hidden className={cn("size-2 rounded-full", a.dot)} />
                          {c.title}
                        </span>
                        <span className="text-xs tabular-nums text-muted-foreground">
                          {c.count > 0 ? `${c.count} ${c.countLabel}` : (c.badge ?? "—")}
                        </span>
                      </Link>
                    );
                  })}
                </nav>
                <div className="border-t p-3">
                  <Button asChild variant="outline" className="w-full justify-start gap-2">
                    <Link href="/?view=library" onClick={() => setMobileOpen(false)}>
                      <Bookmark className="size-4" aria-hidden />
                      My library
                      {libraryHydrated && savedCount > 0 && (
                        <span className="ml-auto rounded-full bg-amber-500/15 px-2 py-0.5 text-[10px] font-semibold tabular-nums text-amber-600 dark:text-amber-400">
                          {savedCount}
                        </span>
                      )}
                    </Link>
                  </Button>
                  <Button asChild variant="outline" className="mt-2 w-full justify-start gap-2">
                    <Link href="/?view=admin" onClick={() => setMobileOpen(false)}>
                      <Settings2 className="size-4" aria-hidden />
                      Admin console
                    </Link>
                  </Button>
                </div>
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </header>
  );
}
