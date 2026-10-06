# DevPath — Platform Category Hub · Worklog

---
Task ID: 1
Agent: Z.ai Code (main agent)
Task: Build the Platform Category Hub — a five-category resource navigation system (Masterclass / Roadmaps / Courses / Resources / Simulators) as the core information architecture of a database-driven learning platform.

Work Log:
- Explored existing scaffold (Next.js 16 + App Router, Tailwind 4, shadcn/ui, Prisma/SQLite, TanStack Query, framer-motion, next-themes all available).
- Defined Prisma schema (`prisma/schema.prisma`): `Category` (slug, title, tagline, description, countLabel, icon, route, badge, badgeVariant, accent, order, enabled, seo fields), `ResourceItem` (title, description, level, duration, tags, published, featured, views, order + categoryId FK), `AnalyticsEvent` (type, slug, label). Pushed with `bun run db:push`.
- Generated 5 original category icons via image-generation skill (flat vector, dark charcoal background, distinct accent per category) into `/public/icons/{slug}/icon.jpg` (renamed from .png because the generator emits JPEG data). No hotlinked external assets.
- Wrote and ran `prisma/seed.ts`: 15 published masterclass workshops, 11 roadmaps, 44 mini courses (+1 draft), 27 guides (+1 draft), 4 simulator drafts (unpublished → hub shows only the "New" badge). Seeded counts exactly match the reference values.
- Built the API layer (all data/config flows through APIs, no server actions):
  - `GET /api/categories` — categories with DB-derived published counts, honors `enabled` + `order`.
  - `PATCH /api/categories/[id]` — admin: title/tagline/countLabel/badge/badgeVariant/icon/order/enabled.
  - `GET /api/resources` — search (`q`), level filter, sort (featured/popular/newest/az), category filter; `all=1` + admin key includes drafts.
  - `POST /api/resources` — admin creates items (auto-unique slug); `PATCH/DELETE /api/resources/[id]` — publish/feature/edit/delete.
  - `POST /api/admin/auth` — password gate (ADMIN_PASSWORD env, default `devpath-admin`); admin APIs check `x-admin-key` header (401 otherwise).
  - `POST /api/analytics` — events (category_view / card_click / item_view / search); item_view also increments item views; `GET /api/analytics` — admin summary (per-category views, per-type counts, recent events).
- Built the frontend on the single `/` route with URL-driven view routing (sandbox constraint: only `/` is user-visible):
  - `/` → landing: hero + Category Hub + Editor's picks + CTA band.
  - `/?category=slug` → the category's real application section (explorer). Canonical `route` values (`/masterclass` etc.) are stored in the DB and shown as route chips; in-app navigation uses the query-param form of the same route.
  - `/?category=slug&item=slug` → deep link that auto-opens the item dialog.
  - `/?view=admin` → admin console.
- `ResourceCategoryCard` (`src/components/platform/ResourceCategoryCard.tsx`): fully prop-driven reusable component (title, description, count, icon, href, badge, badgeVariant, accent, onNavigate, index). Count string is split so the number is emphasized; badge is a genuine shadcn `Badge`; whole card is a `next/link` (keyboard focusable, focus-visible ring); hover = lift + accent glow + icon scale + arrow slide; next/image with width/height via fill container, `sizes`, alt text; framer-motion staggered entrance.
- `CategoryHub` renders cards from the live `useCategories` query (SSR-seeded via initialData + setQueryData sync) — never hardcoded in JSX. Includes the IA strip (Masterclass → Roadmaps → Courses → Resources → Simulators).
- `CategoryExplorer`: breadcrumb, category header (icon, title, badge, route chip, live count line), debounced search, level ToggleGroup, sort Select, skeleton loading, item grid, empty/coming-soon states, item detail dialog.
- `GlobalSearch` (⌘K/Ctrl+K command palette): searches all items, grouped by category, deep-links on select.
- `AdminPanel`: auth gate (sessionStorage key) + 3 tabs — Categories (reorder ↑↓, enable/disable switch, editable countLabel + badge, live published/total counts), Content (search, category filter, publish/feature toggles, delete with confirm, add-content dialog), Analytics (event stats, per-category view bars, recent events feed).
- `SiteHeader` (sticky, backdrop blur, 5-category primary nav, search, theme toggle, admin link, mobile Sheet) + `SiteFooter` (mt-auto sticky footer, category links, live counts).
- SEO: dynamic `generateMetadata` per category from DB fields, JSON-LD WebSite+ItemList, semantic HTML (nav/main/section/ol), ARIA labels throughout, sr-only descriptions.
- Theme: next-themes dark default + light support; both verified visually.

