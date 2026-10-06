// Verification for langgraph-for-e-commerce: structure + execute every JS practice snippet.
// Run: bun content/courses/langgraph-for-e-commerce/verify.mjs  (exit non-zero on failure)
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
if (course.courseSlug !== "langgraph-for-e-commerce") fail("courseSlug");
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
if (!course.prereqSlugs?.includes("prompt-engineering-101")) fail("prereq must include prompt-engineering-101");
ok("course.json: 12Q assessment, project, 6 interviewQs, published, prereqs");

// --- 2. lessons: structure + execute practice JS ---
function runJS(code) {
  const lines = [];
  const fn = new Function("console", code);
  fn({ log: (...a) => lines.push(a.join(" ")) });
  return lines;
}
function runJSWith(code, extra) {
  // run with additional prelude (e.g. alternate ticket) by textual variant
  return runJS(code);
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

const p1 = lessons["01-graphs-not-chains"]._practiceOut;
if (p1[0] !== "__start__ -> triage | triage -> draft | draft -> __end__") fail("ch1 trace: " + p1[0]);
else {
  const st = JSON.parse(p1[1]);
  if (st.category !== "shipping" || !st.draft) fail("ch1 state: " + p1[1]);
  else ok("ch1 walk: draft path with shipping + filled draft");
}

const p2 = lessons["02-state-schemas-reducers"]._practiceOut;
if (!eq(p2, ['["hi","update","again"]', "attempts=3", 'decision={"ok":true}'])) fail("ch2 merge: " + JSON.stringify(p2));
else ok("ch2 reducers: append/counter/overwrite compose");

const p3 = lessons["03-nodes-that-hold-contracts"]._practiceOut;
{
  const rs = p3.map((l) => JSON.parse(l));
  if (rs[0].ok !== true || !rs[1].error.startsWith("bad-enum") || rs[2].error !== "bad-confidence" || rs[3].error !== "not-an-object") fail("ch3 validator: " + JSON.stringify(p3));
  else ok("ch3 validator: ok/enum/confidence/shape in order");
}

const p4 = lessons["04-conditional-edges-routing"]._practiceOut;
if (!eq(p4, ["5/5 branches covered"])) fail("ch4 coverage: " + JSON.stringify(p4));
else ok("ch4 router: 5/5 branches, zero misses");

const p5 = lessons["05-checkpointing-persistence"]._practiceOut;
if (!eq(p5, ["resume at step 1 -> draft", "category=shipping", "missing thread: null", "history intact: true"])) fail("ch5 resume: " + JSON.stringify(p5));
else ok("ch5 checkpointer: resume + null + deep-copy proof");

const p6 = lessons["06-human-in-the-loop"]._practiceOut;
if (!eq(p6, ["6/6 verdicts routed"])) fail("ch6 verdicts: " + JSON.stringify(p6));
else ok("ch6 gate router: 6/6 incl. fail-closed unknown");

const p7 = lessons["07-tools-structured-output"]._practiceOut;
if (!eq(p7, ["4/4 tool calls routed"])) fail("ch7 tool boundary: " + JSON.stringify(p7));
else ok("ch7 tools: continue/clarify/quarantine all route");

const p8 = lessons["08-subgraphs-composition"]._practiceOut;
{
  const a = JSON.parse(p8[0]), b = JSON.parse(p8[1]);
  if (a.returnsDecision !== "refund-path" || b.returnsDecision !== "info-path") fail("ch8 paths: " + JSON.stringify(p8));
  else if (p8[2] !== "namespaced: true") fail("ch8 namespace");
  else ok("ch8 composition: per-channel paths, no leakage");
}

const p9 = lessons["09-evaluating-graphs"]._practiceOut;
{
  const g = JSON.parse(p9[0]), bad = JSON.parse(p9[1]);
  if (g.pass !== true || g.issues.length !== 0) fail("ch9 good trace");
  else if (bad.pass !== false || bad.issues.length !== 2) fail("ch9 bad trace: " + p9[1]);
  else ok("ch9 trace checker: pass + dual-issue fail");
}

const p10 = lessons["10-returns-graph-capstone"]._practiceOut;
if (!p10.slice(0, 4).every((l) => l.startsWith("PASS")) || p10[4] !== "manifest sound") fail("ch10 manifest: " + JSON.stringify(p10));
else ok("ch10 manifest audit: 4 PASS + sound");

console.log(failures === 0 ? "\nALL CHECKS PASSED" : `\n${failures} FAILURES`);
process.exit(failures === 0 ? 0 : 1);
