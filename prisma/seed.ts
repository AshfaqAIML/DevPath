// Seed script — run with: bun prisma/seed.ts
// Seeds the five core categories plus content items. Counts displayed in the
// category hub are derived from published ResourceItem rows, so seeding
// 15 published masterclass items yields "15 workshops" automatically.
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const slugify = (s: string) =>
  s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");

type SeedItem = {
  title: string;
  level?: "Beginner" | "Intermediate" | "Advanced";
  duration?: string;
  tags?: string;
  featured?: boolean;
  published?: boolean;
};

const masterclassItems: SeedItem[] = [
  { title: "Full-Stack Systems Design Masterclass", level: "Advanced", duration: "6h 30m", tags: "architecture,systems,fullstack", featured: true },
  { title: "Advanced TypeScript Patterns & Type-Level Magic", level: "Advanced", duration: "4h 15m", tags: "typescript,types" },
  { title: "React Architecture at Scale", level: "Advanced", duration: "5h 00m", tags: "react,architecture,frontend" },
  { title: "Database Engineering Deep Dive", level: "Intermediate", duration: "5h 45m", tags: "database,sql,postgres" },
  { title: "Distributed Systems Fundamentals", level: "Advanced", duration: "7h 00m", tags: "systems,distributed,networking", featured: true },
  { title: "API Design Masterclass: REST to GraphQL", level: "Intermediate", duration: "3h 50m", tags: "api,rest,graphql" },
  { title: "Frontend Performance Engineering", level: "Intermediate", duration: "4h 30m", tags: "performance,web-vitals,frontend" },
  { title: "Testing Strategies for Production Code", level: "Intermediate", duration: "3h 20m", tags: "testing,vitest,quality" },
  { title: "CSS Architecture & Design Systems", level: "Intermediate", duration: "4h 00m", tags: "css,design-systems" },
  { title: "Node.js Event Loop Internals", level: "Advanced", duration: "3h 45m", tags: "nodejs,runtime,internals" },
  { title: "Observability & Production Debugging", level: "Advanced", duration: "4h 10m", tags: "observability,logging,debugging" },
  { title: "Software Architecture Masterclass", level: "Advanced", duration: "8h 00m", tags: "architecture,ddd,patterns" },
  { title: "Auth, Security & Cryptography Essentials", level: "Intermediate", duration: "4h 40m", tags: "security,auth,crypto" },
  { title: "Data Modeling with Prisma & SQL", level: "Beginner", duration: "3h 30m", tags: "prisma,sql,data-modeling" },
  { title: "AI-Native Product Engineering", level: "Advanced", duration: "5h 30m", tags: "ai,llm,product" },
];

const roadmapItems: SeedItem[] = [
  { title: "Frontend Developer Roadmap", level: "Beginner", duration: "32 steps", tags: "frontend,html,css,javascript", featured: true },
  { title: "Backend Developer Roadmap", level: "Beginner", duration: "34 steps", tags: "backend,nodejs,api" },
  { title: "Full-Stack Developer Roadmap", level: "Beginner", duration: "45 steps", tags: "fullstack,frontend,backend", featured: true },
  { title: "DevOps / Platform Roadmap", level: "Intermediate", duration: "28 steps", tags: "devops,docker,kubernetes" },
  { title: "AI / LLM Engineer Roadmap", level: "Intermediate", duration: "24 steps", tags: "ai,llm,python" },
  { title: "Data Scientist Roadmap", level: "Intermediate", duration: "30 steps", tags: "data,python,ml" },
  { title: "Mobile (React Native) Roadmap", level: "Beginner", duration: "22 steps", tags: "mobile,react-native" },
  { title: "Cyber Security Roadmap", level: "Intermediate", duration: "26 steps", tags: "security,offsec" },
  { title: "Cloud Architect Roadmap", level: "Advanced", duration: "25 steps", tags: "cloud,aws,architecture" },
  { title: "QA / SDET Roadmap", level: "Beginner", duration: "20 steps", tags: "qa,testing,automation" },
  { title: "Game Developer Roadmap", level: "Beginner", duration: "21 steps", tags: "game-dev,unity,graphics" },
];

