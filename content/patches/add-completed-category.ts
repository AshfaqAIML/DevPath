// Idempotent live-DB patch: ensure the virtual "completed" category exists.
// Run with: bun content/patches/add-completed-category.ts
// Safe to re-run (upsert by slug). Never touches items — the category owns
// none; hub count + explorer listing derive from published lesson content.
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const category = await prisma.category.upsert({
    where: { slug: "completed" },
    create: {
      slug: "completed",
      title: "Completed",
      tagline: "Fully written courses, start to finish",
      description:
        "Courses with complete original content: full lessons, exercises with hints and solutions, quizzes, final assessments and capstone projects. Open any of them and learn the subject end to end — no placeholders.",
      countLabel: "complete courses",
      icon: "/icons/completed/icon.jpg",
      route: "/completed",
      badge: "New",
      badgeVariant: "default",
      accent: "emerald",
      order: 6,
      enabled: true,
      seoTitle: "Completed Courses — DevPath",
      seoDescription:
        "Fully written DevPath courses with complete lessons, exercises, quizzes and projects.".slice(
          0,
          155
        ),
    },
    update: {
      title: "Completed",
      tagline: "Fully written courses, start to finish",
      countLabel: "complete courses",
      icon: "/icons/completed/icon.jpg",
      route: "/completed",
      badge: "New",
      accent: "emerald",
      order: 6,
      enabled: true,
    },
  });

  const completed = await prisma.lesson.groupBy({
    by: ["courseSlug"],
    where: { published: true, course: { contentStatus: "published" } },
    _count: { _all: true },
  });

  console.log(
    `✓ category '${category.slug}' (order ${category.order}); ` +
      `${completed.length} complete courses: ` +
      completed.map((c) => `${c.courseSlug} (${c._count._all})`).join(", ")
  );
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
