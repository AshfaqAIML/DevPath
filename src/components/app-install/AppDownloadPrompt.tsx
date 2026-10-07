"use client";

import { Download, FileQuestion, Sparkles, X, GraduationCap } from "lucide-react";
import type { AppReleaseStatus } from "@/types/app-release";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";

const BENEFITS = [
  "Full course library on your home screen",
  "Immersive full-screen lessons & simulators",
  "One-tap resume where you left off",
  "No app store, no account needed",
];

/**
 * Elegant first-visit install prompt for Android visitors.
 * Never traps the user: Continue on Web simply closes it, and the
 * X dismisses with persistence handled by the caller.
 */
export function AppDownloadPrompt({
  open,
  status,
  loading,
  onDismiss,
  onDownload,
  className,
}: {
  open: boolean;
  status: AppReleaseStatus | null;
  loading?: boolean;
  onDismiss: () => void;
  onDownload: (url: string) => void;
  className?: string;
}) {
  const available = status?.available ?? false;
  const release = status?.release;

  return (
    <Dialog open={open} onOpenChange={(next) => !next && onDismiss()}>
      <DialogContent
        className={cn("overflow-hidden p-0 sm:max-w-md", className)}
        showCloseButton={false}
        aria-describedby="app-prompt-desc"
      >
        <div className="relative">
          <div
            aria-hidden="true"
            className="absolute inset-x-0 top-0 h-24 bg-gradient-to-b from-emerald-500/15 to-transparent"
          />
          <button
            type="button"
            onClick={onDismiss}
            aria-label="Dismiss"
            className="absolute right-4 top-4 rounded-full p-1.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          >
            <X className="h-4 w-4" aria-hidden="true" />
          </button>

          <div className="relative px-6 pb-6 pt-8 text-center sm:px-8">
            <img
              src="/icons/app/icon-192.png"
              alt="DevPath app icon"
              width={64}
              height={64}
              className="mx-auto rounded-2xl shadow-md ring-1 ring-black/5"
            />
            <DialogTitle className="mt-3 text-xl font-semibold tracking-tight">
              Take DevPath with you
            </DialogTitle>
            <DialogDescription
              id="app-prompt-desc"
              className="mt-1 text-sm text-muted-foreground"
            >
              Install the app for the fastest way to keep learning on the go.
            </DialogDescription>

            <ul className="mx-auto mt-5 max-w-xs space-y-2.5 text-left text-sm">
              {BENEFITS.map((b) => (
                <li key={b} className="flex items-start gap-2.5">
                  <Sparkles
                    className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600"
                    aria-hidden="true"
                  />
                  <span className="text-foreground/90">{b}</span>
                </li>
              ))}
            </ul>

            {loading ? (
              <div className="mt-5 space-y-2.5">
                <Skeleton className="h-11 w-full rounded-xl" />
                <Skeleton className="mx-auto h-4 w-32" />
              </div>
            ) : available && release ? (
              <div className="mt-5 space-y-2.5">
                <Button
                  size="lg"
                  className="w-full gap-1.5 text-base"
                  onClick={() => onDownload(release.downloadUrl)}
                >
                  <Download className="h-5 w-5" aria-hidden="true" />
                  {release.sizeLabel
                    ? `Download · ${release.sizeLabel}`
                    : `Download v${release.version}`}
                </Button>
                <p className="text-xs text-muted-foreground">
                  v{release.version}
                  {release.minOsVersion
                    ? ` · Android ${release.minOsVersion}+`
                    : null}
                </p>
              </div>
            ) : (
              <div className="mt-5 space-y-2.5">
                <div className="flex items-start gap-2.5 rounded-xl border bg-muted/40 p-3 text-left text-xs text-muted-foreground">
                  <FileQuestion
                    className="mt-0.5 h-4 w-4 shrink-0"
                    aria-hidden="true"
                  />
                  <span>
                    The installable package isn&apos;t published yet — use
                    Add to Home Screen for the same home-screen experience
                    today.
                  </span>
                </div>
                <Button
                  size="lg"
                  variant="outline"
                  className="w-full gap-1.5"
                  onClick={onDismiss}
                >
                  <GraduationCap className="h-5 w-5" aria-hidden="true" />
                  Continue on Web
                </Button>
              </div>
            )}

            <button
              type="button"
              onClick={onDismiss}
              className="mt-4 text-xs text-muted-foreground underline-offset-4 hover:underline"
            >
              Continue on Web
            </button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
