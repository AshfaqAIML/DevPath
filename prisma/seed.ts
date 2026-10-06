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
  description?: string;
  /** Roadmap milestones rendered as the step-graph in the item dialog */
  steps?: { title: string; detail: string; hours?: number }[];
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

const roadmapSteps = {
  frontend: [
    { title: "Web foundations", detail: "How the browser works, HTML semantics, CSS syntax and the box model.", hours: 30 },
    { title: "CSS layout", detail: "Flexbox, Grid, responsive design and mobile-first thinking.", hours: 35 },
    { title: "JavaScript essentials", detail: "Types, functions, arrays, objects, DOM manipulation and events.", hours: 60 },
    { title: "Modern JavaScript", detail: "ES2024 features, modules, async/await and fetch.", hours: 40 },
    { title: "Version control", detail: "Git, branching, pull requests and collaborating on GitHub.", hours: 15 },
    { title: "A framework", detail: "Pick React (or Vue/Svelte) — components, state, routing, data fetching.", hours: 80 },
    { title: "TypeScript", detail: "Types, generics and typing your framework code end to end.", hours: 35 },
    { title: "Testing", detail: "Vitest unit tests, Testing Library, Playwright smoke tests.", hours: 25 },
    { title: "Performance & a11y", detail: "Web Vitals, Lighthouse, WCAG basics, semantic markup.", hours: 20 },
    { title: "Portfolio projects", detail: "Ship 2–3 polished apps: CRUD app, API-consuming SPA, passion project.", hours: 60 },
  ],
  backend: [
    { title: "One language deeply", detail: "Node.js or Go/Python — syntax, stdlib, idioms, package ecosystem.", hours: 50 },
    { title: "HTTP & the web", detail: "Methods, status codes, headers, cookies, CORS, REST conventions.", hours: 20 },
    { title: "Framework basics", detail: "Express/FastAPI/Fiber: routing, middleware, validation.", hours: 35 },
    { title: "Databases", detail: "Relational modeling, SQL joins & indexes; when to reach for NoSQL.", hours: 45 },
    { title: "ORM & data access", detail: "Prisma or equivalent: migrations, relations, query patterns.", hours: 25 },
    { title: "Auth & security", detail: "Sessions vs JWT, hashing, OWASP top 10, rate limiting.", hours: 30 },
    { title: "Caching", detail: "Redis patterns: cache-aside, TTLs, invalidation, idempotency.", hours: 20 },
    { title: "APIs at scale", detail: "Pagination, filtering, versioning, GraphQL, webhooks.", hours: 30 },
    { title: "Observability", detail: "Structured logging, metrics, tracing and production debugging.", hours: 20 },
    { title: "Ship a service", detail: "Build + deploy a real API with auth, DB, tests and CI.", hours: 50 },
  ],
};

