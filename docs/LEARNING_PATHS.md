# Learning Paths — DevPath Course Dependency Graph

Structured prerequisite relationships between courses. These live in structured data
(`Course.prereqSlugs` in the database, seeded from `content/courses/*/course.json`) and
render as links on each course overview page. Take the courses in arrow order.

## Path 1 — Modern Frontend Developer

```
Command Line Basics
      ↓
HTML Semantics in 1 Hour
      ↓
CSS Flexbox Deep Dive ──→ CSS Grid Layout Crash Course
      ↓                          ↓
Responsive Design Fundamentals ←──┘
      ↓
JavaScript Basics Refresher
      ↓
Modern JavaScript (ES2024)
      ↓
Async JavaScript & Promises
      ↓
TypeScript in 2 Hours  ✅ (content complete)
      ↓
React Hooks Fundamentals
      ↓
React State Patterns
      ↓
Next.js App Router Quickstart
      ↓
Testing with Vitest → Playwright End-to-End Testing
```

Tailwind CSS in 90 Minutes slots alongside the framework stage (after Responsive Design).
Vue 3 Essentials / SvelteKit Fast Track are framework-alternative branches after Modern
JavaScript. Accessibility (a11y) Basics and Web Performance Basics attach at the end of any
frontend path.

## Path 2 — Backend / API Engineer

```
Command Line Basics
      ↓
Modern JavaScript (ES2024)
      ↓
Node.js Fundamentals
      ↓
Express API Quickstart
      ↓
REST API Design Basics ──→ GraphQL Basics
      ↓
SQL Fundamentals ──→ PostgreSQL Quickstart
      ↓
Prisma ORM Crash Course (needs SQL + Node)
      ↓
Redis & Caching Basics
      ↓
WebSockets & Real-Time Apps → WebRTC Fundamentals
      ↓
Security Basics (OWASP Top 10)
```

## Path 3 — Data / Database Track

```
SQL Fundamentals
      ↓
PostgreSQL Quickstart
      ↓
Prisma ORM Crash Course
      ↓
Redis & Caching Basics
```

(MongoDB in 2 Hours is a document-store branch off SQL Fundamentals with no dependency.)

## Path 4 — DevOps / Platform Track

```
Command Line Basics
      ↓
Linux for Developers
      ↓
Bash Scripting Basics
      ↓
Git & GitHub Foundations
      ↓
Docker Foundations
      ↓
Docker Compose in Practice
      ↓
Kubernetes Basics
      ↓
AWS Fundamentals
      ↓
Terraform Basics
      ↓
CI/CD with GitHub Actions
```

## Path 5 — Polyglot Programmer

```
Python Fundamentals
      ↓
Go Basics for JS Devs (needs prior JS)
      ↓
Rust Absolute Basics
```

Each language course is also independently enterable; the arrows express the recommended
order (dynamic → simple static → strict systems languages).

## Course-first content engine

The engine implemented this round follows the flow:

`Course → Curriculum → Lesson → Exercise → Hint → Solution → Quiz → Final Assessment → Project`

- Course metadata, outcomes, prerequisites, assessment, project and interview Q&A live in
  the `Course` table; lessons (objective, why, content blocks, exercise, quiz, summary)
  live in the `Lesson` table — both keyed to the catalog item's slug.
- Initial content is versioned in `content/courses/<slug>/` (`course.json` +
  `lessons/*.json`) and upserted into the DB with `bun content/seed-courses.ts`.
- Live records are editable in the admin console (Lessons editor) without code changes;
  `lessonCount`, `totalMinutes` and `xpTotal` are always calculated from lesson records,
  never maintained by hand.
- Learner progress (`/?course=<slug>&lesson=N`) is computed from actual completed-lesson
  records in the library store; the final assessment gates course completion at 70%.
