// Live-DB patch — adds the second course batch (user-specified catalog
// additions, 2026-10-06) plus the track/planned-lesson backfill for the
// original 44-course catalog, WITHOUT wiping views/analytics.
//
// Run with: bun content/patches/add-course-batch-2.ts
//
// Idempotent: re-running is a no-op.
//   · Existing items are UPDATED in place (track + plannedLessons only —
//     titles, descriptions, levels, views and publish state are untouched).
//   · Batch items are CREATED once (upsert-by-slug); re-runs only refresh
//     their catalog metadata (track/plannedLessons/level/description).
// The same data powers prisma/seed.ts via prisma/course-batch-2.ts, so a
// future full reseed reproduces this exact catalog.
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const slugify = (s: string) =>
  s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");

async function main() {
  const coursesCategory = await prisma.category.findUnique({
    where: { slug: "courses" },
  });
  if (!coursesCategory) {
    throw new Error("courses category not found — run the base seed first");
  }

  // ---- 1) Backfill track + plannedLessons on the original 44 courses ----
  const existing = await prisma.resourceItem.findMany({
    where: { categoryId: coursesCategory.id },
    select: { id: true, title: true, track: true, plannedLessons: true },
  });
  const { EXISTING_COURSE_META, courseBatch2Seeded } = await import(
    "../../prisma/course-batch-2"
  );

  let updated = 0;
  for (const item of existing) {
    const meta = EXISTING_COURSE_META[item.title];
    if (!meta) continue;
    if (item.track === meta.track && item.plannedLessons === meta.plannedLessons) {
      continue; // already backfilled
    }
    await prisma.resourceItem.update({
      where: { id: item.id },
      data: { track: meta.track, plannedLessons: meta.plannedLessons },
    });
    updated++;
    console.log(`↻ backfilled  ${item.title} → ${meta.track} · ${meta.plannedLessons} lessons`);
  }
  console.log(`Backfill: ${updated} existing course(s) updated.`);

  // ---- 2) Create (or refresh catalog metadata for) the second batch ----
  const batch = courseBatch2Seeded();
  let created = 0;
  let refreshed = 0;
  let skipped = 0;
  // Continue ordering after the highest existing course order.
  const maxOrder = await prisma.resourceItem.findFirst({
    where: { categoryId: coursesCategory.id },
    orderBy: { order: "desc" },
    select: { order: true },
  });
  let order = (maxOrder?.order ?? -1) + 1;

  for (const item of batch) {
    const slug = slugify(item.title);
    const found = await prisma.resourceItem.findUnique({ where: { slug } });
    if (!found) {
      await prisma.resourceItem.create({
        data: {
          slug,
          title: item.title,
          description: item.description ?? "",
          level: item.level ?? "Beginner",
          duration: item.duration ?? null,
          tags: item.tags ?? "",
          track: item.track ?? null,
          plannedLessons: item.plannedLessons ?? null,
          published: true,
          featured: false,
          order: order++,
          categoryId: coursesCategory.id,
        },
      });
      created++;
      console.log(`+ created    ${item.title} (${item.track} · ${item.plannedLessons} lessons)`);
    } else if (found.categoryId === coursesCategory.id) {
      // Already exists (e.g. re-run, or title collision with the original
      // catalog): refresh only the batch-managed catalog fields.
      await prisma.resourceItem.update({
        where: { id: found.id },
        data: {
          track: item.track ?? null,
          plannedLessons: item.plannedLessons ?? null,
          level: item.level ?? found.level,
          description: item.description ?? found.description,
          duration: item.duration ?? found.duration,
        },
      });
      refreshed++;
      console.log(`↻ refreshed  ${item.title}`);
    } else {
      skipped++;
      console.warn(`⚠ slug collision in another category: ${item.title} — skipped`);
    }
  }
  console.log(`Batch: ${created} created · ${refreshed} refreshed · ${skipped} skipped.`);

  // ---- 3) Summary ----
  const counts = await prisma.resourceItem.groupBy({
    by: ["track"],
    where: { categoryId: coursesCategory.id, published: true },
    _count: { _all: true },
  });
  const total = counts.reduce((s, c) => s + c._count._all, 0);
  console.log(`Published courses now: ${total}`);
  for (const c of counts) {
    console.log(`  ${c.track ?? "(no track)"}: ${c._count._all}`);
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