Stage Summary (verification results — Agent Browser + VLM):
- Homepage renders 200, zero console errors/warnings after fixes. VLM QA: 9/10, "production-ready".
- Counts rendered from DB: 15 workshops / 11 career paths / 44 mini courses / 27 guides / Simulators "New" (no count). Confirmed via DOM text + a11y tree.
- Card click → `/?category=masterclass`, title/metadata adapt; search ("typescript") + Advanced filter combine correctly; item dialog + toast work; ⌘K palette search "docker" → deep link opens Docker Foundations dialog.
- Admin: login works (401 on wrong password); publishing a simulator draft made the hub card live-update to "1 simulators" (then reverted); editing countLabel "workshops"→"sessions" reflected in hub (then reverted); reorder moved Roadmaps above Masterclass across hub/nav/footer (then reverted); analytics tab shows recorded events.
- Fixed during QA: explorer state persistence across category switch (added `key={slug}` remount), deep-link dialog re-opening loop (handled-once ref), Sheet missing description warning (added sr-only SheetDescription), dialog aria-describedby wiring.
- Mobile (390px): cards stack, mobile Sheet nav with counts, no overflow. Footer sticks to bottom on short pages (min-h-screen flex col + mt-auto), pushed naturally on long pages. Keyboard: search input + toolbar tab order verified, card focus ring renders.

Key artifacts:
- `prisma/schema.prisma`, `prisma/seed.ts`, `src/lib/platform.ts` (server data layer), `src/lib/accent.ts` (accent theming map), `src/components/platform/*` (Providers, platform-data, ResourceCategoryCard, CategoryHub, HomeView, CategoryExplorer, ResourceItemCard, ItemDetailDialog, GlobalSearch, AdminPanel, SiteHeader, SiteFooter, PlatformShell), API routes under `src/app/api/{categories,resources,admin,analytics}`.
- Icons: `/public/icons/{masterclass,roadmaps,courses,resources,simulators}/icon.jpg`.

Unresolved issues / risks & next-phase priorities:
- Admin auth is demo-grade (shared password in header, default `devpath-admin`); upgrade to NextAuth credentials provider + session cookies.
- Route constraint: the sandbox exposes only `/`, so category routes are query-param based (`/?category=masterclass`) while canonical `/masterclass` strings live in the DB `route` field, ready to become real App Router segments when the constraint is lifted.
- Prisma client logs every query to dev.log (`log: ['query']` in `src/lib/db.ts`) — noisy; consider reducing.
- Next ideas: item detail pages with progress tracking, roadmap step-graph visualization, simulator embed page, sitemap.xml + per-category OG images, pagination/virtualization for 100+ items, admin bulk actions, rate limiting on public analytics POST.

---
Task ID: 2
Agent: Z.ai Code (cron webDevReview round 1)
Task: Scheduled 15-min review — QA the platform, fix issues, add features (My Library) and styling polish.

Work Log:
- Read worklog; assessed status: server healthy (all 200s), QA via agent-browser confirmed homepage / category / admin views render with zero console errors — platform stable, so this round focused on NEW FEATURES + STYLING per mandate.
- Quick fixes:
  - Prisma client logging reduced from `['query']` to `['warn','error']` (dev.log noise).
  - Added in-memory sliding-window rate limiter (`checkRateLimit` in `src/lib/platform.ts`) wired into POST /api/analytics — 90 events/min per client key, verified HTTP 429 fires at request #90; cleaned test events afterwards.
  - `GET /api/resources` now honors a `limit` query param (capped at 200).
