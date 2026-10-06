import type { Metadata } from "next";

import { getCategoriesWithCounts, getItems } from "@/lib/platform";
import { getCourse } from "@/lib/courses";
import { PlatformShell } from "@/components/platform/PlatformShell";
import { PLAYABLE_SIMULATORS, isPlayableSimulator } from "@/lib/simulators";

export const dynamic = "force-dynamic";

type SP = Promise<{ [key: string]: string | string[] | undefined }>;

const SITE_TITLE = "DevPath — Masterclass, Roadmaps, Courses, Resources & Simulators";
const SITE_DESCRIPTION =
  "A learning platform for developers: deep masterclasses, career roadmaps, focused mini courses, practical guides and interactive simulators — five content types, one cohesive system.";

// SEO: metadata adapts to the selected category (its config lives in the DB)
export async function generateMetadata({
  searchParams,
}: {
  searchParams: SP;
}): Promise<Metadata> {
  const sp = await searchParams;
  const categorySlug = typeof sp.category === "string" ? sp.category : null;

  if (sp.view === "library") {
    return {
      title: "My library — DevPath",
      description:
        "Your saved items, recently viewed resources and completed learning — your personal DevPath library.",
      robots: { index: false, follow: true },
    };
  }

  if (sp.view === "admin") {
    return {
      title: "Admin console — DevPath",
      robots: { index: false, follow: false },
    };
  }

  // Course learning view: SEO metadata derived from the course record
  if (sp.course && typeof sp.course === "string") {
    const [courseData, items] = await Promise.all([
      getCourse(sp.course),
      getItems({ category: "courses", limit: 200 }),
    ]);
    const item = items.find((i) => i.slug === sp.course);
    if (courseData && item) {
      const title = `${item.title} — ${courseData.lessonCount} lessons — DevPath`;
      const description = courseData.subtitle || item.description;
      const lessonParam = typeof sp.lesson === "string" ? sp.lesson : null;
      const lesson = lessonParam && lessonParam !== "assessment" && courseData.lessons.find((l) => l.order === Number(lessonParam))
        ? courseData.lessons.find((l) => l.order === Number(lessonParam))
        : null;
      return {
        title: lesson ? `${lesson.title} · ${item.title} — DevPath` : title,
        description: lesson?.objective || description,
        keywords: [...courseData.technologies, ...courseData.skills].slice(0, 10),
        robots: { index: false, follow: true },
        openGraph: {
          title,
          description,
          type: "article",
          siteName: "DevPath",
        },
      };
    }
  }

  if (sp.view === "simulator" && typeof sp.sim === "string" && isPlayableSimulator(sp.sim)) {
    const [categories, items] = await Promise.all([
      getCategoriesWithCounts(),
      getItems({ category: "simulators" }),
    ]);
    const item = items.find((i) => i.slug === sp.sim);
    if (item) {
      return {
        title: `${item.title} — DevPath`,
        description: item.description,
        robots: { index: false, follow: true },
      };
    }
  }

  if (categorySlug) {
    const categories = await getCategoriesWithCounts();
    const cat = categories.find((c) => c.slug === categorySlug && c.enabled);
    if (cat) {
      const title = cat.seoTitle ?? `${cat.title} — DevPath`;
      const description =
        cat.seoDescription ??
        `${cat.count} ${cat.countLabel} — ${cat.tagline}. ${cat.description}`.slice(0, 160);
      return {
        title,
        description,
        alternates: { canonical: cat.route },
        openGraph: {
          title,
          description,
          type: "website",
          siteName: "DevPath",
        },
      };
    }
  }

  return {
    title: SITE_TITLE,
    description: SITE_DESCRIPTION,
    keywords: [
      "developer learning",
      "masterclass",
      "roadmaps",
      "courses",
      "resources",
      "simulators",
      "career paths",
    ],
    openGraph: {
      title: SITE_TITLE,
      description: SITE_DESCRIPTION,
      type: "website",
      siteName: "DevPath",
    },
  };
}

