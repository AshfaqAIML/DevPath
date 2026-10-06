// Shared platform data layer — server-side access to categories & items.
// The whole category hub is DB-driven: counts, wording, badges, order,
// icons and enable-state all come from the Category table.
import { createHmac, timingSafeEqual } from "crypto";
import { db } from "@/lib/db";
import type { Category, ResourceItem } from "@prisma/client";

export type CategoryView = {
  id: string;
  slug: string;
  title: string;
  tagline: string;
  description: string;
  countLabel: string;
  icon: string;
  route: string;
  badge: string | null;
  badgeVariant: string;
  accent: string;
  order: number;
  enabled: boolean;
  seoTitle: string | null;
  seoDescription: string | null;
  /** Number of PUBLISHED items — the value surfaced in the hub. */
  count: number;
  /** Total items including drafts (used by the admin console). */
  totalItems: number;
};

export type StepView = {
  title: string;
  detail: string;
  hours?: number;
};

export type ResourceItemView = {
  id: string;
  slug: string;
  title: string;
  description: string;
  level: string;
  duration: string | null;
  tags: string[];
  /** Structured roadmap milestones (empty for non-roadmap content) */
  steps: StepView[];
  published: boolean;
  featured: boolean;
  views: number;
  categorySlug: string;
  categoryTitle: string;
  categoryIcon: string;
  categoryAccent: string;
};

const toCategoryView = (
  c: Category,
  count: number,
  totalItems: number
): CategoryView => ({
  id: c.id,
  slug: c.slug,
  title: c.title,
  tagline: c.tagline,
  description: c.description,
  countLabel: c.countLabel,
  icon: c.icon,
  route: c.route,
  badge: c.badge,
  badgeVariant: c.badgeVariant,
  accent: c.accent,
  order: c.order,
  enabled: c.enabled,
  seoTitle: c.seoTitle,
  seoDescription: c.seoDescription,
  count,
  totalItems,
});

export async function getCategoriesWithCounts(): Promise<CategoryView[]> {
  const categories = await db.category.findMany({
    orderBy: { order: "asc" },
    include: {
      _count: { select: { items: true } },
    },
  });
  const publishedCounts = await db.resourceItem.groupBy({
    by: ["categoryId"],
    where: { published: true },
    _count: { _all: true },
  });
  const publishedMap = new Map(
    publishedCounts.map((p) => [p.categoryId, p._count._all])
  );
  return categories.map((c) =>
    toCategoryView(
      c,
      publishedMap.get(c.id) ?? 0,
      (c as Category & { _count?: { items: number } })._count?.items ?? 0
    )
  );
}

function parseSteps(raw: string): StepView[] {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw) as StepView[];
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter((s) => s && typeof s.title === "string")
      .map((s) => ({
        title: s.title,
        detail: typeof s.detail === "string" ? s.detail : "",
        hours: typeof s.hours === "number" ? s.hours : undefined,
      }));
  } catch {
    return [];
  }
}

export const toResourceItemView = (i: ResourceItem, c: Category): ResourceItemView => ({
  id: i.id,
  slug: i.slug,
  title: i.title,
  description: i.description,
  level: i.level,
  duration: i.duration,
  tags: i.tags ? i.tags.split(",").map((t) => t.trim()).filter(Boolean) : [],
  steps: parseSteps(i.steps),
  published: i.published,
  featured: i.featured,
  views: i.views,
  categorySlug: c.slug,
  categoryTitle: c.title,
  categoryIcon: c.icon,
  categoryAccent: c.accent,
});

export async function getItems(opts: {
  category?: string;
  q?: string;
  level?: string;
  sort?: string;
  includeDrafts?: boolean;
  limit?: number;
}): Promise<ResourceItemView[]> {
  const where: Record<string, unknown> = {};
  if (opts.category) {
    where.category = { slug: opts.category };
  }
  if (!opts.includeDrafts) {
    where.published = true;
  }
  if (opts.level && opts.level !== "All") {
    where.level = opts.level;
  }
  if (opts.featured) {
    where.featured = true;
  }
  if (opts.q) {
    const q = opts.q.toLowerCase();
    // SQLite LIKE is case-insensitive for ASCII by default
    where.OR = [
      { title: { contains: opts.q } },
      { description: { contains: opts.q } },
      { tags: { contains: opts.q } },
    ];
    void q;
  }
  const orderBy: Record<string, string> =
    opts.sort === "popular"
      ? { views: "desc" }
      : opts.sort === "newest"
        ? { createdAt: "desc" }
        : opts.sort === "az"
          ? { title: "asc" }
          : { featured: "desc" };

  const items = await db.resourceItem.findMany({
    where,
    orderBy,
    include: { category: true },
    take: opts.limit ?? 200,
  });
  return items.map((i) => toResourceItemView(i, i.category));
}

export async function logAnalyticsEvent(
  type: string,
  slug?: string | null,
  label?: string | null
) {
  try {
    await db.analyticsEvent.create({
      data: { type, slug: slug ?? null, label: label ?? null },
    });
  } catch {
    // analytics must never break the request path
  }
}

// ---------------------------------------------------------------------------
// Lightweight in-memory rate limiter (sliding window) for public endpoints.
// Local-memory only, per the platform's caching policy.
const rateBuckets = new Map<string, number[]>();