const courseItems: SeedItem[] = [
  "Git & GitHub Foundations", "Command Line Basics", "HTML Semantics in 1 Hour",
  "CSS Flexbox Deep Dive", "CSS Grid Layout Crash Course", "Responsive Design Fundamentals",
  "JavaScript Basics Refresher", "Modern JavaScript (ES2024)", "Async JavaScript & Promises",
  "TypeScript in 2 Hours", "React Hooks Fundamentals", "React State Patterns",
  "Next.js App Router Quickstart", "Tailwind CSS in 90 Minutes", "Vue 3 Essentials",
  "SvelteKit Fast Track", "Node.js Fundamentals", "Express API Quickstart",
  "REST API Design Basics", "GraphQL Basics", "SQL Fundamentals",
  "PostgreSQL Quickstart", "MongoDB in 2 Hours", "Prisma ORM Crash Course",
  "Redis & Caching Basics", "Docker Foundations", "Docker Compose in Practice",
  "Kubernetes Basics", "CI/CD with GitHub Actions", "Terraform Basics",
  "AWS Fundamentals", "Linux for Developers", "Bash Scripting Basics",
  "Python Fundamentals", "Go Basics for JS Devs", "Rust Absolute Basics",
  "Testing with Vitest", "Playwright End-to-End Testing", "Accessibility (a11y) Basics",
  "Web Performance Basics", "SEO for Developers", "Security Basics (OWASP Top 10)",
  "WebSockets & Real-Time Apps", "WebRTC Fundamentals",
].map((title, i) => ({
  title,
  level: (["Beginner", "Intermediate", "Beginner", "Advanced"] as const)[i % 4],
  duration: `${1 + (i % 3)}h ${15 * (i % 4)}m`,
  tags: "course,focused,practical",
  featured: i === 0 || i === 27,
}));
courseItems.push({ title: "Zig Fundamentals", level: "Intermediate", duration: "2h 30m", tags: "zig,systems", published: false });

const resourceItems: SeedItem[] = [
  "SQL Cheatsheet", "Git Command Reference", "HTTP Status Codes Reference",
  "Regex Cheat Sheet", "CSS Flexbox Cheatsheet", "CSS Grid Cheatsheet",
  "JavaScript Array Methods Reference", "TypeScript Utility Types Guide", "React Hooks API Reference",
  "Next.js Routing Cheat Sheet", "Tailwind CSS Class Reference", "Docker Commands Cheatsheet",
  "Kubernetes kubectl Reference", "Linux Command Line Cheatsheet", "Vim Survival Guide",
  "Python Basics Cheatsheet", "Bash Scripting Reference", "PostgreSQL psql Reference",
  "MongoDB Query Reference", "GraphQL SDL Reference", "API Design Checklist",
  "System Design Primer Notes", "Big-O Notation Cheatsheet", "Data Structures Visual Guide",
  "Algorithms Interview Notes", "Accessibility Checklist (WCAG)", "Performance Budget Worksheet",
].map((title, i) => ({
  title,
  level: (["Beginner", "Intermediate"] as const)[i % 2],
  duration: `${10 + (i % 5) * 5} min read`,
  tags: "reference,cheatsheet,guide",
  featured: i === 0,
}));
resourceItems.push({ title: "Design Tokens Field Guide", level: "Intermediate", duration: "15 min read", tags: "design,reference", published: false });

// Simulators start unpublished — the hub shows the "New" badge with no count
// until the admin publishes simulator content from the admin console.
const simulatorItems: SeedItem[] = [
  { title: "CSS Flexbox Simulator", level: "Beginner", tags: "css,layout,interactive", published: false },
  { title: "SQL Query Sandbox", level: "Beginner", tags: "sql,database,interactive", published: false },
  { title: "Kubernetes Cluster Simulator", level: "Advanced", tags: "kubernetes,devops,interactive", published: false },
  { title: "HTTP Request/Response Lab", level: "Intermediate", tags: "http,networking,interactive", published: false },
];

