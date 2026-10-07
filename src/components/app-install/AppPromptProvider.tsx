"use client";

import { useEffect, useState } from "react";
import type { AppReleaseStatus } from "@/types/app-release";
import { useAppPrompt } from "@/hooks/use-app-prompt";
import { trackEvent } from "@/components/platform/platform-data";
import { AppDownloadPrompt } from "@/components/app-install/AppDownloadPrompt";

/**
 * Mounts once in the root layout. Runs first-visit detection and shows the
 * app-install prompt to eligible Android visitors. Also owns release-status
 * fetching so the modal can degrade gracefully when the artifact is absent.
 *
 * status: undefined = not fetched yet (loading), null = fetch failed.
 *
 * While no installable artifact is published yet, the prompt still appears
 * (offering the Add-to-Home-Screen path with an honest "not published yet"
 * note) — unlike a pure-APK flow, the PWA path is always available.
 */
export function AppPromptProvider() {
  const { show, dismiss, markDownloaded } = useAppPrompt();
  const [status, setStatus] = useState<AppReleaseStatus | undefined | null>(
    undefined
  );

  const needsFetch = show && status === undefined;

  useEffect(() => {
    if (!needsFetch) return;
    let cancelled = false;

    fetch("/api/releases/latest", { cache: "no-store" })
      .then((res) =>
        res.ok ? res.json() : Promise.reject(new Error(String(res.status)))
      )
      .then((data: AppReleaseStatus) => {
        if (!cancelled) setStatus(data);
      })
      .catch(() => {
        if (!cancelled) setStatus(null);
      });

    return () => {
      cancelled = true;
    };
  }, [needsFetch]);

  const handleDownload = (url: string) => {
    markDownloaded();
    trackEvent("app_download", status?.release.version ?? null, "first-visit-prompt");
    try {
      const a = document.createElement("a");
      a.href = url;
      a.download = "";
      document.body.appendChild(a);
      a.click();
      a.remove();
    } catch {
      window.location.href = url;
    }
  };

  const loading = show && status === undefined;
  // The PWA path is always available, so the prompt is useful with or without
  // a published artifact (unlike a pure-APK flow that must stay silent).
  const open = show;

  return (
    <AppDownloadPrompt
      open={open}
      status={status ?? null}
      loading={loading}
      onDismiss={dismiss}
      onDownload={handleDownload}
    />
  );
}