export function checkRateLimit(
  key: string,
  limit = 60,
  windowMs = 60_000
): boolean {
  const now = Date.now();
  const hits = (rateBuckets.get(key) ?? []).filter((t) => now - t < windowMs);
  hits.push(now);
  rateBuckets.set(key, hits);
  // opportunistic cleanup so the map can't grow unbounded
  if (rateBuckets.size > 500) {
    for (const [k, v] of rateBuckets) {
      if (v.every((t) => now - t >= windowMs)) rateBuckets.delete(k);
    }
  }
  return hits.length <= limit;
}

export async function getAnalyticsSummary() {
  const byCategory = await db.analyticsEvent.groupBy({
    by: ["slug"],
    where: { type: "category_view" },
    _count: { _all: true },
  });
  const byType = await db.analyticsEvent.groupBy({
    by: ["type"],
    _count: { _all: true },
  });
  const recent = await db.analyticsEvent.findMany({
    orderBy: { createdAt: "desc" },
    take: 20,
  });
  const totalEvents = await db.analyticsEvent.count();

  // 7-day activity: bucket events per calendar day (JS-side; demo scale)
  const since = new Date();
  since.setHours(0, 0, 0, 0);
  since.setDate(since.getDate() - 6);
  const weekEvents = await db.analyticsEvent.findMany({
    where: { createdAt: { gte: since } },
    select: { createdAt: true },
  });
  const dayKeys: string[] = [];
  const dayMap = new Map<string, number>();
  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    d.setDate(d.getDate() - i);
    const key = d.toISOString().slice(0, 10);
    dayKeys.push(key);
    dayMap.set(key, 0);
  }
  for (const e of weekEvents) {
    const key = new Date(e.createdAt).toISOString().slice(0, 10);
    if (dayMap.has(key)) dayMap.set(key, (dayMap.get(key) ?? 0) + 1);
  }

  // Simulator engagement: views + mission/challenge completions per sim slug
  const [simViews, simCompletes] = await Promise.all([
    db.analyticsEvent.groupBy({
      by: ["slug"],
      where: { type: "simulator_view" },
      _count: { _all: true },
    }),
    db.analyticsEvent.groupBy({
      by: ["slug"],
      where: { type: "challenge_complete" },
      _count: { _all: true },
    }),
  ]);

  return {
    categoryViews: byCategory.map((b) => ({ slug: b.slug, views: b._count._all })),
    typeCounts: byType.map((b) => ({ type: b.type, count: b._count._all })),
    recent,
    totalEvents,
    daily: dayKeys.map((date) => ({ date, count: dayMap.get(date) ?? 0 })),
    simulators: [...new Set([...simViews.map((s) => s.slug), ...simCompletes.map((s) => s.slug)])]
      .filter((s): s is string => !!s)
      .map((slug) => ({
        slug,
        views: simViews.find((s) => s.slug === slug)?._count._all ?? 0,
        completes: simCompletes.find((s) => s.slug === slug)?._count._all ?? 0,
      })),
  };
}

export const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || "devpath-admin";

// ---------------------------------------------------------------------------
// Admin session handling.
// Two auth paths are accepted by every admin endpoint:
//   1. `x-admin-key: <password>` header — programmatic/API access (curl, QA).
//   2. `devpath_admin` cookie — the browser session issued by POST
//      /api/admin/auth. The cookie is httpOnly (invisible to JS), signed
//      with an HMAC of the admin password and carries an expiry, so the raw
//      credential is never persisted client-side.
export const ADMIN_COOKIE = "devpath_admin";
const ADMIN_SESSION_TTL_MS = 8 * 60 * 60 * 1000; // 8 hours

function hmac(value: string): string {
  return createHmac("sha256", ADMIN_PASSWORD).update(value).digest("hex");
}

/** Mint a signed, expiring session token for the auth cookie. */
export function createAdminSessionToken(): { token: string; maxAge: number } {
  const exp = Date.now() + ADMIN_SESSION_TTL_MS;
  return { token: `${exp}.${hmac(String(exp))}`, maxAge: ADMIN_SESSION_TTL_MS / 1000 };
}

/** Verify a session token minted by createAdminSessionToken. */
export function verifyAdminSessionToken(token: string | undefined | null): boolean {
  if (!token) return false;
  const [expRaw, sig] = token.split(".");
  if (!expRaw || !sig) return false;
  const exp = Number(expRaw);
  if (!Number.isFinite(exp) || exp < Date.now()) return false;
  const expected = hmac(expRaw);
  if (expected.length !== sig.length) return false;
  try {
    return timingSafeEqual(Buffer.from(expected), Buffer.from(sig));
  } catch {
    return false;
  }
}

export function isAdminRequest(req: Request): boolean {
  const key = req.headers.get("x-admin-key");
  if (key && key === ADMIN_PASSWORD) return true;
  const cookieHeader = req.headers.get("cookie") ?? "";
  const match = cookieHeader
    .split(";")
    .map((c) => c.trim())
    .find((c) => c.startsWith(`${ADMIN_COOKIE}=`));
  return verifyAdminSessionToken(match ? decodeURIComponent(match.slice(ADMIN_COOKIE.length + 1)) : null);
}
