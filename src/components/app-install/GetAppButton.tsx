"use client";

import * as React from "react";
import { Download } from "lucide-react";
import type { AppReleaseStatus } from "@/types/app-release";
import { appPromptStore } from "@/lib/app-prompt-store";
import { trackEvent } from "@/components/platform/platform-data";
import { Button } from "@/components/ui/button";
import { InstallDialog } from "@/components/app-install/InstallDialog";

type ButtonProps = React.ComponentProps<typeof Button>;

/**
 * Self-contained "Get the App" button — drop it anywhere.
 * When a published app artifact exists, it downloads it directly (and records
 * the download so auto-prompts stay silent). Otherwise it opens the PWA
 * install sheet (one-tap install when the browser offers it, manual
 * Add-to-Home-Screen steps if not).
 */
export function GetAppButton({
  variant = "outline",
  size,
  className,
}: Pick<ButtonProps, "variant" | "size" | "className">) {
  const [status, setStatus] = React.useState<AppReleaseStatus | null>(null);
  const [sheetOpen, setSheetOpen] = React.useState(false);

  React.useEffect(() => {
    let cancelled = false;
    fetch("/api/releases/latest", { cache: "no-store" })
      .then((res) => (res.ok ? res.json() : Promise.reject(new Error(String(res.status)))))
      .then((data: AppReleaseStatus) => {
        if (!cancelled) setStatus(data);
      })
      .catch(() => {
        if (!cancelled) setStatus(null);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const track = (version?: string) => {
    appPromptStore.markDownloaded();
    trackEvent("app_download", version ?? null, "get-app-button");
  };

  const available = status?.available ?? false;
  const release = status?.release;

  if (available && release) {
    const label = release.sizeLabel
      ? `Download App · ${release.sizeLabel}`
      : `Download App · v${release.version}`;
    return (
      <Button asChild variant={variant} size={size} className={className}>
        <a href={release.downloadUrl} download onClick={() => track(release.version)}>
          <Download className="h-4 w-4" aria-hidden="true" />
          {label}
        </a>
      </Button>
    );
  }

  const dismissHint = () => {
    try {
      window.localStorage.setItem("devpath.pwaHint.v1", "done");
    } catch {
      // ignore
    }
    setSheetOpen(false);
  };

  return (
    <>
      <Button variant={variant} size={size} className={className} onClick={() => setSheetOpen(true)}>
        <Download className="h-4 w-4" aria-hidden="true" />
        Get the App
      </Button>
      <InstallDialog open={sheetOpen} onOpenChange={setSheetOpen} onDone={dismissHint} />
    </>
  );
}
