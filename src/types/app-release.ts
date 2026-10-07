/**
 * Installable-app release types (ported from NETprep's APK module,
 * generalized: the artifact may be an APK, PWA bundle, or installer).
 * Additive only — mirrors the release-distribution contract used for
 * installable app surfaces (release metadata + availability flag).
 */

export interface AppRelease {
  version: string;
  downloadUrl: string;
  releaseDate: string;
  sizeLabel: string;
  minOsVersion?: string;
  changelog?: string[];
}

export interface AppReleaseStatus {
  release: AppRelease;
  /** Whether the artifact is actually reachable right now. */
  available: boolean;
  reason?: string;
}