- NEW FEATURE — My Library (personal learning tracker, all client-persisted):
  - `src/lib/library-store.ts`: zustand + persist("devpath-library") store — saved (bookmarks), completed, recent (max 10) with toggle/push helpers; `useLibraryHydrated()` implemented via `useSyncExternalStore` (server snapshot false / client true) to avoid SSR mismatch AND the new `react-hooks/set-state-in-effect` lint error.
  - `/?view=library` view (`MyLibraryView.tsx`): stats cards (Saved / In progress / Completed), "Jump back in" recent strip with clear-history, "Saved for later" grid, "Completed" grid, empty state with CTA; items resolved against live catalog via TanStack query.
  - Item cards: bookmark button (aria-pressed, amber filled state, stops propagation) + completed ✓ indicator; card restructured from `<button>` to `div[role=button]` so the nested bookmark `<button>` is valid HTML.
  - ItemDetailDialog: "Save for later" / "Mark complete" action buttons with toast feedback + accent states; auto-pushes opened items into `recent`.
  - SiteHeader: bookmark icon with live saved-count badge (desktop) + "My library" link in mobile sheet and footer.
  - Explorer toolbar: "Saved ⟨n⟩" filter toggle — filters results client-side; contextual empty state ("Nothing saved here yet").
  - Page metadata: `/?view=library` and `/?view=admin` get proper titles + noindex robots.
- NEW FEATURE — Home content sections:
  - "Trending now" (SSR: sort=popular limit=6) with Flame icon + SectionHeading component (accent bar + icon + trailing meta).
  - "Jump back in" personalized strip on home from library recents (only renders when history exists).
- STYLING POLISH:
  - Category + item cards: diagonal sheen sweep on hover; category cards got top accent hairline.
  - Hero: ambient `animate-pulse-slow` glows with stagger delay, top gradient hairline, underline accent on "level up".
  - "New" badge: pulsing dot via `animate-badge-glow` keyframe (genuine CSS, badge text unchanged).
  - Explorer toolbar: now sticky (top-20, backdrop-blur, shadow) so filters stay reachable while scrolling long grids — verified top:80px after scroll.
  - globals.css: slender custom scrollbars (webkit + firefox), `prefers-reduced-motion` kill-switch for all animations/transitions.
  - Dialog header: dot-grid texture overlay.

Stage Summary (verification results):
- agent-browser end-to-end: trending section renders (SSR items); item dialog → "Save for later" toggles to "Saved" + header badge shows amber "1"; `/?view=library` shows "1 tracked" pill + Jump back in + Saved for later; "Mark complete" → Completed section appears; explorer Saved filter → "11 career paths · 1 shown" with only the bookmarked item; sticky toolbar verified at top:80 after scrolling 900px; mobile 390px — no horizontal overflow, all sections stack.
- VLM QA scores: homepage 9/10 ("highly polished"), My Library 9/10, mobile sticky toolbar 9/10.
- ESLint: clean (after switching hydration gate to useSyncExternalStore). Console: zero errors/warnings across all four views. Rate limiter: 429 at request #90 ✓. Analytics test events cleaned from DB.

Key artifacts added this round:
- `src/lib/library-store.ts`, `src/components/platform/MyLibraryView.tsx`, updated: ResourceItemCard, ItemDetailDialog, CategoryExplorer (saved filter + sticky toolbar + smart empty states), HomeView (trending + jump back in + SectionHeading), SiteHeader (library badge), SiteFooter, PlatformShell, page.tsx (view=library routing, trending SSR, view-specific metadata), platform.ts (rate limiter), db.ts (log level), globals.css (scrollbars, pulse-slow, badge-glow, reduced-motion), ResourceCategoryCard (sheen, hairline, badge pulse).

Unresolved issues / risks & priority recommendations for next phase:
- Admin auth still demo-grade → NextAuth credentials + session cookies remains the top upgrade.
- Single-route constraint unchanged (query-param routing; canonical routes in DB ready).
- Recommended next features: (1) item detail "pages" with rich bodies (markdown) + progress steps; (2) roadmap step-graph visualization; (3) one playable simulator embed (e.g., CSS Flexbox sandbox) to activate the Simulators category; (4) sitemap.xml + OG images; (5) admin bulk publish/unpublish + CSV export; (6) keyboard shortcut help overlay (?).
- localStorage library is device-local; if cross-device sync is desired later, lift saved/completed into a User model via authenticated API.
---
Task ID: 3
Agent: Z.ai Code (main agent, scheduled dev round)
Task: Assess project status, QA via agent-browser, then continue development with new features + styling polish per the standing mandate (fix bugs first, else add features).