export default async function Page({ searchParams }: { searchParams: SP }) {
  const sp = await searchParams;
  const categorySlug =
    typeof sp.category === "string" && sp.category.length > 0 ? sp.category : null;
  const simSlug = typeof sp.sim === "string" ? sp.sim : null;
  const courseSlug = typeof sp.course === "string" && sp.course.length > 0 ? sp.course : null;
  const view =
    sp.view === "admin"
      ? "admin"
      : sp.view === "library"
        ? "library"
        : sp.view === "simulator" && simSlug && isPlayableSimulator(simSlug)
          ? "simulator"
          : courseSlug
            ? "course"
            : "hub";
  const itemSlug = typeof sp.item === "string" ? sp.item : undefined;
  const lessonParam = typeof sp.lesson === "string" ? sp.lesson : null;

  const categories = await getCategoriesWithCounts();
  const activeCategory = categorySlug
    ? categories.find((c) => c.slug === categorySlug) ?? null
    : null;

  // SSR data for the selected category (or the landing experience)
  const items = activeCategory
    ? await getItems({ category: activeCategory.slug })
    : [];
  const featuredItems = view === "hub" && !activeCategory
    ? await getItems({ featured: true, limit: 6 })
    : [];
  // Trending = most viewed published items across all categories
  const trendingItems = view === "hub" && !activeCategory
    ? await getItems({ sort: "popular", limit: 6 })
    : [];

  // Simulator view: resolve the requested sandbox (only playable sims render it)
  const simulatorItem =
    view === "simulator" && simSlug && PLAYABLE_SIMULATORS[simSlug]
      ? (await getItems({ category: "simulators", limit: 100 })).find((i) => i.slug === simSlug) ?? null
      : null;
  const simulatorCategory = simulatorItem
    ? categories.find((c) => c.slug === "simulators") ?? null
    : null;

  // Course view: resolve the course record + catalog item + category.
  // Unknown course / no published lesson content falls back to the catalog.
  const courseData = view === "course" && courseSlug ? await getCourse(courseSlug) : null;
  const courseItem =
    view === "course" && courseSlug && courseData
      ? (await getItems({ category: "courses", limit: 200 })).find((i) => i.slug === courseSlug) ?? null
      : null;
  const courseCategory = courseItem
    ? categories.find((c) => c.slug === courseItem.categorySlug) ?? null
    : null;

  // If the course isn't resolvable, fall back to the courses category view
  const effectiveView =
    view === "simulator" && !simulatorItem
      ? "hub"
      : view === "course" && (!courseData || !courseItem || !courseCategory)
        ? "category"
        : view;

  // Fallback category needs its items (course view didn't fetch any)
  let explorerItems = items;
  if (effectiveView === "category" && items.length === 0) {
    explorerItems = await getItems({ category: "courses" });
  }

  // JSON-LD: the five-category information architecture as structured data
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: "DevPath",
    description: SITE_DESCRIPTION,
    hasPart: categories
      .filter((c) => c.enabled)
      .map((c) => ({
        "@type": "ItemList",
        name: c.title,
        description: c.tagline,
        numberOfItems: c.count,
        url: `https://devpath.local${c.route}`,
      })),
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <PlatformShell
        initialCategories={{ categories }}
        initialItems={explorerItems}
        initialCategorySlug={
          effectiveView === "category"
            ? "courses"
            : activeCategory?.slug ?? null
        }
        initialItemSlug={itemSlug}
        view={
          effectiveView === "category"
            ? "hub"
            : effectiveView === "course"
              ? "course"
              : effectiveView
        }
        featuredItems={featuredItems}
        trendingItems={trendingItems}
        simulatorItem={simulatorItem}
        simulatorCategory={simulatorCategory}
        courseData={courseData}
        courseItem={courseItem}
        courseCategory={courseCategory}
        courseLessonParam={lessonParam}
      />
    </>
  );
}
