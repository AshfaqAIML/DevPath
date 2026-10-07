// Verification for production-ai-agents: structure + execute every JS practice snippet.
// Run: bun content/courses/production-ai-agents/verify.mjs  (exit non-zero on failure)
import { readdir, readFile } from "fs/promises";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const DIR = join(dirname(fileURLToPath(import.meta.url)), "lessons");
let failures = 0;
const fail = (m) => { failures++; console.log("FAIL " + m); };
const ok = (m) => console.log("ok " + m);

const BLOCKS = new Set(["h","p","list","callout","code","table","diagram","keytakeaways","interview","practice"]);

// --- 1. course.json ---
const course = JSON.parse(await readFile(join(dirname(fileURLToPath(import.meta.url)), "course.json"), "utf8"));
if (course.courseSlug !== "production-ai-agents") fail("courseSlug");
if (!Array.isArray(course.assessment) || course.assessment.length !== 12) fail("assessment must be 12");
for (const [i, q] of course.assessment.entries()) {
  if (!q.q || !Array.isArray(q.options) || q.options.length < 3) fail(`assessment[${i}] shape`);
  if (!Number.isInteger(q.answer) || q.answer < 0 || q.answer >= q.options.length) fail(`assessment[${i}] answer range`);
  if (!q.explain) fail(`assessment[${i}] explain`);
}
for (const k of ["requirements","technical","steps","evaluation","stretch"]) {
  if (!Array.isArray(course.project?.[k]) || course.project[k].length === 0) fail("project." + k);
}
if (!course.project?.title || !course.project?.summary) fail("project title/summary");
if (typeof course.project?.architecture !== "string" || course.project.architecture.length < 50) fail("project.architecture");
if (!Array.isArray(course.interviewQs) || course.interviewQs.length !== 6) fail("interviewQs must be 6");
for (const [i, qa] of course.interviewQs.entries()) if (!qa.q || !qa.a || qa.a.length < 100) fail(`interviewQs[${i}] thin`);
if (course.contentStatus !== "published") fail("contentStatus should be published");
if (!course.prereqSlugs?.includes("langgraph-for-e-commerce")) fail("prereq must include langgraph-for-e-commerce");
ok("course.json: 12Q assessment, project, 6 interviewQs, published, prereqs");

// --- 2. lessons: structure + execute practice JS ---
function runJS(code) {
  const lines = [];
  const fn = new Function("console", code);
  fn({ log: (...a) => lines.push(a.join(" ")) });
  return lines;
}

const files = (await readdir(DIR)).filter((f) => f.endsWith(".json")).sort();
if (files.length !== 10) fail("expected 10 lessons, got " + files.length);

const lessons = {};
for (const f of files) {
  const l = JSON.parse(await readFile(join(DIR, f), "utf8"));
  lessons[l.slug] = l;
  const tag = l.slug || f;
  if (!l.title || !l.slug || !l.objective || !l.why || !l.summary || !l.next) fail(tag + " metadata");
  if (!Array.isArray(l.blocks) || l.blocks.length < 8) fail(tag + " blocks");
  for (const b of l.blocks) if (!BLOCKS.has(b.t)) fail(tag + " bad block t=" + b.t);
  if (!Array.isArray(l.quiz) || l.quiz.length < 3) fail(tag + " quiz");
  for (const [i, q] of l.quiz.entries()) {
    if (!q.q || !Array.isArray(q.options) || !Number.isInteger(q.answer) || q.answer < 0 || q.answer >= q.options.length || !q.explain) fail(`${tag} quiz[${i}]`);
  }
  if (!l.exercise?.prompt || !Array.isArray(l.exercise.hints) || l.exercise.hints.length !== 3 || !l.exercise.solution || !l.exercise.why) fail(tag + " exercise");
  for (const b of l.blocks) {
    if (b.t === "code" && b.lang === "js" && !b.code.includes("import ")) {
      try { new Function(b.code); } catch (e) { fail(`${tag} code block syntax: ${e.message}`); }
    }
    if (b.t === "practice" && b.sim === "js-playground") {
      try {
        const lines = runJS(b.query);
        l._practiceOut = lines;
        ok(`${tag} practice runs (${lines.length} console lines)`);
      } catch (e) { fail(`${tag} practice threw: ${e.message}`); }
    }
  }
}

