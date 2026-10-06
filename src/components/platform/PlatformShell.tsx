"use client";

// PlatformShell — the client root of the single-page resources experience.
// View routing is URL-driven via query params:
//   /                       → landing + category hub
//   /?category=slug         → the category's real application section
//   /?view=simulator&sim=x → a playable simulator sandbox
//   /?view=library          → personal library
//   /?view=admin            → the admin console
import * as React from "react";
import { useRouter } from "next/navigation";
import { useTheme } from "next-themes";

import { GlobalSearch } from "./GlobalSearch";
import { HomeView } from "./HomeView";
import { CategoryExplorer } from "./CategoryExplorer";
import { AdminPanel } from "./AdminPanel";
import { MyLibraryView } from "./MyLibraryView";
import { FlexboxSimulator } from "./FlexboxSimulator";
import { HttpLab } from "./HttpLab";
import { SqlLab } from "./SqlLab";
import { JsPlayground } from "./JsPlayground";
import { GitPlayground } from "./GitPlayground";
import { CourseView } from "./CourseView";
import { ShortcutsHelpDialog } from "./ShortcutsHelpDialog";
import { SiteHeader } from "./SiteHeader";
import { SiteFooter } from "./SiteFooter";
import { categoryHref, trackEvent, useCategories, type CategoriesPayload } from "./platform-data";
import { PLAYABLE_SIMULATORS } from "@/lib/simulators";
import type { CategoryView, ResourceItemView } from "@/lib/platform";
import type { CourseView as CourseViewType } from "@/lib/course-types";

interface PlatformShellProps {
  initialCategories: CategoriesPayload;
  initialItems: ResourceItemView[];
  initialCategorySlug: string | null;
  initialItemSlug?: string;
  view: "hub" | "admin" | "library" | "simulator" | "course";
  featuredItems: ResourceItemView[];
  trendingItems: ResourceItemView[];
  simulatorItem?: ResourceItemView | null;
  simulatorCategory?: CategoryView | null;
  courseData?: CourseViewType | null;
  courseItem?: ResourceItemView | null;
  courseCategory?: CategoryView | null;
  courseLessonParam?: string | null;
}

export function PlatformShell({
  initialCategories,
  initialItems,
  initialCategorySlug,
  initialItemSlug,
  view,
  featuredItems,
  trendingItems,
  simulatorItem,
  simulatorCategory,
  courseData,
  courseItem,
  courseCategory,
  courseLessonParam,
}: PlatformShellProps) {
  const router = useRouter();
  const { setTheme, theme } = useTheme();
  const { data: categoriesData } = useCategories(initialCategories);
  const [searchOpen, setSearchOpen] = React.useState(false);
  const [helpOpen, setHelpOpen] = React.useState(false);

  // First-party analytics: log every category view
  React.useEffect(() => {
    if (initialCategorySlug) {
      trackEvent("category_view", initialCategorySlug, null);
    }
  }, [initialCategorySlug]);

  // Global keyboard shortcuts:
  //   ⌘K / Ctrl+K → search   ? → help   1–5 → category   l → library
  //   h → home   t → theme toggle. Skips while typing or when a dialog is open.
  React.useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      const typing =
        target &&
        (target.tagName === "INPUT" ||
          target.tagName === "TEXTAREA" ||
          target.tagName === "SELECT" ||
          target.isContentEditable);
      const overlayOpen =
        searchOpen || helpOpen || document.querySelector("[role=dialog]") !== null;

      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setSearchOpen(true);
        return;
      }
      if (typing || overlayOpen) return;

      if (e.key === "?" || (e.shiftKey && e.key === "/")) {
        e.preventDefault();
        setHelpOpen(true);
        return;
      }
      if (e.key.toLowerCase() === "t") {
        setTheme(theme === "dark" ? "light" : "dark");
        return;
      }
      if (e.key.toLowerCase() === "l") {
        router.push("/?view=library");
        return;
      }
      if (e.key.toLowerCase() === "h") {
        router.push("/");
        return;
      }
      // 1–5 jump straight into the enabled categories (IA order)
      const n = Number(e.key);
      if (n >= 1 && n <= 5) {
        const enabled = categoriesData.categories.filter((c) => c.enabled);
        const cat = enabled[n - 1];
        if (cat) {
          trackEvent("card_click", cat.slug, `keyboard-${n}`);
          router.push(categoryHref(cat.slug));
        }
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [categoriesData, helpOpen, router, searchOpen, setTheme, theme]);

  // Course view: the lesson route is driven by URL search params inside
  // CourseView, so shallow navigation between lessons/assessment works.
  React.useEffect(() => {
    if (view === "course" && courseItem) {
      trackEvent("category_view", "courses", null);
    }
     
  }, [view, courseItem?.slug]);

  const activeCategory = initialCategorySlug
    ? categoriesData.categories.find((c) => c.slug === initialCategorySlug) ?? null
    : null;

  return (
    <div className="flex min-h-screen flex-col bg-background text-foreground">
      <SiteHeader
        data={categoriesData}
        onOpenSearch={() => setSearchOpen(true)}
        activeCategory={initialCategorySlug}
        onOpenShortcuts={() => setHelpOpen(true)}
      />

      <main className="flex-1" id="main-content">
        <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 sm:py-10">
          {view === "admin" ? (
            <AdminPanel categoriesData={categoriesData} />
          ) : view === "library" ? (
            <MyLibraryView categoriesData={categoriesData} />
          ) : view === "course" && courseData && courseItem && courseCategory ? (
            <CourseView
              key={courseData.courseSlug}
              course={courseData}
              item={courseItem}
              category={courseCategory}
              initialLesson={courseLessonParam ?? null}
            />
          ) : view === "simulator" && simulatorItem && simulatorCategory ? (
            PLAYABLE_SIMULATORS[simulatorItem.slug] === "http" ? (
              <HttpLab item={simulatorItem} category={simulatorCategory} />
            ) : PLAYABLE_SIMULATORS[simulatorItem.slug] === "sql" ? (
              <SqlLab item={simulatorItem} category={simulatorCategory} />
            ) : PLAYABLE_SIMULATORS[simulatorItem.slug] === "js" ? (
              <JsPlayground item={simulatorItem} category={simulatorCategory} />
            ) : PLAYABLE_SIMULATORS[simulatorItem.slug] === "git" ? (
              <GitPlayground item={simulatorItem} category={simulatorCategory} />
            ) : (
              <FlexboxSimulator item={simulatorItem} category={simulatorCategory} />
            )
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
      <ShortcutsHelpDialog open={helpOpen} onOpenChange={setHelpOpen} categoriesData={categoriesData} />
    </div>
  );
}
