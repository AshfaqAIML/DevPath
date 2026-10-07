// Verification for agent-harnesses-for-developers: structure + execute every JS practice snippet.
// Run: bun content/courses/agent-harnesses-for-developers/verify.mjs  (exit non-zero on failure)
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
if (course.courseSlug !== "agent-harnesses-for-developers") fail("courseSlug");
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

const p1 = lessons["01-harness-vs-framework"]._practiceOut;
if (!eq(p1, ["graph-exec -> buy", "memory-policy -> build", "gold-eval -> build", "vector-engine -> buy"])) fail("ch1 decisions: " + JSON.stringify(p1));
else ok("ch1 build-vs-buy: moat arithmetic decides");

const p2 = lessons["02-context-management"]._practiceOut;
if (p2[0] !== "system,contracts,examples,history(TRUNCATED)" || p2[1] !== "used=2400") fail("ch2 packing: " + JSON.stringify(p2));
else ok("ch2 budget: priority protects, history absorbs");

const p3 = lessons["03-memory-systems"]._practiceOut;
if (p3[0] !== "semantic tier=platinum v2" || p3[1] !== "kept=1 pruned=1") fail("ch3 memory: " + JSON.stringify(p3));
else ok("ch3 memory: versioned upsert + floored decay");

const p4 = lessons["04-tool-registries"]._practiceOut;
if (!eq(p4, ["default=v2", "pinned=v1", "missing=null"])) fail("ch4 resolve: " + JSON.stringify(p4));
else ok("ch4 registry: current defaults, pins freeze");

const p5 = lessons["05-planning-loops"]._practiceOut;
if (p5[0] !== "ok=true iters=3" || p5[2] !== "stuck: ok=false reason=budget-exhausted") fail("ch5 loops: " + JSON.stringify(p5));
else if (!p5[1].includes("fetch:got-rows")) fail("ch5 trail: " + p5[1]);
else ok("ch5 loops: done-flags finish, budgets finish");

const p6 = lessons["06-error-taxonomy"]._practiceOut;
if (p6[0] !== "6/6 errors classified" || p6[1] !== "auth policy: escalate-noretry" || p6.length !== 2) fail("ch6 classify: " + JSON.stringify(p6));
else ok("ch6 taxonomy: 6/6 classes incl. unknown default");

const p7 = lessons["07-trace-replay-debug"]._practiceOut;
if (p7[0] !== "same-seed identical: true" || p7[1] !== "diff-seed differs: true" || !p7[2].startsWith("trial42=")) fail("ch7 determinism: " + JSON.stringify(p7));
else ok("ch7 determinism: seeded replay proven");

const p8 = lessons["08-harness-guardrails"]._practiceOut;
if (p8.length !== 6) fail("ch8 count: " + JSON.stringify(p8));
else if (!(p8[0].includes("true") && p8[1].includes("injection-pattern") && p8[3].includes("forbidden-promise") && p8[4].includes("true") && p8[5].includes("false"))) fail("ch8 layers: " + JSON.stringify(p8));
else ok("ch8 enforcement: 6 verdicts across layers");

const p9 = lessons["09-harness-evaluation"]._practiceOut;
if (!eq(p9, ["MODEL DRIFT", "HARNESS REGRESSION", "no-drop"])) fail("ch9 matrix: " + JSON.stringify(p9));
else ok("ch9 attribution: 2x2 quadrants decide");

const p10 = lessons["10-support-harness-capstone"]._practiceOut;
if (!p10.slice(0, 8).every((l) => l.startsWith("PASS")) || p10[8] !== "manifest sound") fail("ch10 manifest: " + JSON.stringify(p10));
else ok("ch10 manifest audit: 8 PASS + sound");

console.log(failures === 0 ? "\nALL CHECKS PASSED" : `\n${failures} FAILURES`);
process.exit(failures === 0 ? 0 : 1);