// --- 3. assert practice outputs ---
const eq = (a, b) => JSON.stringify(a) === JSON.stringify(b);

const p1 = lessons["01-demo-to-prod-gap"]._practiceOut;
if (!eq(p1, ["guardrails:6,fallbacks:4,evaluation:3", "top fix: guardrails"])) fail("ch1 audit: " + JSON.stringify(p1));
else ok("ch1 audit: harm-weighted fix order");

const p2 = lessons["02-latency-budgets"]._practiceOut;
if (!eq(p2, ["triage share=11% over=false", "retrieval share=60% over=true", "draft share=29% over=false", "serial p99=7500"])) fail("ch2 budget: " + JSON.stringify(p2));
else ok("ch2 budget: tail owner + serial sum");

const p3 = lessons["03-cost-control"]._practiceOut;
if (p3[0] !== "triage perTask=$0.0049 monthly=$147" || p3[1] !== "draft perTask=$0.0185 monthly=$555" || p3[2] !== "total monthly=$702") fail("ch3 projector: " + JSON.stringify(p3));
else ok("ch3 projector: draft dominates at $555/$702");

const p4 = lessons["04-fallback-cascades"]._practiceOut;
if (!eq(p4, ["tiers=primary,secondary,cached", "terminal=human-queue"])) fail("ch4 trace: " + JSON.stringify(p4));
else ok("ch4 cascade: tiers descend to human terminal");

const p5 = lessons["05-deploy-gates-canary"]._practiceOut;
{
  const [a, b, c] = p5.map((l) => JSON.parse(l));
  if (a.ship !== false || a.reason !== "regression:edge") fail("ch5 regression: " + p5[0]);
  else if (b.ship !== false || b.reason !== "veto:money") fail("ch5 veto: " + p5[1]);
  else if (c.ship !== true) fail("ch5 ship: " + p5[2]);
  else ok("ch5 gates: regression/veto/ship layered");
}

const p6 = lessons["06-production-guardrails"]._practiceOut;
{
  const [a, b, c, d] = p6.map((l) => JSON.parse(l));
  if (a.pass !== true || !a.text.includes("[EMAIL]")) fail("ch6 redact: " + p6[0]);
  else if (b.pass !== false) fail("ch6 injection: " + p6[1]);
  else if (c.pass !== false) fail("ch6 oversize: " + p6[2]);
  else if (d.pass !== true || !d.text.includes("[CARD]")) fail("ch6 card: " + p6[3]);
  else ok("ch6 layers: mask/block/block/mask independently");
}

const p7 = lessons["07-observability"]._practiceOut;
if (!eq(p7, ["overrideRate: PAGE", "costPerTask: quiet", "p99: quiet", "pages=1"])) fail("ch7 alerts: " + JSON.stringify(p7));
else ok("ch7 alerts: behavior pages, variance silent");

const p8 = lessons["08-review-operations"]._practiceOut;
if (!eq(p8, ["picked=b,c", "reasons=uncertain,stakes", "coverage=2/4"])) fail("ch8 sampling: " + JSON.stringify(p8));
else ok("ch8 sampling: risk concentrates attention");

const p9 = lessons["09-incident-response"]._practiceOut;
if (!eq(p9, ["5/5 severities correct"])) fail("ch9 severity: " + JSON.stringify(p9));
else ok("ch9 severity: harm routes paging");

const p10 = lessons["10-launch-review-capstone"]._practiceOut;
if (!p10.slice(0, 5).every((l) => l.startsWith("PASS")) || p10[5] !== "launch approved (conditional)") fail("ch10 bundle: " + JSON.stringify(p10));
else ok("ch10 bundle audit: 5 PASS + conditional approval");

console.log(failures === 0 ? "\nALL CHECKS PASSED" : `\n${failures} FAILURES`);
process.exit(failures === 0 ? 0 : 1);
