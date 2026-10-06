// Content seed loader — upserts courses from content/courses/<slug>/ into the DB.
// Run with: bun content/seed-courses.ts
//
// Idempotent: courses and lessons are upserted by slug/order, existing
// ResourceItem rows (catalog entries, views, analytics) are never touched.
// The JSON files are the versioned source of truth for INITIAL content;
// once loaded, admins can edit live records through the console, and this
// script only re-syncs on demand.
import { readdir, readFile } from "fs/promises";
import { join } from "path";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
const CONTENT_ROOT = join(process.cwd(), "content", "courses");

async function seedCourse(dir: string) {
  const coursePath = join(dir, "course.json");
  const raw = await readFile(coursePath, "utf8");
  const course = JSON.parse(raw) as {
    courseSlug: string;
    subtitle?: string;
    audience?: string;
    outcomes?: string[];
    prereqSlugs?: string[];
    technologies?: string[];
    skills?: string[];
    assessment?: unknown[];
    passScore?: number;
    project?: unknown | null;
    interviewQs?: { q: string; a: string }[];
    version?: string;
    contentStatus?: string;
  };

  // The course must reference a real catalog item
  const item = await prisma.resourceItem.findUnique({
    where: { slug: course.courseSlug },
  });
  if (!item) {
    console.warn(`⚠ no ResourceItem for ${course.courseSlug} — skipping`);
    return;
  }

  await prisma.course.upsert({
    where: { courseSlug: course.courseSlug },
    create: {
      courseSlug: course.courseSlug,
      subtitle: course.subtitle ?? "",
      audience: course.audience ?? "",
      outcomes: JSON.stringify(course.outcomes ?? []),
      prereqSlugs: JSON.stringify(course.prereqSlugs ?? []),
      technologies: JSON.stringify(course.technologies ?? []),
      skills: JSON.stringify(course.skills ?? []),
      assessment: JSON.stringify(course.assessment ?? []),
      passScore: course.passScore ?? 70,
      project: course.project ? JSON.stringify(course.project) : null,
      interviewQs: JSON.stringify(course.interviewQs ?? []),
      version: course.version ?? "1.0.0",
      contentStatus: course.contentStatus ?? "published",
    },
    update: {
      subtitle: course.subtitle ?? "",
      audience: course.audience ?? "",
      outcomes: JSON.stringify(course.outcomes ?? []),
      prereqSlugs: JSON.stringify(course.prereqSlugs ?? []),
      technologies: JSON.stringify(course.technologies ?? []),
      skills: JSON.stringify(course.skills ?? []),
      assessment: JSON.stringify(course.assessment ?? []),
      passScore: course.passScore ?? 70,
      project: course.project ? JSON.stringify(course.project) : null,
      interviewQs: JSON.stringify(course.interviewQs ?? []),
      version: course.version ?? "1.0.0",
      contentStatus: course.contentStatus ?? "published",
    },
  });

  const lessonsDir = join(dir, "lessons");
  let files: string[] = [];
  try {
    files = (await readdir(lessonsDir)).filter((f) => f.endsWith(".json")).sort();
  } catch {
    console.warn(`⚠ no lessons dir for ${course.courseSlug}`);
  }

  let order = 1;
  for (const file of files) {
    const lesson = JSON.parse(await readFile(join(lessonsDir, file), "utf8")) as {
      title: string;
      slug: string;
      objective?: string;
      why?: string;
      minutes?: number;
      xp?: number;
      blocks?: unknown[];
      exercise?: unknown | null;
      quiz?: unknown[];
      summary?: string;
      next?: string;
      published?: boolean;
    };

    const data = {
      courseSlug: course.courseSlug,
      order,
      slug: lesson.slug,
      title: lesson.title,
      objective: lesson.objective ?? "",
      why: lesson.why ?? "",
      minutes: lesson.minutes ?? 15,
      xp: lesson.xp ?? 50,
      blocks: JSON.stringify(lesson.blocks ?? []),
      exercise: lesson.exercise ? JSON.stringify(lesson.exercise) : null,
      quiz: JSON.stringify(lesson.quiz ?? []),
      summary: lesson.summary ?? "",
      next: lesson.next ?? "",
      published: lesson.published ?? true,
    };

    await prisma.lesson.upsert({
      where: { courseSlug_slug: { courseSlug: course.courseSlug, slug: lesson.slug } },
      create: data,
      update: { ...data, order },
    });
    order++;
  }

  console.log(
    `✓ ${course.courseSlug}: course meta + ${files.length} lessons (status: ${course.contentStatus ?? "published"})`
  );
}

async function main() {
  let entries: string[] = [];
  try {
    entries = await readdir(CONTENT_ROOT);
  } catch {
    console.error("No content/courses directory found");
    process.exit(1);
  }
  for (const entry of entries) {
    const dir = join(CONTENT_ROOT, entry);
    try {
      await seedCourse(dir);
    } catch (e) {
      console.error(`✗ failed to seed ${entry}:`, e);
      process.exitCode = 1;
    }
  }
  const totals = await prisma.lesson.groupBy({
    by: ["courseSlug"],
    _count: { _all: true },
  });
  console.log(
    "DB now has:",
    totals.map((t) => `${t.courseSlug}: ${t._count._all} lessons`).join(" | ")
  );
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