async function main() {
  await prisma.analyticsEvent.deleteMany();
  await prisma.resourceItem.deleteMany();
  await prisma.category.deleteMany();

  const categories = [
    {
      slug: "masterclass",
      title: "Masterclass",
      tagline: "Workshop-style deep learning experiences",
      description:
        "Intensive, cohort-style workshops that take you deep into one topic with hands-on projects, code reviews and live instruction. Built for engineers who want depth over breadth.",
      countLabel: "workshops",
      icon: "/icons/masterclass/icon.jpg",
      route: "/masterclass",
      badge: null,
      badgeVariant: "default",
      accent: "amber",
      order: 1,
      items: masterclassItems,
    },
    {
      slug: "roadmaps",
      title: "Roadmaps",
      tagline: "Step-by-step career-oriented learning paths",
      description:
        "Curated career paths that tell you exactly what to learn, in what order, and what to skip. Follow a proven track from first line of code to job-ready engineer.",
      countLabel: "career paths",
      icon: "/icons/roadmaps/icon.jpg",
      route: "/roadmaps",
      badge: null,
      badgeVariant: "default",
      accent: "emerald",
      order: 2,
      items: roadmapItems,
    },
    {
      slug: "courses",
      title: "Courses",
      tagline: "Short, focused mini courses",
      description:
        "Tight, focused mini courses that teach one skill at a time — no filler, no semester-length commitments. Finish in an afternoon, use it at work tomorrow.",
      countLabel: "mini courses",
      icon: "/icons/courses/icon.jpg",
      route: "/courses",
      badge: null,
      badgeVariant: "default",
      accent: "orange",
      order: 3,
      items: courseItems,
    },
    {
      slug: "resources",
      title: "Resources",
      tagline: "Practical guides, cheatsheets & references",
      description:
        "The practical shelf: cheatsheets, reference cards, checklists and step-by-step guides you'll keep coming back to between projects and interviews.",
      countLabel: "guides",
      icon: "/icons/resources/icon.jpg",
      route: "/resources",
      badge: null,
      badgeVariant: "default",
      accent: "rose",
      order: 4,
      items: resourceItems,
    },
    {
      slug: "simulators",
      title: "Simulators",
      tagline: "Interactive practice environments",
      description:
        "Safe, interactive sandboxes where you break things on purpose. Simulate clusters, networks and layouts without touching production.",
      countLabel: "simulators",
      icon: "/icons/simulators/icon.jpg",
      route: "/simulators",
      badge: "New",
      badgeVariant: "default",
      accent: "teal",
      order: 5,
      items: simulatorItems,
    },
  ];

  for (const c of categories) {
    const { items, ...category } = c;
    const created = await prisma.category.create({
      data: {
        ...category,
        seoTitle: `${category.title} — DevPath`,
        seoDescription: category.description.slice(0, 155),
      },
    });
    let i = 0;
    for (const item of items) {
      await prisma.resourceItem.create({
        data: {
          slug: slugify(item.title),
          title: item.title,
          description:
            item.tags?.includes("roadmap") || created.slug === "roadmaps"
              ? `A guided career path covering everything you need to become a confident ${item.title.replace(" Roadmap", "")} — with checkpoints, projects and a clear order of operations.`
              : created.slug === "resources"
                ? `A dense, practical reference you can scan in minutes: commands, snippets and decision tables for ${item.title.replace(/(Cheatsheet|Cheat Sheet|Reference|Guide|Notes|Checklist)/i, "").trim() || "everyday work"}.`
                : `A hands-on, focused session on ${item.title}. Learn the mental models, work through graded exercises, and ship something real by the end.`,
          level: item.level ?? "Beginner",
          duration: item.duration ?? null,
          tags: item.tags ?? "",
          published: item.published ?? true,
          featured: item.featured ?? false,
          order: i,
          views: Math.floor(Math.random() * 900),
          categoryId: created.id,
        },
      });
      i++;
    }
  }

  const counts = await prisma.category.findMany({
    select: { slug: true, title: true, _count: { select: { items: { where: { published: true } } } } },
  });
  console.log("Seeded:", counts.map((c) => `${c.title}: ${c._count.items} published`).join(" | "));
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
