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
