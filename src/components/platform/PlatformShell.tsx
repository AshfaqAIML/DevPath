"use client";

// PlatformShell — the client root of the single-page resources experience.
// View routing is URL-driven via query params:
//   /                → landing + category hub
//   /?category=slug  → the category's real application section
//   /?view=admin     → the admin console
import * as React from "react";

import { GlobalSearch } from "./GlobalSearch";
import { HomeView } from "./HomeView";
import { CategoryExplorer } from "./CategoryExplorer";
import { AdminPanel } from "./AdminPanel";
import { MyLibraryView } from "./MyLibraryView";
import { SiteHeader } from "./SiteHeader";
import { SiteFooter } from "./SiteFooter";
import { trackEvent, useCategories, type CategoriesPayload } from "./platform-data";
import type { ResourceItemView } from "@/lib/platform";

interface PlatformShellProps {
  initialCategories: CategoriesPayload;
  initialItems: ResourceItemView[];
  initialCategorySlug: string | null;
  initialItemSlug?: string;
  view: "hub" | "admin" | "library";
  featuredItems: ResourceItemView[];
  trendingItems: ResourceItemView[];
}

export function PlatformShell({
  initialCategories,
  initialItems,
  initialCategorySlug,
  initialItemSlug,
  view,
  featuredItems,
  trendingItems,
}: PlatformShellProps) {
  const { data: categoriesData } = useCategories(initialCategories);
  const [searchOpen, setSearchOpen] = React.useState(false);

  // First-party analytics: log every category view
  React.useEffect(() => {
    if (initialCategorySlug) {
      trackEvent("category_view", initialCategorySlug, null);
    }
  }, [initialCategorySlug]);

  const activeCategory = initialCategorySlug
    ? categoriesData.categories.find((c) => c.slug === initialCategorySlug) ?? null
    : null;

  return (
    <div className="flex min-h-screen flex-col bg-background text-foreground">
      <SiteHeader
        data={categoriesData}
        onOpenSearch={() => setSearchOpen(true)}
        activeCategory={initialCategorySlug}
      />

      <main className="flex-1" id="main-content">
        <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 sm:py-10">
          {view === "admin" ? (
            <AdminPanel categoriesData={categoriesData} />
          ) : view === "library" ? (
            <MyLibraryView categoriesData={categoriesData} />
          ) : activeCategory ? (
            <CategoryExplorer
              key={activeCategory.slug}
              category={activeCategory}
              initialItems={initialItems}
              initialItemSlug={initialItemSlug}
              categoriesData={categoriesData}
            />
          ) : (
            <HomeView
              categoriesData={categoriesData}
              featuredItems={featuredItems}
              trendingItems={trendingItems}
              onOpenSearch={() => setSearchOpen(true)}
            />
          )}
        </div>
      </main>

      <SiteFooter data={categoriesData} />

      <GlobalSearch
        open={searchOpen}
        onOpenChange={setSearchOpen}
        categoriesData={categoriesData}
      />
    </div>
  );
}
