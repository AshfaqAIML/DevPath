# AI Engineering Track — Master Directive (adopted 2026-10-06)

Owner directive: build a rigorous AI Engineering path from Python foundations to
production system design, per the 24-course master spec (Python → Foundations →
ML → Deep Learning → Transformers → LLM APIs → Prompting → Structured Outputs →
Embeddings → Vector DBs → RAG → Advanced RAG → Tool Calling → Agents →
LangGraph → MCP → Memory → Evaluation → Guardrails → Observability →
Production → Cost/Performance → Security → System Design).

Golden rules carried over: one course at a time (§26); real verified code (§8);
provider-neutral teaching (§9); failure-driven lessons (§13); evaluation-first
(§12); interview prep per course (§14); no invented APIs (§2 — verify against
official docs before writing version-sensitive content).

## Platform mapping (where the spec meets THIS repo)

The spec's §§5–6, 22–23 assume an MDX CMS. DevPath uses the course-first JSON
engine — the mapping below is binding for all AI-track work:

| Spec asks | DevPath equivalent |
|---|---|
| `course.mdx + metadata.json` (§22) | `content/courses/<slug>/course.json` (metadata, outcomes, assessment, project, interviewQs) + `lessons/*.json` |
| Lesson sections (§6) | Our blocks: `objective` (objectives), `why` (why-it-matters), `blocks[]` (concept/how/example/implementation/use-case/mistakes via h/p/callout/code/table/diagram), `exercise` (exercise + 3 hints + solution + why), `quiz[]` (quiz with explanations), `summary`, `next` |
| `<Callout/> <Quiz/> <Diagram/>…` (§23) | Block types `callout, code, table, diagram, keytakeaways, interview, practice, list` rendered by `LessonBlocks.tsx` — never invent new block types |
| Labs (§19) | Hands-on sections inside lessons + capstone projects; environment = learner's own machine unless executable here (see verification policy) |
| Audits (§25) | `docs/AI_ENGINEERING_CONTENT_AUDIT.md`, `docs/AI_ENGINEERING_DEPENDENCY_MAP.md`, `docs/AI_ENGINEERING_SKILLS_MATRIX.md` — created incrementally as courses land |

## Verification policy (binding)

- **JS snippets** (prompt machinery, graph runners, validators, TF-IDF, chunkers):
  EXECUTE every practice/exercise snippet; assert outputs in `verify.mjs`.
- **SQL**: sandbox engine for flats; `bun:sqlite` for real-DB constructs.
- **Python / FastAPI / pgvector / Docker / cloud**: NOT executable here — code is
  reviewed line-by-line, APIs checked against official docs (version stated),
  labeled `runs in your project`, and structured so learners can run it locally.
- **Version-sensitive APIs** (MCP spec, LangGraph, providers): check official
  docs first; state version assumptions; never invent endpoints.

## Coverage: 24-spec vs DevPath catalog (truth table)

| # | Spec course | DevPath status |
|---|---|---|
| 1 | AI Engineering Foundations | ⬜ MISSING — propose new |
| 2 | Python for AI Engineers | ⬜ MISSING (adjacent: `Python, Pandas, ML & GenAI for E-Commerce` planned) |
| 3 | ML Foundations | ⬜ MISSING (adjacent: same Python/ML course above) |
| 4 | Deep Learning Essentials | ⬜ MISSING — propose new |
| 5 | Transformers & LLM Fundamentals | ⬜ MISSING — propose new (CORE) |
| 6 | Working with LLM APIs | ⬜ MISSING — propose new |
| 7 | Prompt Engineering for Production | ✅ `prompt-engineering-101` (branch, ~80% overlap) |
| 8 | Structured Outputs | 🟡 PARTIAL (Prompt 101 Ch.3) — propose dedicated or extend |
| 9 | Embeddings & Semantic Search | 🟡 PARTIAL (OpenDataLoader Ch.5 TF-IDF baseline) — propose new |
| 10 | Vector Databases | ⬜ MISSING — propose new (pgvector-first) |
| 11 | RAG Fundamentals (flagship) | ⬜ MISSING — `RAG Agents for E-commerce` is agent-flavored, not this |
| 12 | Advanced RAG | ⬜ MISSING — propose new |
| 13 | Tool Calling | 🟡 PARTIAL (LangGraph Ch.7) — propose dedicated or extend |
| 14 | AI Agents | 🟡 PARTIAL (LangGraph whole) — propose dedicated ReAct/planner course |
| 15 | LangGraph & Stateful Workflows | ✅ `langgraph-for-e-commerce` (branch) |
| 16 | MCP | ⬜ MISSING — `MCP & Tool Use for E-commerce` planned in e-commerce list |
| 17 | Memory & Context Engineering | 🟡 PARTIAL (Prompt 101 Ch.8) — propose dedicated or extend |
| 18 | Evaluation (flagship) | 🟡 PARTIAL (Prompt 101 Ch.7) — propose flagship-grade dedicated |
| 19 | Guardrails & Safety | 🟡 PARTIAL (Prompt 101 Ch.6/9) — propose dedicated |
| 20 | Observability & Debugging | ⬜ MISSING — propose new |
| 21 | Production AI Engineering | 🟡 PARTIAL (`Production AI Agents` planned, e-commerce flavored) |
| 22 | Cost & Performance | 🟡 PARTIAL (Prompt 101 Ch.8) — propose dedicated or extend |
| 23 | AI Application Security | 🟡 PARTIAL (Prompt 101 Ch.6/9) — propose dedicated |
| 24 | AI System Design (culmination) | ⬜ MISSING — adjacent: catalog `High Level Design` |

E-commerce list items outside the 24-spec: ✅ CrewAI teams (branch); `RAG Agents`,
`Production AI Agents`, `Agent Harnesses`, `Spring AI` (agent-flavored builds on
top of 11–15); `Data Visualization & Analysis`, `PostgreSQL/MongoDB/Prisma/Redis/
Sharding/Indexing` (data-infra shelf).

## Dependency alignment

24-spec chain (§4) is compatible with ours: Prompt 101 → LangGraph → CrewAI
already built in that order. New builds slot in: Foundations → Python → ML →
Deep Learning → Transformers → LLM APIs **before** Prompt 101 for true
beginners; Structured Outputs/Embeddings/Vector DBs/RAG/Advanced RAG/Tool
Calling/Agents/MCP/Memory **between** Prompt 101 and LangGraph; Evaluation →
Guardrails → Observability → Production → Cost → Security → System Design
**after** the agent cluster. E-commerce applied courses stay as the applied
layer on top (unchanged order).

## Open decision (needs owner)

DECIDED 2026-10-06: **A) E-commerce list order** — continue RAG Agents →
MCP → Production Agents → Harnesses with the new quality bar applied
(failure-driven lessons, eval-first, version-checked APIs, no invented APIs).
