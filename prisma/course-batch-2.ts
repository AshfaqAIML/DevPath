// Shared course-batch data — the single source of truth for the second course
// catalog batch (user-specified additions, 2026-10-06) plus the track/planned-
// lesson backfill for the original 44-course catalog.
// Consumed by BOTH prisma/seed.ts (full reseed) and
// content/patches/add-course-batch-2.ts (idempotent live-DB patch), so the
// two paths can never drift.

export type SeedItem = {
  title: string;
  level?: "Beginner" | "Intermediate" | "Advanced";
  duration?: string;
  tags?: string;
  featured?: boolean;
  published?: boolean;
  description?: string;
  steps?: { title: string; detail: string; hours?: number }[];
  /** Learning track (Frontend | Backend | Data | DA/DS | AI | SDET | Tools) */
  track?: string;
  /** Planned lesson count from the catalog plan (live Lesson rows win once authored) */
  plannedLessons?: number;
};

/** Duration derived from the lesson plan (≈15 min/lesson, rounded to 15m). */
export const lessonDuration = (lessons: number): string => {
  const minutes = lessons * 15;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return `${h}h ${m === 0 ? "00" : m}m`;
};

// Track + planned-lesson backfill for the original 44-course catalog.
// Planned lesson counts follow the audit doc (docs/COURSE_CATALOG_AUDIT.md,
// topic-depth rule); the three user-specified values (SQL Fundamentals 10,
// Node.js Fundamentals 10, Docker Foundations 10) take precedence.
export const EXISTING_COURSE_META: Record<string, { track: string; plannedLessons: number }> = {
  "Git & GitHub Foundations": { track: "Tools", plannedLessons: 8 },
  "Command Line Basics": { track: "Tools", plannedLessons: 6 },
  "HTML Semantics in 1 Hour": { track: "Frontend", plannedLessons: 5 },
  "CSS Flexbox Deep Dive": { track: "Frontend", plannedLessons: 8 },
  "CSS Grid Layout Crash Course": { track: "Frontend", plannedLessons: 8 },
  "Responsive Design Fundamentals": { track: "Frontend", plannedLessons: 8 },
  "JavaScript Basics Refresher": { track: "Frontend", plannedLessons: 8 },
  "Modern JavaScript (ES2024)": { track: "Frontend", plannedLessons: 9 },
  "Async JavaScript & Promises": { track: "Frontend", plannedLessons: 9 },
  "TypeScript in 2 Hours": { track: "Frontend", plannedLessons: 8 },
  "React Hooks Fundamentals": { track: "Frontend", plannedLessons: 9 },
  "React State Patterns": { track: "Frontend", plannedLessons: 10 },
  "Next.js App Router Quickstart": { track: "Frontend", plannedLessons: 9 },
  "Tailwind CSS in 90 Minutes": { track: "Frontend", plannedLessons: 6 },
  "Vue 3 Essentials": { track: "Frontend", plannedLessons: 8 },
  "SvelteKit Fast Track": { track: "Frontend", plannedLessons: 7 },
  "Node.js Fundamentals": { track: "Backend", plannedLessons: 10 },
  "Express API Quickstart": { track: "Backend", plannedLessons: 8 },
  "REST API Design Basics": { track: "Backend", plannedLessons: 8 },
  "GraphQL Basics": { track: "Backend", plannedLessons: 7 },
  "SQL Fundamentals": { track: "DA/DS", plannedLessons: 10 },
  "PostgreSQL Quickstart": { track: "Data", plannedLessons: 7 },
  "MongoDB in 2 Hours": { track: "Data", plannedLessons: 7 },
  "Prisma ORM Crash Course": { track: "Data", plannedLessons: 8 },
  "Redis & Caching Basics": { track: "Data", plannedLessons: 6 },
  "Docker Foundations": { track: "Tools", plannedLessons: 10 },
  "Docker Compose in Practice": { track: "Tools", plannedLessons: 7 },
  "Kubernetes Basics": { track: "Tools", plannedLessons: 10 },
  "CI/CD with GitHub Actions": { track: "Tools", plannedLessons: 8 },
  "Terraform Basics": { track: "Tools", plannedLessons: 8 },
  "AWS Fundamentals": { track: "Tools", plannedLessons: 10 },
  "Linux for Developers": { track: "Tools", plannedLessons: 9 },
  "Bash Scripting Basics": { track: "Tools", plannedLessons: 7 },
  "Python Fundamentals": { track: "Backend", plannedLessons: 10 },
  "Go Basics for JS Devs": { track: "Backend", plannedLessons: 8 },
  "Rust Absolute Basics": { track: "Backend", plannedLessons: 8 },
  "Testing with Vitest": { track: "SDET", plannedLessons: 8 },
  "Playwright End-to-End Testing": { track: "SDET", plannedLessons: 8 },
  "Accessibility (a11y) Basics": { track: "Frontend", plannedLessons: 6 },
  "Web Performance Basics": { track: "Frontend", plannedLessons: 7 },
  "SEO for Developers": { track: "Frontend", plannedLessons: 6 },
  "Security Basics (OWASP Top 10)": { track: "Backend", plannedLessons: 10 },
  "WebSockets & Real-Time Apps": { track: "Backend", plannedLessons: 7 },
  "WebRTC Fundamentals": { track: "Backend", plannedLessons: 6 },
};

