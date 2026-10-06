"use client";

// Shared client-side data hooks + analytics helper for the platform.
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";
import type { CategoryView, ResourceItemView } from "@/lib/platform";

export type CategoriesPayload = { categories: CategoryView[] };
export type ItemsPayload = { items: ResourceItemView[] };

export async function fetchCategories(): Promise<CategoriesPayload> {
  const res = await fetch("/api/categories");
  if (!res.ok) throw new Error("Failed to load categories");
  return res.json();
}

export async function fetchItems(params: {
  category?: string;
  q?: string;
  level?: string;
  sort?: string;
  all?: boolean;
  adminKey?: string;
}): Promise<ItemsPayload> {
  const sp = new URLSearchParams();
  if (params.category) sp.set("category", params.category);
  if (params.q) sp.set("q", params.q);
  if (params.level && params.level !== "All") sp.set("level", params.level);
  if (params.sort) sp.set("sort", params.sort);
  if (params.all) sp.set("all", "1");
  const headers: Record<string, string> = {};
  if (params.adminKey) headers["x-admin-key"] = params.adminKey;
  const res = await fetch(`/api/resources?${sp.toString()}`, { headers });
  if (!res.ok) throw new Error("Failed to load resources");
  return res.json();
}

/** Live category config + counts (SSR-seeded, kept fresh after admin edits). */
export function useCategories(initialData: CategoriesPayload) {
  const queryClient = useQueryClient();
  const query = useQuery({
    queryKey: ["categories"],
    queryFn: fetchCategories,
    initialData,
  });
  // Keep the SSR-fetched payload in sync on every server navigation
  useEffect(() => {
    if (initialData) {
      queryClient.setQueryData(["categories"], initialData);
    }
  }, [initialData, queryClient]);
  return query;
}

/** Fire-and-forget first-party analytics. */
export function trackEvent(
  type:
    | "category_view"
    | "card_click"
    | "item_view"
    | "search"
    | "simulator_view"
    | "challenge_complete"
    | "lesson_view"
    | "lesson_complete"
    | "quiz_attempt"
    | "assessment_pass"
    | "sandbox_deep_link",
  slug?: string | null,
  label?: string | null
) {
  try {
    fetch("/api/analytics", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type, slug, label }),
    }).catch(() => {});
  } catch {
    // never block the UI on analytics
  }
}

export function categoryHref(slug: string) {
  return `/?category=${slug}`;
}
