# DEVPATH — FULL WEBSITE VISUAL OVERHAUL PROMPT
## Goal: turn the existing functional learning platform into a stunning, award-caliber product

You are a senior product designer + senior frontend engineer. Redesign and rebuild
the ENTIRE DevPath learning platform UI so it looks and feels like a premium,
modern education product (think Linear × Stripe × Vercel aesthetics). The backend,
content engine, database schema, and API routes already work — DO NOT break them.
This is a frontend/visual transformation task with real data visualizations throughout.

## 0. HARD CONSTRAINTS (non-negotiable)
- Stack: Next.js 16 App Router, React 19, TypeScript (strict), Tailwind CSS v4,
  shadcn/ui (Radix), recharts (already installed), framer-motion (already installed),
  next-themes, lucide-react. Do NOT introduce new chart libraries or CSS frameworks.
- Do NOT change: Prisma schema, API route contracts, content JSON shape
  (content/courses/<slug>/course.json + lessons/*.json), seed scripts, or lesson-block
  renderer types (h, p, list, callout, code, table, diagram, keytakeaways, interview, practice).
- All data displayed must come from real sources: existing API routes, Prisma via
  server components/actions, and the library-store (zustand). NO lorem ipsum, NO
  hardcoded fake stats. If an endpoint is missing a field you need, add it to the
  existing API route and document it.
- `bun run build` (next build) and `bun run lint` must pass. Fix all TS/ESLint errors.
- Keep every existing route and feature working: home, category hub/explorer,
  course detail + curriculum, lesson view + quizzes + exercises, all 5 simulators
  (SQL Lab, JS Playground, Git Playground, HTTP Lab, Flexbox Simulator),
  My Library, global search (cmdk), admin panel, auth.

## 1. DESIGN SYSTEM (build once, use everywhere)
1.1 Theme: full dark-mode-first design with a flawless light mode (next-themes,
    class strategy, no FOUC). Persisted toggle in the header.
1.2 Palette: define CSS variables — a near-black background (#0A0A0F family),
    one primary accent (electric emerald), one secondary accent,
    per-track colors for course tracks (Frontend rose, Backend emerald, Data teal,
    DA/DS orange, AI fuchsia, SDET amber, Tools violet). Charts must reuse these
    exact track colors so the whole product feels coherent.
1.3 Typography: a distinctive display font for headings (Space Grotesk)
    + Inter/Geist for body + JetBrains Mono/Geist Mono for code/labels. Fluid type scale,
    generous whitespace, max-w reading measures for lesson prose.
1.4 Signature style: subtle grid/dot backgrounds, glassmorphism cards, gradient
    mesh glows on hero sections, 1px borders with soft shadows, rounded-2xl cards,
    skeleton loaders for every async surface, empty states with illustrations
    (CSS/SVG only) and a clear CTA — never a blank page.
1.5 Motion: framer-motion page transitions, staggered card entrances, animated
    counters, scroll-triggered reveals, hover lift + glow on cards, animated
    progress rings/bars, smooth accordion curriculum. Respect
    prefers-reduced-motion. No janky layout shift (reserve chart heights).

## 2. GLOBAL CHROME
- Sticky glassmorphic SiteHeader: logo, nav (Home, Courses, Simulators, Roadmaps),
  global search trigger (⌘K), theme toggle, library shortcut, auth state.
- Command-palette search with grouped results (courses, lessons, simulators),
  keyboard navigation, recent searches.
- Footer with product columns, track links, and a live "platform stats" strip
  (real counts from the DB: courses, lessons, simulators).
- Global toast system for quiz/assessment/library actions.

## 3. PAGE-BY-PAGE SPEC
3.1 HOME — a landing page that sells the platform:
    Hero with animated headline, live platform stats (animated counters from real
    DB counts), CTA to explorer; "learning tracks" rail with per-track cards and
    counts; featured courses carousel; "how it works" (Course → Lesson → Exercise
    → Quiz → Assessment → Project) visual stepper; testimonials-style learner
    outcomes strip; final CTA band. Fully responsive.
3.2 COURSES EXPLORER — the catalog homepage:
    Filter chips per track + difficulty + search + sort; animated card grid
    (cover gradient per track, level badge, lesson count, XP, rating/progress);
    hover preview popover; skeleton loading; result counts; deep-linkable filters
    via URL params.
3.3 COURSE DETAIL — curriculum page:
    Hero band with course meta, outcomes checklist, prerequisite links,
    tech/skill pills; a visual curriculum timeline (numbered lesson nodes with
    status: locked/available/done, XP per lesson); sidebar with progress ring,
    "continue learning" resume button, final assessment + capstone project cards,
    interview Q&A accordion. Progress computed from real lesson records.
3.4 LESSON VIEW — the reading experience:
    Distraction-free centered column, sticky lesson sidebar (TOC from blocks +
    prev/next), learning-objective callout, beautifully rendered blocks
    (syntax-highlighted code with copy button + filename captions, styled tables,
    callouts, diagrams as polished SVG flow visuals, key-takeaway cards),
    "Try it yourself" exercise card with progressive hint reveal (Show Hint 1/2/3)
    + solution toggle + "why this works", quiz cards with instant feedback +
    explanations + score, lesson summary, prev/next navigation, mark-complete
    with XP toast + confetti-lite animation.
3.5 SIMULATORS — each gets a branded landing header + the interactive tool:
    SQL Lab (schema explorer + query editor + results table + saved queries),
    JS Playground (editor + console + examples), Git Playground (terminal +
    visual commit-graph canvas), HTTP Lab (request builder + response inspector
    + status-code reference), Flexbox Simulator (visual controls + live preview
    + generated CSS). Add usage hints and example presets.
3.6 MY LIBRARY / DASHBOARD — the analytics heart (see §4).
3.7 ADMIN PANEL — content + analytics console (see §4).
3.8 AUTH + MISC — polished sign-in, 404, error boundaries, loading skeletons.

## 4. GRAPHS & CHARTS (recharts — a first-class requirement, not decoration)
Every chart: responsive container with fixed-height parent, custom tooltip matching
the theme, empty state when no data, tooltips with real values, accessible labels.
4.1 LEARNER DASHBOARD (My Library):
    - Donut: overall completion across enrolled courses.
    - Area/line: XP earned over time (last 14/30 days, range toggle).
    - Bar: lessons completed per track (track colors).
    - Radial or streak heatmap: daily activity (GitHub-style contribution grid).
    - Per-course progress bars with % + "resume" actions.
    - Quiz performance: average score trend line + per-course accuracy bars.
4.2 ADMIN ANALYTICS:
    - KPI cards with sparklines (total learners, lessons completed, quiz attempts,
      assessment passes, simulator sessions) + delta vs previous period.
    - Line/area: engagement over time (filterable: 7d / 30d / 90d).
    - Bar: most-viewed courses and most-used simulators (from AnalyticsEvent).
    - Funnel-ish stepped visual: started → lesson complete → quiz pass → assessment pass.
    - Table: recent events with search/filter (reuse @tanstack/react-table).
4.3 COURSE-LEVEL VISUALS:
    - Curriculum timeline with completion states; difficulty distribution mini-bars;
      lesson XP stacked bar; assessment score gauge (passScore marker at 70%).
4.4 CONTENT-EMBEDDED DIAGRAMS:
    - Render `diagram` lesson blocks as styled node-flow SVGs (numbered steps,
      connecting line, caption) — never raw text lists.
4.5 Data layer: add/extend lightweight aggregation API routes (e.g.
    /api/analytics/summary, /api/library/stats) returning pre-bucketed series;
    charts consume via @tanstack/react-query with caching + skeletons.

## 5. COMPONENT & CODE QUALITY
- Reusable chart primitives: <ChartCard>, <ChartEmpty>, <ChartTooltip>,
  <StatKpi>, <ProgressRing>, <ActivityHeatmap> in src/components/charts/.
- Reusable content primitives already exist — restyle, don't fork them.
- Server components for data fetching, client components only at interactivity
  boundaries. No fetch waterfalls; parallelize with Promise.all.
- Images via next/image; SVG icons via lucide only.

## 6. RESPONSIVE + ACCESSIBILITY + PERFORMANCE
- Mobile-first: bottom-nav or hamburger under lg, charts stack and remain legible,
  tables become cards, touch targets ≥ 44px.
- a11y: semantic landmarks, focus-visible rings, aria labels on all charts
  (recharts accessibilityLayer), keyboard-operable palette/dialogs/quiz,
  color-contrast AA in both themes.
- Performance: dynamic-import heavy simulators/charts, route-level loading.tsx,
  avoid CLS, keep initial JS lean.

## 7. EXECUTION ORDER (do it in this sequence, verifying build after each)
  1) Design tokens + globals.css + theme + fonts + header/footer/chrome.
  2) src/components/charts/* primitives + analytics API routes.
  3) Home + Courses explorer.
  4) Course detail + Lesson view (block renderer restyle + exercise/quiz cards).
  5) Dashboard (My Library) + Admin analytics.
  6) Simulator landing headers + polish.
  7) Search palette, auth pages, 404/loading/empty states, final responsive +
     a11y + performance pass.

## 8. DEFINITION OF DONE (verify each before finishing)
[ ] All routes render in dark AND light mode with no visual bugs.
[ ] Every chart renders real data, has loading + empty states, and is responsive.
[ ] Zero lorem ipsum / hardcoded stats anywhere (grep to prove it).
[ ] Lesson flow works end-to-end: read → exercise + hints → quiz → complete → XP.
[ ] Simulators fully functional and visually consistent with the new system.
[ ] `next build` + `eslint` pass; no TS `any` leaks in new code.
[ ] Mobile (360px), tablet (768px), desktop (1440px) checked.
[ ] Brief summary of what changed + screenshots-worthy highlights listed.
