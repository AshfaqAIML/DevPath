// Client-side analytics contracts for the dashboard/admin charts.
// Server aggregation lives in src/lib/platform.ts (getAnalyticsDashboard);
// this module holds shared types, react-query keys, fetchers and formatters
// so every chart consumes the same shape.

export type DashboardRange = "7d" | "30d" | "90d";

export const DASHBOARD_RANGES: { value: DashboardRange; label: string }[] = [
  { value: "7d", label: "7d" },
  { value: "30d", label: "30d" },
  { value: "90d", label: "90d" },
];

export interface Kpi {
  key: string;
  label: string;
  value: number;
  /** Percent change vs the previous equal-length period; null when N/A */
  delta: number | null;
  spark: number[];
}

export interface EngagementPoint {
  date: string;
  learning: number;
  assessment: number;
  simulators: number;
  discovery: number;
}

export interface FunnelStage {
  stage: string;
  count: number;
}

export interface DashboardPayload {
  range: DashboardRange;
  kpis: Kpi[];
  engagement: EngagementPoint[];
  topCourses: { slug: string; title: string; views: number }[];
  topSimulators: { slug: string; views: number; completes: number }[];
  funnel: FunnelStage[];
}

export const analyticsKeys = {
  dashboard: (range: DashboardRange) => ["analytics", "dashboard", range] as const,
  summary: ["analytics", "summary"] as const,
};

export async function fetchAnalyticsDashboard(
  range: DashboardRange
): Promise<DashboardPayload> {
  const res = await fetch(
    `/api/analytics?view=dashboard&range=${encodeURIComponent(range)}`
  );
  if (!res.ok) throw new Error("Failed to load analytics dashboard");
  return (await res.json()) as DashboardPayload;
}

/** 1.2K / 3.4M style compact numbers for KPI counters */
export function formatCompact(n: number): string {
  const abs = Math.abs(n);
  if (abs >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (abs >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return Math.round(n).toString();
}

/** Short MM-DD label for chart axes */
export function formatAxisDate(isoDate: string): string {
  return isoDate.slice(5).replace("-", "/");
}
