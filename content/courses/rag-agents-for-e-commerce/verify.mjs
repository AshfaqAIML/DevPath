// Verification for rag-agents-for-e-commerce: structure + execute every JS practice snippet.
// Run: bun content/courses/rag-agents-for-e-commerce/verify.mjs  (exit non-zero on failure)
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
if (course.courseSlug !== "rag-agents-for-e-commerce") fail("courseSlug");
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
if (!course.prereqSlugs?.includes("opendataloader-pdf")) fail("prereq must include opendataloader-pdf");
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

const p1 = lessons["01-rag-anatomy"]._practiceOut;
if (!eq(p1, ["4/4 needs routed"])) fail("ch1 routing: " + JSON.stringify(p1));
else ok("ch1 need-router: 4/4 architectures by property");

const p2 = lessons["02-product-chunking"]._practiceOut;
if (p2[0] !== "units=2" || p2[1] !== "ids=SH-1-v8,SH-1-v9") fail("ch2 units: " + JSON.stringify(p2));
else if (p2[2] !== "size-9 price answerable in one chunk: true" || p2[3] !== "metadata present: true") fail("ch2 probes: " + JSON.stringify(p2));
else ok("ch2 chunking: variant units, self-contained, metadata");

const p3 = lessons["03-embeddings-similarity"]._practiceOut;
{
  const par = Number(p3[0].split("=")[1]), sk = Number(p3[1].split("=")[1]), self = Number(p3[2].split("=")[1]);
  if (!(par > 0.99 && sk < 0.05 && Math.abs(self - 1) < 1e-9)) fail("ch3 geometry: " + JSON.stringify(p3));
  else ok("ch3 geometry: near/orthogonal/identical");
}

const p4 = lessons["04-hybrid-retrieval"]._practiceOut;
if (p4[0] !== "p3-sku-exact,p1,p2,p4-paraphrase" || p4[1] !== "consensus top: true" || p4[2] !== "union size: 4") fail("ch4 fusion: " + JSON.stringify(p4));
else ok("ch4 RRF: consensus floats, recall preserved");

const p5 = lessons["05-query-rewriting"]._practiceOut;
if (p5[0] !== 'vague queries: 1 filters={"maxPrice":100}' || p5[1] !== "precise queries: 1 filters={}" || p5[2] !== "rewrite-worthy: true") fail("ch5 rewrite: " + JSON.stringify(p5));
else ok("ch5 rewriting: filters gate, precise skips");

const p6 = lessons["06-reranking"]._practiceOut;
if (p6[0] !== "c2,c4" || p6[1] !== "rerank calls: 4, generation chunks: 2") fail("ch6 funnel: " + JSON.stringify(p6));
else ok("ch6 funnel: rerank rules, top-k bounded");

const p7 = lessons["07-grounded-generation"]._practiceOut;
{
  const rs = p7.map((l) => JSON.parse(l));
  if (rs[0].ok !== true) fail("ch7 fresh");
  else if (rs[1].error !== "stale:219d") fail("ch7 stale: " + p7[1]);
  else if (rs[2].error !== "missing-as-of") fail("ch7 missing");
  else if (rs[3].error !== "future-date") fail("ch7 future");
  else ok("ch7 staleness gate: 4 evidence states route");
}

const p8 = lessons["08-evaluating-rag"]._practiceOut;
{
  const m = JSON.parse(p8[0]), g1 = JSON.parse(p8[1]), g2 = JSON.parse(p8[2]);
  if (m.hitRate !== 0.75 || m.mrr !== 0.63) fail("ch8 metrics: " + p8[0]);
  else if (g1.ship !== false || g1.reason !== "money-grounding") fail("ch8 veto: " + p8[1]);
  else if (g2.ship !== true) fail("ch8 ship: " + p8[2]);
  else ok("ch8 eval: 0.75/0.63 + veto-then-ship");
}

const p9 = lessons["09-agentic-rag"]._practiceOut;
if (!eq(p9, ["5/5 needs routed"])) fail("ch9 router: " + JSON.stringify(p9));
else ok("ch9 need-router: 5 paths incl. quarantine");

const p10 = lessons["10-store-assistant-capstone"]._practiceOut;
if (!p10.slice(0, 6).every((l) => l.startsWith("PASS")) || p10[6] !== "manifest sound") fail("ch10 manifest: " + JSON.stringify(p10));
else ok("ch10 manifest audit: 6 PASS + sound");

console.log(failures === 0 ? "\nALL CHECKS PASSED" : `\n${failures} FAILURES`);
process.exit(failures === 0 ? 0 : 1);
