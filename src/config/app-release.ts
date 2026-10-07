/**
 * App release configuration — server side.
 *
 * Release metadata is env-driven so the artifact can later be hosted anywhere
 * (local /public/downloads, CDN, GitHub Releases, cloud storage) without code
 * changes. Secrets never live here and nothing here is exposed to the client —
 * the client consumes this via GET /api/releases/latest.
 *
 * Env: APP_VERSION, APP_DOWNLOAD_URL, APP_RELEASE_DATE, APP_SIZE_LABEL,
 *      APP_MIN_OS_VERSION, APP_CHANGELOG (entries separated by "|").
 */
import type { AppRelease } from "@/types/app-release";

export const appReleaseConfig = {
  get version() {
    return process.env.APP_VERSION ?? "1.0.0";
  },
  get downloadUrl() {
    return process.env.APP_DOWNLOAD_URL ?? "/downloads/devpath.apk";
  },
  get releaseDate() {
    return process.env.APP_RELEASE_DATE ?? "";
  },
  get sizeLabel() {
    return process.env.APP_SIZE_LABEL ?? "";
  },
  get minOsVersion() {
    return process.env.APP_MIN_OS_VERSION ?? "8.0";
  },
  get changelog(): string[] {
    const raw = process.env.APP_CHANGELOG ?? "";
    return raw
      .split("|")
      .map((s) => s.trim())
      .filter(Boolean);
  },
} as const;

export function getAppRelease(): AppRelease {
  return {
    version: appReleaseConfig.version,
    downloadUrl: appReleaseConfig.downloadUrl,
    releaseDate: appReleaseConfig.releaseDate,
    sizeLabel: appReleaseConfig.sizeLabel,
    minOsVersion: appReleaseConfig.minOsVersion,
    changelog: appReleaseConfig.changelog,
  };
}

/**
 * Check whether the app artifact is actually reachable.
 * - Local path (starts with "/"): check the file exists in public/.
 * - Remote URL: HEAD request with a short timeout.
 * Never throws — unavailability is a normal, handled state (the UI then
 * offers the PWA Add-to-Home-Screen path instead of a download).
 */
export async function isAppAvailable(): Promise<{
  available: boolean;
  reason?: string;
}> {
  const url = appReleaseConfig.downloadUrl;

  try {
    if (url.startsWith("/")) {
      const fs = await import("fs");
      const path = await import("path");
      const filePath = path.join(process.cwd(), "public", url);
      if (!fs.existsSync(filePath)) {
        return {
          available: false,
          reason:
            "Release artifact has not been published yet (app build pending).",
        };
      }
      return { available: true };
    }

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 5000);
    const res = await fetch(url, { method: "HEAD", signal: controller.signal });
    clearTimeout(timer);
    if (!res.ok) {
      return { available: false, reason: `Release host responded ${res.status}.` };
    }
    return { available: true };
  } catch {
    return { available: false, reason: "Release host is unreachable." };
  }
}
