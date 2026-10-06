# DevPath — Developer Learning Platform

> Masterclass → Roadmaps → Courses → Resources → Simulators.
> One cohesive system for learning modern software development.

DevPath is a full-stack learning platform for developers: deep masterclasses, career
roadmaps, focused mini-courses with real lessons (not placeholders), practical
reference guides, and **interactive in-browser simulators** (SQL, JavaScript, Git,
HTTP, Flexbox). Learners read lessons, run live examples, solve exercises with
progressive hints, take quizzes, pass final assessments, and complete capstone
projects — with progress, XP, and analytics tracked throughout.

![Next.js](https://img.shields.io/badge/Next.js-16-black)
![TypeScript](https://img.shields.io/badge/TypeScript-5-3178C6)
![Tailwind CSS](https://img.shields.io/badge/Tailwind-4-06B6D4)
![Prisma](https://img.shields.io/badge/Prisma-6-2D3748)
![SQLite](https://img.shields.io/badge/SQLite-3-003B57)

## ✨ Features

- **📚 Real course content** — every published course ships full lessons: objectives,
  explanations, runnable code, diagrams, exercises with hints + solutions, quizzes
  with explanations, summaries, a final assessment, a capstone project, and
  interview Q&A.
- **🧪 Interactive simulators** — SQL Query Sandbox, JavaScript Playground,
  Git History Playground (live commit DAG), HTTP Lab, Flexbox Simulator.
  Lesson `practice` blocks deep-link straight into the right simulator.
- **🗺️ Career roadmaps & tracks** — Frontend, Backend, Data, DA/DS, AI, SDET, Tools;
  prerequisite chains in `docs/LEARNING_PATHS.md`.
- **🔍 Instant search** — ⌘K command palette across courses, lessons, and simulators.
- **📊 Analytics dashboards** — learner progress/XP/streaks plus an admin console
  with KPIs, engagement charts, top content, and a learning funnel
  (`GET /api/analytics?view=dashboard&range=7d|30d|90d`).
- **🛠️ Admin console** — edit courses, lessons, quizzes, publishing state, and
  catalog metadata without touching code.
- **🌙 Dark-mode-first design** — flawless light mode, Space Grotesk display type,
  glassmorphism chrome, Framer Motion micro-interactions.

## 🧱 How content works (course-first engine)

```
Course → Curriculum (Lessons) → Exercise → Hints → Solution → Quiz
       → Final Assessment → Capstone Project → Interview Q&A
```

- Versioned source of truth: `content/courses/<slug>/course.json` + `lessons/*.json`
- Synced into the DB with `bun content/seed-courses.ts` (idempotent upserts;
  catalog entries in `ResourceItem` are never touched)
- `lessonCount`, `totalMinutes`, `xpTotal` are **always calculated** from lesson
  records — never maintained by hand
- Live records remain editable via the admin Lessons editor

## 🛠️ Tech stack

| Layer      | Choice                                              |
| ---------- | --------------------------------------------------- |
| Framework  | Next.js 16 App Router, React 19, TypeScript strict  |
| Styling    | Tailwind CSS v4, shadcn/ui (Radix), next-themes     |
| Charts     | recharts (`src/components/charts/*` primitives)     |
| Motion     | Framer Motion (reduced-motion aware)                |
| Data       | Prisma 6 + SQLite, TanStack Query, zustand stores   |
| Validation | Zod on all API inputs                               |

## 🚀 Quickstart

Prerequisites: [Bun](https://bun.sh) 1.2+.

```bash
# 1. Install
bun install

# 2. Configure — create a `.env` file:
# DATABASE_URL="file:./db/dev.db"
# ADMIN_PASSWORD="choose-a-strong-password"

# 3. Database + catalog seed
bunx prisma db push
bun prisma/seed.ts          # categories, catalog items, roadmaps, simulators

# 4. Course content seed (repeat any time content/*.json changes)
bun content/seed-courses.ts

# 5. Run
bun run dev                 # http://localhost:3000
```

Production:

```bash
bun run build
bun run start
```

## 📁 Project structure

```
content/courses/<slug>/   versioned course.json + lessons/*.json (source of truth)
content/seed-courses.ts   idempotent content → DB sync
prisma/seed.ts            catalog, roadmaps, simulators, tracks
src/app/                 routes: home, explorer, course, lesson, library, admin + /api
src/components/charts/   ChartCard, StatKpi, ProgressRing, ActivityHeatmap, …
src/components/platform/ HomeView, CourseView, lesson renderer, simulators, admin
src/components/lesson/   exercise / quiz / block UI
src/lib/                 courses, platform, tracks, simulators, analytics, stores
docs/                    catalog audit, learning paths, overhaul prompt
```

## ✍️ Authoring a course

1. Add `content/courses/<your-slug>/course.json` (subtitle, audience, outcomes,
   `prereqSlugs`, technologies, skills, assessment, project, interview Q&A).
2. Add `lessons/01-*.json … N-*.json` — objective, why, blocks, exercise
   (prompt + 3 hints + solution + why), quiz (4+ questions with explanations),
   summary, next.
3. `bun content/seed-courses.ts` and open `/?course=<your-slug>`.
4. Keep `contentStatus: "draft"` until the course passes the checklist in
   `docs/WEBSITE_OVERHAUL_PROMPT.md` §8 spirit: no placeholders, code verified,
   quizzes explained, assessment + project included.

Block types the renderer supports: `h, p, list, callout, code, table, diagram,
keytakeaways, interview, practice`.

## 📈 Analytics events

First-party, rate-limited `POST /api/analytics` with types:
`category_view, card_click, item_view, search, simulator_view,
challenge_complete, sandbox_deep_link, lesson_view, lesson_complete,
quiz_attempt, assessment_pass`. Aggregations feed both the learner dashboard
and the admin console.

## 🔑 Admin access

Open the admin console in the app and sign in with `ADMIN_PASSWORD`
(header `x-admin-key` also works for API access).

## 📜 Available scripts

| Command                  | What it does                              |
| ------------------------ | ----------------------------------------- |
| `bun run dev`            | Dev server on :3000                       |
| `bun run build` / `start`| Production build / serve                  |
| `bun run lint`           | ESLint                                    |
| `bunx tsc --noEmit`      | Typecheck                                 |
| `bunx prisma db push`    | Sync schema to SQLite                     |
| `bun prisma/seed.ts`     | Seed catalog content                      |
| `bun content/seed-courses.ts` | Sync course JSON into the DB         |

## 📖 Docs

- `docs/COURSE_CATALOG_AUDIT.md` — full 85-course catalog truth table
- `docs/LEARNING_PATHS.md` — prerequisite graph & recommended order
- `docs/WEBSITE_OVERHAUL_PROMPT.md` — visual/design master spec

## 🤝 Contributing

1. Create a feature branch from `main`.
2. Keep content and UI changes in separate commits (content = `feat(content): …`).
3. Verify `bunx tsc --noEmit`, `bun run lint`, and `bunx next build` before pushing.
4. Never commit `.env`, `*.db`, or local tool artifacts (already git-ignored).
