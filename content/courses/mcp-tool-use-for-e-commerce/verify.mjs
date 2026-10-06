// Verification for mcp-tool-use-for-e-commerce: structure + execute every JS practice snippet.
// Run: bun content/courses/mcp-tool-use-for-e-commerce/verify.mjs  (exit non-zero on failure)
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
if (course.courseSlug !== "mcp-tool-use-for-e-commerce") fail("courseSlug");
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
if (!course.technologies?.some((t) => t.includes("2026-07-28"))) fail("version basis must state spec 2026-07-28");
ok("course.json: 12Q assessment, project, 6 interviewQs, published, versioned prereqs");

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

const p1 = lessons["01-why-mcp-exists"]._practiceOut;
if (!eq(p1, ["today 3x2: bespoke=6 standard=5", "scaled 12x8: bespoke=96 standard=20", "13th host marginal: bespoke+8 standard+1"])) fail("ch1 pricing: " + JSON.stringify(p1));
else ok("ch1 pricing: quadratic vs linear with marginals");

const p2 = lessons["02-architecture-transports"]._practiceOut;
{
  const [a, b, c] = p2.map((l) => JSON.parse(l));
  if (a.ok !== true || a.version !== "2026-07-28") fail("ch2 agree: " + p2[0]);
  else if (b.ok !== false || !b.error.includes("UnsupportedProtocolVersion")) fail("ch2 mismatch: " + p2[1]);
  else if (c.ok !== true || c.version !== "2024-11-05") fail("ch2 fallback: " + p2[2]);
  else ok("ch2 negotiation: agree/error/fallback explicit");
}

const p3 = lessons["03-tools-registertool"]._practiceOut;
{
  const [a, b, c] = p3.map((l) => JSON.parse(l));
  if (a.ok !== true) fail("ch3 valid: " + p3[0]);
  else if (b.ok !== false || !JSON.stringify(b.problems).includes("bad-format")) fail("ch3 malformed: " + p3[1]);
  else if (c.ok !== false || !JSON.stringify(c.problems).includes("missing")) fail("ch3 missing: " + p3[2]);
  else ok("ch3 validation: ok/malformed/missing pre-handler");
}

const p4 = lessons["04-resources-direct-context"]._practiceOut;
if (!eq(p4, ["4/4 needs routed"])) fail("ch4 routing: " + JSON.stringify(p4));
else ok("ch4 address-vs-invoke: 4/4 by access pattern");

const p5 = lessons["05-prompts-templates"]._practiceOut;
if (!eq(p5, ["5/5 primitives routed"])) fail("ch5 routing: " + JSON.stringify(p5));
else ok("ch5 three-way routing: 5/5 incl. clarify fallback");

const p6 = lessons["06-permissions-approval"]._practiceOut;
if (!eq(p6, ["5/5 authorizations correct"])) fail("ch6 matrix: " + JSON.stringify(p6));
else ok("ch6 scopes: allow/gate/deny + dual novelty denials");

const p7 = lessons["07-safe-execution"]._practiceOut;
if (p7[0] !== "charges after repeat=1" || p7[1] !== "r1 replay=false r2 replay=true" || p7[2] !== "r3 fresh=true charges=2") fail("ch7 idempotency: " + JSON.stringify(p7));
else ok("ch7 idempotency: repeats are records");

const p8 = lessons["08-store-server-build"]._practiceOut;
if (p8[0] !== "order sound" || !p8[1].includes("violated: gated-refund before read-tools")) fail("ch8 order: " + JSON.stringify(p8));
else ok("ch8 build order: sound vs money-first violation");

const p9 = lessons["09-debugging-mcp"]._practiceOut;
if (!eq(p9, ["transport: stdout polluted", "discovery: version/capability mismatch", "validation: isError names the rule", "all green"])) fail("ch9 layers: " + JSON.stringify(p9));
else ok("ch9 elimination: first failure owns it");

const p10 = lessons["10-order-ops-capstone"]._practiceOut;
if (!p10.slice(0, 4).every((l) => l.startsWith("PASS")) || p10[4] !== "manifest sound") fail("ch10 manifest: " + JSON.stringify(p10));
else ok("ch10 manifest audit: 4 PASS + sound");

console.log(failures === 0 ? "\nALL CHECKS PASSED" : `\n${failures} FAILURES`);
process.exit(failures === 0 ? 0 : 1);
