# Course Catalog Audit — DevPath

Audited: 2026-10-06 · Source of truth: `prisma/seed.ts` + live `/api/resources?category=courses`
Reference pattern studied: resources.criodo.com/?tab=courses (product pattern only — all DevPath
content is independently authored; no proprietary text, examples, quizzes or branding copied).

## Totals

- **44 published courses** (+1 draft: Zig Fundamentals) in the `courses` category.
- Level split: 22 Beginner / 11 Intermediate / 11 Advanced (seed cycles levels).
- Course content status: **1 of 44 has complete lesson content today** (`typescript-in-2-hours`,
  8 lessons + final assessment + capstone project). The remaining 43 are catalog entries
  awaiting content — the content engine (`Course`/`Lesson` models + APIs + renderer) is built
  and each new course is ~1 content file away.

## Domain grouping (from the discovered catalog)

| Domain | Courses |
| --- | --- |
| **Frontend foundations** | HTML Semantics in 1 Hour, CSS Flexbox Deep Dive, CSS Grid Layout Crash Course, Responsive Design Fundamentals |
| **JavaScript / TypeScript** | JavaScript Basics Refresher, Modern JavaScript (ES2024), Async JavaScript & Promises, TypeScript in 2 Hours |
| **Frontend frameworks** | React Hooks Fundamentals, React State Patterns, Next.js App Router Quickstart, Tailwind CSS in 90 Minutes, Vue 3 Essentials, SvelteKit Fast Track |
| **Backend** | Node.js Fundamentals, Express API Quickstart, REST API Design Basics, GraphQL Basics, WebSockets & Real-Time Apps, WebRTC Fundamentals |
| **Databases / data** | SQL Fundamentals, PostgreSQL Quickstart, MongoDB in 2 Hours, Prisma ORM Crash Course, Redis & Caching Basics |
| **DevOps / infrastructure** | Docker Foundations, Docker Compose in Practice, Kubernetes Basics, CI/CD with GitHub Actions, Terraform Basics, AWS Fundamentals |
| **Systems / tooling** | Linux for Developers, Bash Scripting Basics, Git & GitHub Foundations, Command Line Basics |
| **Programming languages** | Python Fundamentals, Go Basics for JS Devs, Rust Absolute Basics, (Zig Fundamentals — draft) |
| **Quality / professional** | Testing with Vitest, Playwright End-to-End Testing, Accessibility (a11y) Basics, Web Performance Basics, SEO for Developers, Security Basics (OWASP Top 10) |

## Full catalog table

# | Course | Level | Planned lessons | Prerequisites | Content status
--- | --- | --- | --- | --- | ---
1 | Git & GitHub Foundations | Beginner | 8 | Command Line Basics (co-taught) | catalog only
2 | Command Line Basics | Beginner | 6 | — | catalog only
3 | HTML Semantics in 1 Hour | Beginner | 5 | — | catalog only
4 | CSS Flexbox Deep Dive | Beginner | 8 | HTML Semantics | catalog only
5 | CSS Grid Layout Crash Course | Advanced | 8 | CSS Flexbox Deep Dive | catalog only
6 | Responsive Design Fundamentals | Beginner | 8 | CSS Grid/Flexbox | catalog only
7 | JavaScript Basics Refresher | Intermediate | 8 | HTML | catalog only
8 | Modern JavaScript (ES2024) | Beginner | 9 | JavaScript Basics | catalog only
9 | Async JavaScript & Promises | Beginner | 9 | Modern JavaScript | catalog only
10 | **TypeScript in 2 Hours** | Intermediate | **8** | JavaScript Basics Refresher | **COMPLETE — 8 lessons, 39 quiz questions, 12-question assessment, capstone project, interview Q&A**
11 | React Hooks Fundamentals | Intermediate | 9 | Modern JavaScript | catalog only
12 | React State Patterns | Advanced | 10 | React Hooks Fundamentals | catalog only
13 | Next.js App Router Quickstart | Beginner | 9 | React Hooks | catalog only
14 | Tailwind CSS in 90 Minutes | Intermediate | 6 | CSS basics | catalog only
15 | Vue 3 Essentials | Advanced | 8 | Modern JavaScript | catalog only
16 | SvelteKit Fast Track | Beginner | 7 | Modern JavaScript | catalog only
17 | Node.js Fundamentals | Intermediate | 9 | Modern JavaScript | catalog only
18 | Express API Quickstart | Intermediate | 8 | Node.js Fundamentals | catalog only
19 | REST API Design Basics | Intermediate | 8 | Express API Quickstart | catalog only
20 | GraphQL Basics | Intermediate | 7 | REST API Design Basics | catalog only
21 | SQL Fundamentals | Intermediate | 10 | — | catalog only
22 | PostgreSQL Quickstart | Beginner | 7 | SQL Fundamentals | catalog only
23 | MongoDB in 2 Hours | Beginner | 7 | — | catalog only
24 | Prisma ORM Crash Course | Advanced | 8 | SQL Fundamentals, Node.js | catalog only
25 | Redis & Caching Basics | Beginner | 6 | — | catalog only
26 | Docker Foundations | Intermediate | 9 | Command Line Basics | catalog only
27 | Docker Compose in Practice | Advanced | 7 | Docker Foundations | catalog only
28 | Kubernetes Basics | Beginner | 10 | Docker Compose in Practice | catalog only
29 | CI/CD with GitHub Actions | Beginner | 8 | Git & GitHub Foundations | catalog only
30 | Terraform Basics | Intermediate | 8 | AWS Fundamentals | catalog only
31 | AWS Fundamentals | Advanced | 10 | — | catalog only
32 | Linux for Developers | Intermediate | 9 | — | catalog only
33 | Bash Scripting Basics | Beginner | 7 | Linux for Developers | catalog only
34 | Python Fundamentals | Intermediate | 10 | — | catalog only
35 | Go Basics for JS Devs | Advanced | 8 | JavaScript or Python | catalog only
36 | Rust Absolute Basics | Beginner | 8 | — | catalog only
37 | Testing with Vitest | Advanced | 8 | Modern JavaScript | catalog only
38 | Playwright End-to-End Testing | Beginner | 8 | Testing with Vitest | catalog only
39 | Accessibility (a11y) Basics | Intermediate | 6 | HTML | catalog only
40 | Web Performance Basics | Advanced | 7 | — | catalog only
41 | SEO for Developers | Beginner | 6 | HTML | catalog only
42 | Security Basics (OWASP Top 10) | Beginner | 10 | — | catalog only
43 | WebSockets & Real-Time Apps | Intermediate | 7 | Node.js Fundamentals | catalog only
44 | WebRTC Fundamentals | Advanced | 6 | WebSockets & Real-Time Apps | catalog only
(draft) | Zig Fundamentals | Intermediate | — | — | unpublished draft

Lesson counts follow the topic-depth rule (focused topic 4–6, normal mini-course 8–10,
broader 10–14). Counts are planned — final counts match actual authored content.

## Content coverage priorities (next-phase order)

1. **JavaScript Basics Refresher** — direct prerequisite of the completed TypeScript course;
   the highest-traffic gap (search "javascript" lands on it today with catalog-level depth).
2. **SQL Fundamentals** — pairs with the live SQL Query Sandbox simulator (cross-category
   reinforcement; lesson exercises can point at the sandbox).
3. **Git & GitHub Foundations** — #1 featured course in the category, universal need.
4. **Docker Foundations** — second featured course; pairs with Docker Compose.
5. Then breadth: React Hooks → Node.js Fundamentals → CSS Flexbox (pairs with the Flexbox
   simulator) → REST API Design (pairs with the HTTP Lab simulator).
