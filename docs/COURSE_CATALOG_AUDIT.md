# Course Catalog Audit — DevPath

Audited: 2026-10-06 (updated same day: second course batch + tracks) · Source of truth: `prisma/seed.ts` + `prisma/course-batch-2.ts` + live `/api/resources?category=courses`
Reference pattern studied: resources.criodo.com/?tab=courses (product pattern only — all DevPath
content is independently authored; no proprietary text, examples, quizzes or branding copied).

## Totals

- **85 published courses** (+1 draft: Zig Fundamentals) in the `courses` category:
  44 original + **41 added in the 2026-10-06 user-specified batch** (SQL Fundamentals, Node.js
  Fundamentals and Docker Fundamentals already existed and were updated in place — Docker as
  "Docker Foundations" — instead of duplicated).
- Every course now carries a **learning track** (DB `track` column) and a **planned lesson count**
  (`plannedLessons`): Frontend 21 · Backend 27 · Data 7 · DA/DS 3 · AI 9 · SDET 7 · Tools 11.
  Tracks power the Courses explorer filter chips, card/dialog/search chips, admin editing and
  the CSV export; search matches track names too ("backend" finds the Backend track).
- Course content status: **2 of 85 have complete lesson content today**
  (`typescript-in-2-hours`, 8 lessons + final assessment + capstone project;
  `sql-fundamentals`, 10 lessons + 12-question assessment + capstone project +
  49 lesson quiz questions, 192 minutes, 765 XP — every example query runs in
  the SQL Query Sandbox via the `practice` block deep-links). The remaining 83
  are catalog entries awaiting content — the content engine
  (`Course`/`Lesson` models + APIs + renderer) is built and each new course is
  ~1 content file away.

## Second batch (2026-10-06) — user-specified additions

All catalog-only (planned lessons from the user's list; durations derived at ~15 min/lesson):

SQL Intermediate (DA/DS 10) · SQL Advanced (DA/DS 10) · OpenDataLoader PDF (AI 5) ·
API Testing with Postman (SDET 10) · TypeScript Fundamentals (Frontend 10) ·
Git for Beginners: Visual Learning (Tools 10) · Build an AI Interview Coach with LangChain
(Backend 8) · Interactive React Workshop (Frontend 10) · React Fundamentals (Frontend 9) ·
Tailwind CSS Fundamentals (Frontend 10) · DSA Fundamentals by Visualization (Backend 10) ·
Low Level Design (Backend 4) · AI for Backend Developers (Backend 6) · High Level Design
(Backend 10) · Data Visualization & Analysis (Data 11) · Database Sharding (Backend 6) ·
Circuit Breaker Pattern (Backend 5) · CQRS & Event Sourcing (Backend 6) ·
Load Balancing Strategies (Backend 5) · Distributed Caching (Backend 6) ·
Consensus Algorithms (Backend 5) · Database Indexing Deep Dive (Backend 5) ·
SQL Window Functions (Data 6) · GraphQL vs REST (Backend 6) · WebSocket Essentials (Backend 5) ·
OAuth 2.0 & OIDC (Backend 6) · Webhook Design Patterns (Backend 5) ·
LangGraph for E-commerce (AI 10) · CrewAI: E-commerce Agent Teams (AI 10) ·
RAG Agents for E-commerce (AI 10) · MCP & Tool Use for E-commerce (AI 10) ·
Production AI Agents (AI 10) · Agent Harnesses for Developers (AI 10) ·
Prompt Engineering 101 (AI 10) · Selenium WebDriver for E-Commerce Testing (SDET 10) ·
Playwright for E-Commerce Testing (SDET 10) · JMeter Performance Testing for E-Commerce
(SDET 10) · E-Commerce Test Automation: The Practitioner's Playbook (SDET 9) ·
Spring AI for E-Commerce (AI 8) · Full-Stack AI Agents: Java, Spring Boot & React (Backend 8) ·
Python, Pandas, ML & GenAI for E-Commerce (Data 8)

Track normalization applied: the batch's "AI/ML" label maps to the **AI** track.
Batch data lives in `prisma/course-batch-2.ts` (shared by seed + the idempotent live
patch `content/patches/add-course-batch-2.ts`).

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
7 | **JavaScript Basics Refresher** | Intermediate | **8** | HTML | **COMPLETE — 8 lessons, 218 blocks, 40 quiz questions, 151 min, 600 XP, 12-question assessment, DevPath Study Pipeline capstone, interview Q&A, 6 js-playground practice deep-links**
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
21 | **SQL Fundamentals** | Intermediate | **10** | — | **COMPLETE — 10 lessons, 49 quiz questions, 12-question assessment, Engagement Report capstone, interview Q&A, sandbox practice deep-links**
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

1. **Docker Foundations** — featured course; pairs with Docker Compose.
2. **React Hooks / Interactive React Workshop** — frontend track depth.
3. **Interactive React Workshop / React Fundamentals / Tailwind CSS Fundamentals** —
   the user-specified Frontend cluster.
4. Then breadth: Node.js Fundamentals → CSS Flexbox (pairs with the Flexbox
   simulator) → REST API Design (pairs with the HTTP Lab simulator) → Modern
   JavaScript ES2024 (now has a completed upstream course in JS Basics).

Completed content: TypeScript in 2 Hours (✅ course 1), SQL Fundamentals (✅ course 2 —
pairs with the SQL Query Sandbox; its lessons deep-link practice queries into the sandbox
with `?q=` pre-fill), JavaScript Basics Refresher (✅ course 3 — pairs with the NEW
JavaScript Playground simulator; its 6 practice blocks deep-link snippets into the
playground with `?q=` pre-fill; the practice-block `sim` field routes blocks to any
registered simulator), **Git for Beginners: Visual Learning (✅ course 4 — 10 lessons,
250 content blocks, 30 diagrams, 40 quiz questions, 179 min, 705 XP, 12-question
assessment (70%), DevPath Git Journal capstone, 6 interview Q&As, 8 practice blocks
deep-linking command scripts into the NEW Git History Playground simulator with `?q=`
pre-fill; the playground renders a live commit DAG + classic ASCII `log --graph`)**.
