"use client";

import * as React from "react";
import { useSyncExternalStore } from "react";
import { detectPlatform, type Platform } from "@/lib/device";
import {
  appPromptEnabled,
  appPromptRetriggerMs,
  appPromptStore,
  readAppPromptOverride,
  type AppPromptState,
} from "@/lib/app-prompt-store";

/**
 * Hydration-safe browser-only value: returns `fallback` during SSR and the
 * computed value after mount. (DevPath-local equivalent of NETprep's
 * use-client-store hook, scoped to this feature.)
 */
function useBrowserValue<T>(compute: () => T, fallback: T): T {
  const [value, setValue] = React.useState<T>(fallback);
  React.useEffect(() => {
    setValue(compute());
  }, [compute]);
  return value;
}

/**
 * React binding for the first-visit app-install prompt.
 * `show` becomes true only after hydration, so SSR output is always stable.
 */
export function useAppPrompt() {
  const state: AppPromptState | null = useSyncExternalStore(
    appPromptStore.subscribe,
    appPromptStore.getSnapshot,
    appPromptStore.getServerSnapshot
  );

  const platform: Platform = useBrowserValue(detectPlatform, "desktop");
  const override = useBrowserValue(readAppPromptOverride, null);

  const show = React.useMemo(() => {
    if (!state) return false; // server render / pre-hydration
    if (override === "hidden") return false;
    if (override === "force") return true;

    const isAndroidVisitor =
      override === "simulate-android" || platform === "android";
    if (!isAndroidVisitor || !appPromptEnabled()) return false;

    if (state.downloadedAt) return false;
    if (state.dismissedAt && Date.now() - state.dismissedAt < appPromptRetriggerMs())
      return false;
    return true;
  }, [state, override, platform]);

  return {
    show,
    platform,
    override,
    state,
    dismiss: appPromptStore.dismiss,
    markDownloaded: appPromptStore.markDownloaded,
    resetForQa: appPromptStore.reset,
  };
}