// Second course batch — user-specified catalog additions (2026-10-06).
// "SQL Fundamentals", "Node.js Fundamentals" and "Docker Fundamentals" already
// exist in the catalog above (Docker as "Docker Foundations") and were updated
// in place instead of duplicated.
export const COURSE_BATCH_2: SeedItem[] = [
  { title: "SQL Intermediate", level: "Intermediate", track: "DA/DS", plannedLessons: 10,
    description: "Level up from single-table SELECTs: subqueries, CTEs, window-function fundamentals, advanced joins and query-tuning instincts — every concept framed around the queries you'll actually write at work." },
  { title: "SQL Advanced", level: "Advanced", track: "DA/DS", plannedLessons: 10,
    description: "The deep end: execution-plan thinking, index strategies, transaction isolation, recursive CTEs and analytics-grade window functions — the SQL that separates seniors from scripters." },
  { title: "OpenDataLoader PDF", level: "Beginner", track: "AI", plannedLessons: 5,
    description: "A practical PDF companion for loading real-world datasets into your stack: formats, schemas, validation and cleanup — the unglamorous 80% of every data project, finally written down." },
  { title: "API Testing with Postman", level: "Beginner", track: "SDET", plannedLessons: 10,
    description: "Test APIs like a professional: collections, environments, assertions, chaining, auth flows and CI-ready Newman runs — Postman from first request to a maintainable regression suite." },
  { title: "TypeScript Fundamentals", level: "Beginner", track: "Frontend", plannedLessons: 10,
    description: "TypeScript from zero to confident: annotations, inference, unions, narrowing, generics and utility types — the modern type-system mental model every codebase assumes." },
  { title: "Git for Beginners: Visual Learning", level: "Beginner", track: "Tools", plannedLessons: 10,
    description: "Git finally makes sense: commits, branches, merges and remotes taught visually — diagrams of what each command actually does to your history before you ever type it." },
  { title: "Build an AI Interview Coach with LangChain", level: "Intermediate", track: "Backend", plannedLessons: 8,
    description: "Ship a real AI app: chains, prompts, memory and structured evaluation as you build an interview coach that asks, listens and gives feedback — LangChain end to end." },
  { title: "Interactive React Workshop", level: "Intermediate", track: "Frontend", plannedLessons: 10,
    description: "A hands-on, exercise-driven React workshop: components, state, effects and composition drilled through live coding challenges instead of slides." },
  { title: "React Fundamentals", level: "Beginner", track: "Frontend", plannedLessons: 9,
    description: "The React mental model: thinking in components, rendering as a function of state, props vs state, lists, forms and lifting state — the foundation hooks build on." },
  { title: "Tailwind CSS Fundamentals", level: "Beginner", track: "Frontend", plannedLessons: 10,
    description: "Style at the speed you think: the utility-first workflow, spacing/color/typography scales, responsive variants and extracting components — Tailwind from first class to production page." },
  { title: "DSA Fundamentals by Visualization", level: "Intermediate", track: "Backend", plannedLessons: 10,
    description: "Data structures and algorithms through animation: arrays, linked lists, stacks, queues, trees, graphs and the classic algorithms — you'll see every pointer move before you code it." },
  { title: "Low Level Design", level: "Intermediate", track: "Backend", plannedLessons: 4,
    description: "Design classes, not just systems: SOLID, relationships, design patterns and clean object modeling practiced on the interview classics — parking lots, elevators, splitwise." },
  { title: "AI for Backend Developers", level: "Intermediate", track: "Backend", plannedLessons: 6,
    description: "Practical AI for server-side engineers: calling LLMs from APIs, streaming, structured outputs, evals, cost control and guardrails — AI as another tool in your backend belt." },
  { title: "High Level Design", level: "Advanced", track: "Backend", plannedLessons: 10,
    description: "System design from first principles: scaling, caching, queues, consistency, partitioning and the trade-off language of design interviews — with full diagram walkthroughs." },
  { title: "Data Visualization & Analysis", level: "Intermediate", track: "Data", plannedLessons: 11,
    description: "Turn data into decisions: exploratory analysis, chart selection, encoding, storytelling with dashboards and the classic visualization traps that quietly mislead readers." },
  { title: "Database Sharding", level: "Advanced", track: "Backend", plannedLessons: 6,
    description: "Horizontal scaling for real: shard keys, rebalancing, hot spots, cross-shard queries and the operational price — when to shard, and what teams get wrong when they do." },
  { title: "Circuit Breaker Pattern", level: "Advanced", track: "Backend", plannedLessons: 5,
    description: "Stop failure cascades: timeouts, retries, breaker states and graceful degradation — the resilience pattern microservices actually need, with failure-mode walkthroughs." },
  { title: "CQRS & Event Sourcing", level: "Advanced", track: "Backend", plannedLessons: 6,
    description: "Separate reads from writes and make events your source of truth: projections, replay, snapshots and the consistency model — including when NOT to use it." },
  { title: "Load Balancing Strategies", level: "Advanced", track: "Backend", plannedLessons: 5,
    description: "Round-robin to consistent hashing: L4 vs L7, health checks, session affinity and global traffic routing — how requests actually find your servers at scale." },
  { title: "Distributed Caching", level: "Advanced", track: "Backend", plannedLessons: 6,
    description: "Caching across nodes: cache-aside vs write-through, TTLs, invalidation, stampedes and coherence — Redis-backed patterns that survive production traffic." },
  { title: "Consensus Algorithms", level: "Advanced", track: "Backend", plannedLessons: 5,
    description: "How distributed systems agree: Paxos, Raft, leader election, quorums and split-brain — the theory, finally made visual and practical." },
  { title: "Database Indexing Deep Dive", level: "Advanced", track: "Backend", plannedLessons: 5,
    description: "Indexes from B-trees up: composite keys, covering indexes, selectivity, execution-plan reading and the anti-patterns that quietly kill query performance." },
  { title: "SQL Window Functions", level: "Intermediate", track: "Data", plannedLessons: 6,
    description: "PARTITION BY, ROWS BETWEEN and running aggregates: ranking, lag/lead, moving windows and sessionization — the analytics SQL that GROUP BY can't do." },
  { title: "GraphQL vs REST", level: "Intermediate", track: "Backend", plannedLessons: 6,
    description: "A fair fight, framed honestly: resource modeling, over/under-fetching, tooling, caching, versioning and when each wins — decided by constraints, not fashion." },
  { title: "WebSocket Essentials", level: "Intermediate", track: "Backend", plannedLessons: 5,
    description: "Real-time done right: the handshake, frames, heartbeats, reconnection, backpressure and rooms — plus when polling or SSE is simply the better call." },
  { title: "OAuth 2.0 & OIDC", level: "Intermediate", track: "Backend", plannedLessons: 6,
    description: "Auth flows without hand-waving: grants, tokens, PKCE, refresh rotation and the attack vectors each flow prevents — the modern identity stack explained precisely." },
  { title: "Webhook Design Patterns", level: "Intermediate", track: "Backend", plannedLessons: 5,
    description: "Webhooks that don't bite: signatures, idempotency, retries, dead-lettering and consumer-side dedup — the contract between systems that call you back." },
  { title: "LangGraph for E-commerce", level: "Intermediate", track: "AI", plannedLessons: 10,
    description: "Stateful agent graphs on a real domain: nodes, edges, checkpointing and human-in-the-loop for order flows, returns and support — LangGraph applied, not toyed." },
  { title: "CrewAI: E-commerce Agent Teams", level: "Intermediate", track: "AI", plannedLessons: 10,
    description: "Multi-agent teamwork: role design, task delegation, tools and hand-offs for catalog, pricing and support crews — CrewAI in an e-commerce context." },
  { title: "RAG Agents for E-commerce", level: "Intermediate", track: "AI", plannedLessons: 10,
    description: "Retrieval that works on product data: chunking, embeddings, hybrid search, reranking and grounded answers — build the RAG layer behind a store's assistant." },
  { title: "MCP & Tool Use for E-commerce", level: "Intermediate", track: "AI", plannedLessons: 10,
    description: "Give agents hands: the Model Context Protocol, tool schemas, permissions and safe execution patterns for catalog and order operations." },
  { title: "Production AI Agents", level: "Advanced", track: "AI", plannedLessons: 10,
    description: "Ship agents, not demos: evaluation, guardrails, observability, cost control, fallbacks and the human-review loop — the engineering between prototype and production." },
  { title: "Agent Harnesses for Developers", level: "Intermediate", track: "AI", plannedLessons: 10,
    description: "Build the scaffolding around your models: context windows, memory, tool registries, planning loops and debugging — the harness patterns behind reliable agents." },
  { title: "Prompt Engineering 101", level: "Beginner", track: "AI", plannedLessons: 10,
    description: "Prompts as programs: structure, few-shot design, decomposition, output constraints and systematic iteration — engineering your way to reliable model behavior." },
  { title: "Selenium WebDriver for E-Commerce Testing", level: "Intermediate", track: "SDET", plannedLessons: 10,
    description: "Automate a real storefront with Selenium WebDriver: locators, waits, the Page Object Model and stable suites that survive UI churn." },
  { title: "Playwright for E-Commerce Testing", level: "Intermediate", track: "SDET", plannedLessons: 10,
    description: "Fast, flake-resistant E2E for e-commerce: auto-waiting, fixtures, API mocking, parallel CI runs and trace debugging — Playwright against a real store flow." },
  { title: "JMeter Performance Testing for E-Commerce", level: "Intermediate", track: "SDET", plannedLessons: 10,
    description: "Load, stress and soak testing for storefronts: thread groups, correlation, CI integration and reading the graphs before launch day." },
  { title: "E-Commerce Test Automation: The Practitioner's Playbook", level: "Advanced", track: "SDET", plannedLessons: 9,
    description: "A strategy-first playbook: the test pyramid on real e-commerce, flake budgets, data strategy, visual regression and the business case that keeps suites funded." },
  { title: "Spring AI for E-Commerce", level: "Intermediate", track: "AI", plannedLessons: 8,
    description: "AI in the Spring ecosystem: ChatClient, embeddings, vector stores and tool calling wired into Java services — enterprise patterns for storefront intelligence." },
  { title: "Full-Stack AI Agents: Java, Spring Boot & React", level: "Advanced", track: "Backend", plannedLessons: 8,
    description: "One repo, one agent product: Spring Boot AI services, streaming to React, tool endpoints and auth — ship a full-stack agent from database to UI." },
  { title: "Python, Pandas, ML & GenAI for E-Commerce", level: "Intermediate", track: "Data", plannedLessons: 8,
    description: "Analyze, predict and generate: pandas for storefront data, scikit-learn basics for churn and basket analysis, then a GenAI layer — Python end to end for e-commerce." },
];

/** Batch items normalized with derived duration + tags (as seeded). */
export function courseBatch2Seeded(): SeedItem[] {
  return COURSE_BATCH_2.map((item) => ({
    ...item,
    duration: lessonDuration(item.plannedLessons ?? 10),
    tags: `course,${(item.track ?? "").toLowerCase().replace(/\//g, "")}`,
  }));
}