Work Log:
- Read worklog; assessed status: dev server healthy, all views 200, zero console errors, VLM homepage QA 9.2/10 — platform stable, so this round delivered the worklog's recommended next features.
- STATUS ASSESSMENT (pre-work): homepage / simulators / library / admin all render clean; rate limiter verified (429 fires); no bugs found → feature round.

NEW FEATURE 1 — Interactive CSS Flexbox Simulator (activates the Simulators category):
- Prisma: added `steps String @default("")` (JSON milestones) to ResourceItem; pushed schema; reseeded.
- Seed: published "CSS Flexbox Simulator" (featured, real description) → hub now shows "1 simulators" alongside the "New" badge; other 3 sims remain drafts. Total published: 98.
- `src/lib/simulators.ts`: playable-sim registry (slug → sandbox kind) + `simulatorViewHref`.
- `FlexboxSimulator.tsx` (~700 lines): two modes —
  - Free play: full control panel (flex-direction, justify-content, align-items, flex-wrap, conditional align-content, gap slider, item count slider), live animated stage with dot grid, generated-CSS panel with per-prop "changed" highlighting + copy-to-clipboard.
  - Challenges: 6 challenges (dead center / push to end / navbar space-between / column / row-reverse / wrap+gap) with Target-vs-Yours side-by-side stages, per-challenge check validation, hint reveal (AnimatePresence), mismatch feedback toast listing wrong props, auto-advance on solve, trophy progress chip in header.
- Routing: `/?view=simulator&sim=css-flexbox-simulator` — page.tsx resolves the sim server-side (falls back to hub for unknown/non-playable sims), per-view metadata (noindex), PlatformShell renders FlexboxSimulator.
- Integration: ItemDetailDialog primary CTA becomes "Launch sandbox" for playable sims (demo toast for unbuilt ones); ResourceItemCard shows a teal Play halo on playable sims; GlobalSearch shows Play icon + "Play" chip and deep-links straight into the sandbox; My Library recent strip links playable sims directly.
- Analytics: new event types `simulator_view`, `challenge_complete` (had to extend the zod enum in /api/analytics — found via a 400 in dev.log during QA).

NEW FEATURE 2 — Roadmap step-graph with progress tracking:
- Seed: all 11 roadmaps now carry 8–12 realistic structured steps (title, detail, hours) — e.g. Frontend: 10 steps/~400h.
- platform.ts: `StepView` type + `parseSteps`; steps flow through ResourceItemView → all APIs.
- ItemDetailDialog: renders a "Learning path" section — vertical timeline (numbered nodes → check circles, connector line colored per accent when done), live progress bar with aria, "~Nh" total, "Next up" chip, checkable steps persisted to library store (`stepProgress`).
- MyLibraryView: new "Learning paths in motion" section (progress cards per started roadmap) + stats card changed to "Steps completed" total.

NEW FEATURE 3 — Keyboard shortcuts + help overlay:
- PlatformShell global keydown handler: ⌘K/Ctrl+K search, `?` help, `1`–`5` category jump (IA order), `l` library, `h` home, `t` theme toggle; suppressed while typing in inputs or when any dialog is open (verified: keys during dialog exit animation are correctly ignored).
- ShortcutsHelpDialog: styled kbd rows, live category-number mapping, header keyboard button added (hidden on mobile).

NEW FEATURE 4 — Admin bulk actions + CSV export:
- New API: `POST /api/resources/bulk` (admin key, zod-validated ids ≤200, actions publish/unpublish/feature/unfeature/delete via updateMany/deleteMany).
- ContentManager: checkbox column + select-all, floating bulk action bar (5 actions + clear), selected-row highlight, per-row state preserved; "Export CSV" button generates proper quoted CSV client-side (verified blob type text/csv).

