import type { Metadata } from "next";

import { getCategoriesWithCounts, getItems } from "@/lib/platform";
import { PlatformShell } from "@/components/platform/PlatformShell";

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
  const view =
    sp.view === "admin" ? "admin" : sp.view === "library" ? "library" : "hub";
  const itemSlug = typeof sp.item === "string" ? sp.item : undefined;

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
        initialItems={items}
        initialCategorySlug={activeCategory?.slug ?? null}
        initialItemSlug={itemSlug}
        view={view}
        featuredItems={featuredItems}
        trendingItems={trendingItems}
      />
    </>
  );
}
