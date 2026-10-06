"use client";

import * as React from "react";
import Image from "next/image";
import Link from "next/link";
import { ArrowRight, Bookmark, Check, Clock, Eye, Route, Sparkles } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { getAccent } from "@/lib/accent";
import { cn } from "@/lib/utils";
import { useLibrary, useLibraryHydrated } from "@/lib/library-store";
import type { ResourceItemView } from "@/lib/platform";

interface ItemDetailDialogProps {
  item: ResourceItemView | null;
  onOpenChange: (open: boolean) => void;
}

export function ItemDetailDialog({ item, onOpenChange }: ItemDetailDialogProps) {
  const { toast } = useToast();
  const hydrated = useLibraryHydrated();
  const saved = useLibrary((s) => (item ? s.saved.includes(item.slug) : false));
  const completed = useLibrary((s) => (item ? s.completed.includes(item.slug) : false));
  const toggleSaved = useLibrary((s) => s.toggleSaved);
  const toggleCompleted = useLibrary((s) => s.toggleCompleted);
  const pushRecent = useLibrary((s) => s.pushRecent);

  // Track recently viewed (for the "Jump back in" strip) whenever an item opens
  React.useEffect(() => {
    if (!item) return;
    pushRecent({
      slug: item.slug,
      title: item.title,
      level: item.level,
      duration: item.duration,
      categorySlug: item.categorySlug,
      categoryTitle: item.categoryTitle,
      categoryIcon: item.categoryIcon,
      categoryAccent: item.categoryAccent,
    });
  }, [item, pushRecent]);

  if (!item) return null;
  const a = getAccent(item.categoryAccent);

  return (
    <Dialog open={!!item} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg gap-0 p-0">
        <div className={cn("relative overflow-hidden border-b p-6", a.gradient)}>
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0 opacity-60 [background-image:radial-gradient(circle,var(--border)_1px,transparent_1px)] [background-size:18px_18px] [mask-image:radial-gradient(ellipse_80%_100%_at_60%_0%,black,transparent)]"
          />
          <div className="relative flex items-center gap-4">
            <div className={cn("relative size-16 shrink-0 overflow-hidden rounded-xl ring-1", a.iconWrap)}>
              <Image
                src={item.categoryIcon}
                alt={`${item.categoryTitle} category icon`}
                fill
                sizes="64px"
                className="object-cover"
              />
            </div>
            <div className="min-w-0">
              <DialogHeader className="space-y-1.5 text-left">
                <DialogTitle className="text-lg font-bold leading-tight">
                  {item.title}
                </DialogTitle>
                <DialogDescription className="flex items-center gap-1.5 text-xs">
                  <Route aria-hidden className="size-3.5" />
                  {item.categoryTitle} · {item.level}
                </DialogDescription>
              </DialogHeader>
            </div>
          </div>
        </div>

        <div className="space-y-4 p-6">
          <p className="text-sm leading-relaxed text-muted-foreground">
            {item.description}
          </p>

          <div className="flex flex-wrap items-center gap-2">
            {item.duration ? (
              <Badge variant="outline" className="gap-1.5 font-normal">
                <Clock aria-hidden className="size-3" />
                {item.duration}
              </Badge>
            ) : null}
            {item.featured ? (
              <Badge variant="outline" className="gap-1.5 font-normal">
                <Sparkles aria-hidden className="size-3" />
                Featured
              </Badge>
            ) : null}
            <Badge variant="outline" className="gap-1.5 font-normal">
              <Eye aria-hidden className="size-3" />
              {item.views} views
            </Badge>
            {item.tags.map((t) => (
              <span
                key={t}
                className="rounded bg-muted px-2 py-0.5 font-mono text-[11px] text-muted-foreground"
              >
                {t}
              </span>
            ))}
          </div>

          {/* Personal library actions */}
          {hydrated && (
            <div className="flex flex-wrap gap-2">
              <Button
                variant="outline"
                size="sm"
                className={cn(
                  "h-8 gap-1.5 rounded-lg text-xs",
                  saved && "border-amber-500/50 text-amber-600 dark:text-amber-400"
                )}
                onClick={() => {
                  const now = toggleSaved(item.slug);
                  toast({
                    title: now ? "Saved to your library" : "Removed from library",
                    description: now
                      ? `“${item.title}” is bookmarked — find it under My Library.`
                      : `“${item.title}” was removed from your saved items.`,
                  });
                }}
                aria-pressed={saved}
              >
                <Bookmark
                  aria-hidden
                  className={cn("size-3.5", saved && "fill-amber-500")}
                />
                {saved ? "Saved" : "Save for later"}
              </Button>
              <Button
                variant="outline"
                size="sm"
                className={cn(
                  "h-8 gap-1.5 rounded-lg text-xs",
                  completed && "border-emerald-500/50 text-emerald-600 dark:text-emerald-400"
                )}
                onClick={() => {
                  const now = toggleCompleted(item.slug);
                  toast({
                    title: now ? "Marked as complete 🏁" : "Marked as in progress",
                    description: now
                      ? `“${item.title}” moved to your completed list.`
                      : `“${item.title}” is back on your active list.`,
                  });
                }}
                aria-pressed={completed}
              >
                <Check aria-hidden className="size-3.5" />
                {completed ? "Completed" : "Mark complete"}
              </Button>
            </div>
          )}

          <div className="flex flex-col gap-2 pt-2 sm:flex-row">
            <Button
              className="gap-2 sm:flex-1"
              onClick={() => {
                toast({
                  title: "Enrolled 🎉",
                  description: `“${item.title}” is now on your learning queue.`,
                });
                onOpenChange(false);
              }}
            >
              Start learning
              <ArrowRight aria-hidden className="size-4" />
            </Button>
            <Button asChild variant="outline" className="gap-2">
              <Link href={`/?category=${item.categorySlug}`}>
                Browse {item.categoryTitle}
              </Link>
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