const roadmapItems: SeedItem[] = [
  { title: "Frontend Developer Roadmap", level: "Beginner", duration: "10 steps", tags: "frontend,html,css,javascript", featured: true, steps: roadmapSteps.frontend },
  { title: "Backend Developer Roadmap", level: "Beginner", duration: "10 steps", tags: "backend,nodejs,api", steps: roadmapSteps.backend },
  { title: "Full-Stack Developer Roadmap", level: "Beginner", duration: "12 steps", tags: "fullstack,frontend,backend", featured: true, steps: [
    { title: "Pick your stack", detail: "Choose one frontend + one backend framework and commit for 6 months.", hours: 5 },
    { title: "Web foundations", detail: "HTML, CSS layout, JavaScript fundamentals and the DOM.", hours: 50 },
    { title: "Frontend framework", detail: "Components, state management, routing and forms.", hours: 60 },
    { title: "Backend basics", detail: "HTTP servers, REST endpoints, middleware and validation.", hours: 40 },
    { title: "Databases", detail: "Model real entities, write joins, understand transactions and indexes.", hours: 40 },
    { title: "Auth end-to-end", detail: "Sessions, JWTs, password hashing and protected routes.", hours: 25 },
    { title: "Testing pyramid", detail: "Unit, integration and E2E tests on both halves of the stack.", hours: 30 },
    { title: "CI/CD", detail: "GitHub Actions pipelines, preview deploys, migrations on release.", hours: 20 },
    { title: "Cloud basics", detail: "Deploy to a PaaS/VPS, env config, custom domain, HTTPS.", hours: 20 },
    { title: "Observability", detail: "Logs, metrics and error tracking for production apps.", hours: 15 },
    { title: "Security hardening", detail: "OWASP top 10, dependency scanning, secure headers.", hours: 15 },
    { title: "Capstone", detail: "Ship a full product: auth, payments, DB, background jobs, tests.", hours: 60 },
  ] },
  { title: "DevOps / Platform Roadmap", level: "Intermediate", duration: "9 steps", tags: "devops,docker,kubernetes", steps: [
    { title: "Linux fluency", detail: "Filesystem, permissions, processes, systemd, shell scripting.", hours: 30 },
    { title: "Networking", detail: "DNS, TCP/IP, TLS, load balancers, VPNs and firewalls.", hours: 25 },
    { title: "One cloud", detail: "AWS/GCP core: compute, storage, IAM, VPC basics.", hours: 40 },
    { title: "Containers", detail: "Docker images, layers, volumes, Compose for local stacks.", hours: 30 },
    { title: "Kubernetes", detail: "Pods, deployments, services, ingress, config and secrets.", hours: 50 },
    { title: "IaC", detail: "Terraform modules, state management, plan/apply workflows.", hours: 30 },
    { title: "CI/CD pipelines", detail: "Build → test → scan → deploy pipelines with rollback.", hours: 25 },
    { title: "Observability stack", detail: "Prometheus metrics, Grafana dashboards, log aggregation.", hours: 25 },
    { title: "Incident practice", detail: "Runbooks, on-call, blameless postmortems, SLOs.", hours: 15 },
  ] },
  { title: "AI / LLM Engineer Roadmap", level: "Intermediate", duration: "9 steps", tags: "ai,llm,python", steps: [
    { title: "Python + data basics", detail: "NumPy, pandas and clean Jupyter habits.", hours: 30 },
    { title: "ML foundations", detail: "Regression, classification, evaluation metrics, overfitting.", hours: 40 },
    { title: "Deep learning", detail: "PyTorch tensors, training loops, GPUs, checkpoints.", hours: 40 },
    { title: "NLP & transformers", detail: "Tokenization, attention, embeddings, transfer learning.", hours: 35 },
    { title: "LLM APIs", detail: "Prompting, structured outputs, function calling, streaming.", hours: 20 },
    { title: "RAG", detail: "Chunking, vector DBs, retrieval pipelines, reranking.", hours: 30 },
    { title: "Agents & tools", detail: "Tool use, planning loops, evals for agent behavior.", hours: 25 },
    { title: "Fine-tuning", detail: "LoRA/QLoRA, datasets, when NOT to fine-tune.", hours: 25 },
    { title: "Ship an AI product", detail: "Guardrails, cost control, caching, user feedback loops.", hours: 30 },
  ] },
  { title: "Data Scientist Roadmap", level: "Intermediate", duration: "9 steps", tags: "data,python,ml", steps: [
    { title: "SQL mastery", detail: "Joins, window functions, CTEs, query tuning.", hours: 30 },
    { title: "Python stack", detail: "pandas, matplotlib/seaborn, scikit-learn pipelines.", hours: 35 },
    { title: "Statistics", detail: "Distributions, hypothesis testing, confidence intervals.", hours: 35 },
    { title: "Experimentation", detail: "A/B design, power, guardrail metrics, pitfalls.", hours: 20 },
    { title: "Machine learning", detail: "Supervised/unsupervised, cross-validation, feature work.", hours: 45 },
    { title: "Data engineering basics", detail: "Airflow-style pipelines, dbt models, data quality.", hours: 30 },
    { title: "Visualization & storytelling", detail: "Dashboards that answer real product questions.", hours: 20 },
    { title: "Domain depth", detail: "Pick fintech/health/ecommerce and learn its metrics.", hours: 20 },
    { title: "Capstone analysis", detail: "End-to-end: raw data → model → decision memo.", hours: 30 },
  ] },
  { title: "Mobile (React Native) Roadmap", level: "Beginner", duration: "8 steps", tags: "mobile,react-native", steps: [
    { title: "React refresher", detail: "Hooks, lists, forms and component composition.", hours: 20 },
    { title: "React Native basics", detail: "Core components, styling, responsive layouts.", hours: 30 },
    { title: "Navigation", detail: "Stacks, tabs, deep links and state restoration.", hours: 20 },
    { title: "Native APIs", detail: "Camera, geolocation, permissions, haptics, storage.", hours: 25 },
    { title: "Data & sync", detail: "REST/GraphQL clients, offline cache, optimistic UI.", hours: 25 },
    { title: "Releases", detail: "Expo EAS builds, store submissions, OTA updates.", hours: 20 },
    { title: "Performance", detail: "FlatList tuning, Hermes, startup time, memory leaks.", hours: 15 },
    { title: "Ship to stores", detail: "Screenshots, review guidelines, staged rollouts.", hours: 10 },
  ] },
  { title: "Cyber Security Roadmap", level: "Intermediate", duration: "9 steps", tags: "security,offsec", steps: [
    { title: "Networking & Linux", detail: "Packets, protocols, bash fluency and logs.", hours: 30 },
    { title: "Web app security", detail: "OWASP top 10 hands-on: XSS, SQLi, SSRF, IDOR.", hours: 35 },
    { title: "Scripting", detail: "Python + Bash for automation and tooling.", hours: 25 },
    { title: "Cryptography", detail: "Hashing, symmetric/asymmetric, TLS, PKI.", hours: 20 },
    { title: "Offense", detail: "Recon, exploitation labs, privilege escalation.", hours: 40 },
    { title: "Defense & blue team", detail: "SIEM, detection engineering, incident response.", hours: 30 },
    { title: "Cloud security", detail: "IAM misconfigs, container security, CSPM basics.", hours: 25 },
    { title: "Labs & CTFs", detail: "TryHackMe/HackTheBox paths; build a home lab.", hours: 40 },
    { title: "Specialize", detail: "Pick appsec, SOC, pentest or GRC — go deep.", hours: 20 },
  ] },
  { title: "Cloud Architect Roadmap", level: "Advanced", duration: "8 steps", tags: "cloud,aws,architecture", steps: [
    { title: "Core services", detail: "Compute, storage, networking, IAM in one cloud.", hours: 40 },
    { title: "Well-architected", detail: "The five pillars applied to a real system design.", hours: 20 },
    { title: "Networking deep dive", detail: "VPC design, hybrid connectivity, DNS strategy.", hours: 30 },
    { title: "Identity & access", detail: "Least privilege, federation, workload identity.", hours: 20 },
    { title: "Resilience", detail: "Multi-AZ, DR strategies, RTO/RPO trade-offs.", hours: 25 },
    { title: "Cost engineering", detail: "Tagging, budgets, rightsizing, commit discounts.", hours: 15 },
    { title: "IaC & automation", detail: "Terraform + pipelines for everything; zero console changes.", hours: 30 },
    { title: "Certify", detail: "Solutions Architect Associate/Professional as a forcing function.", hours: 40 },
  ] },
  { title: "QA / SDET Roadmap", level: "Beginner", duration: "8 steps", tags: "qa,testing,automation", steps: [
    { title: "Testing theory", detail: "Test pyramid, risk-based testing, bug advocacy.", hours: 15 },
    { title: "Manual testing craft", detail: "Exploratory charters, bug reports, repro steps.", hours: 20 },
    { title: "Programming", detail: "JS/TS or Python: functions, async, file/network IO.", hours: 40 },
    { title: "Unit & integration", detail: "Vitest/Jest, mocking, fixtures, coverage that matters.", hours: 30 },
    { title: "API testing", detail: "RestAssured/Supertest, contract tests, auth flows.", hours: 25 },
    { title: "E2E automation", detail: "Playwright: selectors, flakes, parallel CI runs.", hours: 35 },
    { title: "CI integration", detail: "Gates, parallelization, test reporting, triage.", hours: 15 },
    { title: "Performance & security", detail: "k6 load scripts, basic security scans.", hours: 20 },
  ] },
  { title: "Game Developer Roadmap", level: "Beginner", duration: "8 steps", tags: "game-dev,unity,graphics", steps: [
    { title: "Pick an engine", detail: "Unity/Godot — learn the editor, scenes and assets.", hours: 25 },
    { title: "C# or GDScript", detail: "Language fundamentals through small game loops.", hours: 40 },
    { title: "Math for games", detail: "Vectors, transforms, interpolation, physics.", hours: 25 },
    { title: "Gameplay systems", detail: "State machines, input, collision, save systems.", hours: 35 },
    { title: "UI & UX", detail: "Menus, HUDs, accessibility and controller support.", hours: 15 },
    { title: "Art & audio pipeline", detail: "Sprites, tilesets, SFX/music integration.", hours: 25 },
    { title: "Polish", detail: "Juice: tweens, particles, screenshake, game feel.", hours: 20 },
    { title: "Ludum Dare", detail: "Ship 3 game-jam games; publish one on itch.io.", hours: 45 },
  ] },
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
// SQL Fundamentals ships with complete lesson content
// (content/courses/sql-fundamentals/) — its catalog copy describes the real course.
const sqlFundamentals = courseItems.find((c) => c.title === "SQL Fundamentals");
if (sqlFundamentals) {
  sqlFundamentals.description =
    "Ten hands-on lessons from your first SELECT to three-table joins: filtering, sorting, aggregates, GROUP BY, data design and safe mutations. Every example runs live in the SQL Query Sandbox, and the capstone makes you the platform's first analytics hire.";
}
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

// Two simulators ship as real playable experiences — the remaining drafts wait
// for their sandboxes to be built.
const simulatorItems: SeedItem[] = [
  {
    title: "CSS Flexbox Simulator",
    level: "Beginner",
    tags: "css,layout,interactive",
    featured: true,
    published: true,
    description:
      "A hands-on flexbox sandbox: flip every axis control, watch the layout react live, then prove it in challenge mode. Generates the exact CSS you built.",
  },
  {
    title: "HTTP Request/Response Lab",
    level: "Intermediate",
    tags: "http,networking,interactive",
    featured: true,
    published: true,
    description:
      "A live HTTP lab wired to DevPath's own API: build real requests — methods, headers, bodies, query params — and study genuine status codes, response headers and JSON payloads. Six guided missions included.",
  },
  {
    title: "SQL Query Sandbox",
    level: "Beginner",
    tags: "sql,database,interactive",
    featured: true,
    published: true,
    description:
      "A read-only SQL engine running right in your browser: explore a three-table schema, write SELECTs with joins, groups and aggregates, get friendly errors with did-you-mean hints, and prove your skills in six guided missions.",
  },
  { title: "Kubernetes Cluster Simulator", level: "Advanced", tags: "kubernetes,devops,interactive", published: false },
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
            item.description ??
            (item.tags?.includes("roadmap") || created.slug === "roadmaps"
              ? `A guided career path covering everything you need to become a confident ${item.title.replace(" Roadmap", "")} — with checkpoints, projects and a clear order of operations.`
              : created.slug === "resources"
                ? `A dense, practical reference you can scan in minutes: commands, snippets and decision tables for ${item.title.replace(/(Cheatsheet|Cheat Sheet|Reference|Guide|Notes|Checklist)/i, "").trim() || "everyday work"}.`
                : `A hands-on, focused session on ${item.title}. Learn the mental models, work through graded exercises, and ship something real by the end.`),
          level: item.level ?? "Beginner",
          duration: item.duration ?? null,
          tags: item.tags ?? "",
          steps: item.steps ? JSON.stringify(item.steps) : "",
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