BUGS FOUND & FIXED DURING QA:
1. `simProgress` missing from zustand initial state (SSR crash: "Cannot read properties of undefined") — added `simProgress: {}`.
2. Unstable zustand selectors (`s.simProgress[slug] ?? []` returns fresh [] each call) triggered React 19 useSyncExternalStore infinite-loop guard — now select the stable record reference and derive arrays outside the selector (both FlexboxSimulator + StepGraph).
3. Stale Prisma client in the running dev server after schema push (server kept the pre-`steps` client in Turbopack's module cache; `touch`-ing files didn't reload node_modules): rewrote `src/lib/db.ts` with a versioned global cache key (prisma-dev-v2) AND performed a controlled dev-server restart (killed tree, relaunched `bun run dev` in background exactly as start.sh does). Steps now flow; counts verified (15/11/44/27/1).
4. Analytics zod enum rejected new event types (400s) — extended enum + trackEvent type union.

STYLING POLISH:
- Hero: teal "New: the interactive CSS Flexbox Simulator" spotlight pill (play icon, hover scale/slide, analytics-tracked) — registry-driven so it disappears if the sim is unpublished.
- Simulator stage compacted (min-h-44/56) so the generated-CSS panel is above the fold (VLM feedback addressed).
- Step-graph: accent-aware nodes/connector, line-through completed steps, emerald complete toast on full path.
- Library: roadmap progress cards with accent progress bars + "N steps to go".

Stage Summary (verification results):
- ESLint clean; dev.log zero runtime errors (all 200s; one expected 400 from malformed analytics POST now fixed).
- Simulator: view renders 200 with metadata; challenge 1 & 2 solved via real UI clicks — progress persists (2/6), auto-advance to challenge 3, challenge_complete analytics event confirmed in admin API; CSS copy toast; VLM QA: explore 7.5→(post-compaction) challenge mode 9/10, light theme 9/10, mobile 390px challenge mode 8/10 with no horizontal overflow.
- Roadmap step-graph: deep-link opens dialog with 10 steps, 2/10 done + progress bar 20% after clicking steps, VLM QA 9/10.
- Keyboard: ? overlay renders (12 rows, 16 kbd), 3 → /?category=courses, h → /, l → /?view=library (all via real key presses).
- Admin: bulk select-all → unfeature verified against API (featured courses 0), targeted re-feature restored seed state via bulk endpoint; CSV export verified.
- Hub: "1 simulators" on home card + mobile sheet + footer; total 98 published resources; hero stats dl shows all five categories.
- Known test-scripting note: raw JS .click() doesn't fire pointer events Radix needs — use agent-browser's click command for Radix controls (documented for future QA).

Key artifacts added/changed this round:
- NEW: `src/components/platform/FlexboxSimulator.tsx`, `src/components/platform/ShortcutsHelpDialog.tsx`, `src/lib/simulators.ts`, `src/app/api/resources/bulk/route.ts`.
- UPDATED: `prisma/schema.prisma` (+steps), `prisma/seed.ts` (roadmap steps + published flexbox sim), `src/lib/platform.ts` (StepView/parseSteps), `src/lib/library-store.ts` (stepProgress/simProgress/completeChallenge), `src/lib/db.ts` (versioned client cache), `src/app/page.tsx` (simulator view + metadata), `src/app/api/analytics/route.ts` (event types), `src/components/platform/{PlatformShell,ItemDetailDialog,ResourceItemCard,GlobalSearch,MyLibraryView,HomeView,SiteHeader,AdminPanel}.tsx`.

Unresolved issues / risks & priority recommendations for next phase:
- Admin auth still demo-grade (shared password + header key) → NextAuth credentials + httpOnly session cookies remains the top upgrade.
- localStorage library is device-local → lift saved/completed/stepProgress/simProgress behind a User model if cross-device sync is wanted.
- Single-route constraint unchanged; canonical routes (/masterclass etc.) still DB-stored, query-param routing in-app.
- Next simulator candidates from the registry pattern: SQL Query Sandbox (real SQLite mini-service or in-browser SQL engine), HTTP Request/Response Lab (request builder + visual exchange timeline). The registry + dialog CTA + search integration make each new sandbox ~1 component away.
- Roadmap steps are admin-editable only via DB/seed today; an admin steps editor (drag-to-reorder, per-step CRUD) would complete the content lifecycle.
- Analytics: consider aggregating simulator_view/challenge_complete in the admin analytics tab charts (events are recorded; the tab currently groups by type only).
- Dev-server note for future agents: after `bun run db:push`, the running server needs its Prisma client reloaded — bump the PRISMA_CACHE_KEY in src/lib/db.ts (and restart if schema types changed) before assuming code bugs.
