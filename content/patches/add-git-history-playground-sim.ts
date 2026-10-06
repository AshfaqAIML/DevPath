// Live-DB patch — registers the Git History Playground simulator catalog row
// and refreshes the Git course catalog entry (duration/lessons metadata).
//
// Run with: bun content/patches/add-git-history-playground-sim.ts
//
// Idempotent: re-running is a no-op (upsert by slug). Views, analytics and
// every other row are untouched. prisma/seed.ts carries the same rows so a
// future full reseed reproduces the catalog.
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const SLUG = "git-history-playground";
const DESCRIPTION =
  "A faithful in-memory Git model with a live commit graph: run git init, add, commit, branch, switch, merge, reset and revert — and watch the DAG redraw itself. Classic ASCII log --graph output, six guided missions, and deep-links from every Git course practice block.";

async function main() {
  const simulatorsCategory = await prisma.category.findUnique({
    where: { slug: "simulators" },
  });
  if (!simulatorsCategory) {
    throw new Error("simulators category not found — run the base seed first");
  }

  await prisma.resourceItem.upsert({
    where: { slug: SLUG },
    create: {
      slug: SLUG,
      title: "Git History Playground",
      description: DESCRIPTION,
      level: "Beginner",
      tags: "git,version-control,interactive",
      published: true,
      featured: true,
      order: 5,
      categoryId: simulatorsCategory.id,
    },
    update: {
      description: DESCRIPTION,
      level: "Beginner",
      tags: "git,version-control,interactive",
      published: true,
      featured: true,
    },
  });
  console.log(`✓ upserted ${SLUG} in the Simulators category (published, featured)`);

  // Refresh the Git course catalog entry so duration/level reflect real content.
  const course = await prisma.resourceItem.update({
    where: { slug: "git-for-beginners-visual-learning" },
    data: {
      duration: "3h 0m",
      description:
        "Git finally makes sense: commits, branches, merges and remotes taught visually — diagrams of what each command actually does to your history, and a live playground where every run redraws your commit graph.",
    },
  });
  console.log(`✓ refreshed course catalog row ${course.slug} (duration ${course.duration})`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
