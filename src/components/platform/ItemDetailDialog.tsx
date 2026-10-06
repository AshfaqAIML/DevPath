"use client";

import * as React from "react";
import Image from "next/image";
import Link from "next/link";
import { ArrowRight, Clock, Eye, Route, Sparkles } from "lucide-react";

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
import type { ResourceItemView } from "@/lib/platform";

interface ItemDetailDialogProps {
  item: ResourceItemView | null;
  onOpenChange: (open: boolean) => void;
}

export function ItemDetailDialog({ item, onOpenChange }: ItemDetailDialogProps) {
  const { toast } = useToast();
  if (!item) return null;
  const a = getAccent(item.categoryAccent);

  return (
    <Dialog open={!!item} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg gap-0 p-0">
        <div className={cn("flex items-center gap-4 border-b p-6", a.gradient)}>
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
