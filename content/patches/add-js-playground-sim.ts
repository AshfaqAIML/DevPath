// Live-DB patch — registers the JavaScript Playground simulator catalog row
// (Task 10: js-playground + JavaScript Basics Refresher course pairing).
//
// Run with: bun content/patches/add-js-playground-sim.ts
//
// Idempotent: re-running is a no-op (upsert by slug). Views, analytics and
// every other row are untouched. prisma/seed.ts carries the same row so a
// future full reseed reproduces the catalog.
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const SLUG = "js-playground";
const DESCRIPTION =
  "A sandboxed JavaScript REPL in your browser: strict-mode ES2020 snippets run in a Web Worker with a captured console, REPL-style last-expression echo, friendly error hints and a 4-second watchdog. Six guided missions, plus deep-links from every JavaScript course practice block.";

async function main() {
  const simulatorsCategory = await prisma.category.findUnique({
    where: { slug: "simulators" },
  });
  if (!simulatorsCategory) {
    throw new Error("simulators category not found — run the base seed first");
  }

  // order: after the existing playable sims (0, 3, 1) — use 4 so it lists last.
  const existing = await prisma.resourceItem.findUnique({ where: { slug: SLUG } });
  if (existing) {
    console.log(`✓ ${SLUG} already exists (id ${existing.id}) — nothing to do`);
    return;
  }

  await prisma.resourceItem.create({
    data: {
      slug: SLUG,
      title: "JavaScript Playground",
      description: DESCRIPTION,
      level: "Beginner",
      tags: "javascript,es2020,interactive",
      published: true,
      featured: true,
      order: 4,
      categoryId: simulatorsCategory.id,
    },
  });
  console.log(`✓ created ${SLUG} in the Simulators category (published, featured)`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
