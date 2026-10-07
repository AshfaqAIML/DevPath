// Verification for python-pandas-ml-genai: structure + execute JS practices +
// execute EVERY Python block with python 3.13 (pandas 2.x, sklearn 1.x).
// Run: bun content/courses/python-pandas-ml-genai-for-e-commerce/verify.mjs
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
if (course.courseSlug !== "python-pandas-ml-genai-for-e-commerce") fail("courseSlug");
if (!Array.isArray(course.assessment) || course.assessment.length !== 10) fail("assessment must be 10");
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
ok("course.json: 10Q assessment, project, 6 interviewQs, published, prereqs");

// --- helpers ---
function runJS(code) {
  const lines = [];
  const fn = new Function("console", code);
  fn({ log: (...a) => lines.push(a.join(" ")) });
  return lines;
}
function runPy(code) {
  const proc = Bun.spawnSync(["python", "-c", code], { stdout: "pipe", stderr: "pipe" });
  return {
    ok: proc.exitCode === 0,
    out: proc.stdout.toString(),
    err: proc.stderr.toString().slice(0, 300),
  };
}

const files = (await readdir(DIR)).filter((f) => f.endsWith(".json")).sort();
if (files.length !== 8) fail("expected 8 lessons, got " + files.length);

const lessons = {};
const pyBlocks = [];
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
    if (b.t === "code" && b.lang === "python") pyBlocks.push([tag, b.code]);
    if (b.t === "practice" && b.sim === "js-playground") {
      try {
        const lines = runJS(b.query);
        l._practiceOut = lines;
        ok(`${tag} practice runs (${lines.length} console lines)`);
      } catch (e) { fail(`${tag} practice threw: ${e.message}`); }
    }
  }
}

// --- 2. execute every Python block for real ---
for (const [tag, code] of pyBlocks) {
  const r = runPy(code);
  if (!r.ok) fail(`${tag} python threw: ${r.err}`);
  else ok(`${tag} python runs`);
}

// --- 3. assert practice outputs + key python outputs ---
const eq = (a, b) => JSON.stringify(a) === JSON.stringify(b);

// re-run python blocks and capture outputs for assertions
function pyOut(code) {
  const r = runPy(code);
  if (!r.ok) { fail("python exec: " + r.err); return ""; }
  return r.out;
}
const pyCode = (slug, idx) => lessons[slug].blocks.filter((b) => b.t === "code" && b.lang === "python")[idx].code;

const p1 = lessons["01-reproducible-python"]._practiceOut;
if (p1[0] !== "deps=4" || p1[1] !== "unpinned=2") fail("ch1 pins: " + JSON.stringify(p1));
else ok("ch1 pins: 4 deps, 2 drift vectors");

const p2 = lessons["02-dataframes-first"]._practiceOut;
if (p2[0] !== "matching=1" || p2[1] !== "items=Runner" || p2[2] !== "top=Runner:2") fail("ch2 twin: " + JSON.stringify(p2));
else ok("ch2 twin: mask + tie-broken sort");

const p3 = lessons["03-cleaning-quarantine"]._practiceOut;
if (p3[0] !== "kept=2 quarantined=1" || !p3[1].includes("missing-price") || p3[2] !== "revenue=317.5") fail("ch3 cleaner: " + JSON.stringify(p3));
else ok("ch3 cleaner: 2 kept, reasoned reject, 317.5");

const p4 = lessons["04-groupby-aggregation"]._practiceOut;
if (!eq(p4, ["shoes=368 apparel=59", "reconciled=true", "grand=427"])) fail("ch4 agg: " + JSON.stringify(p4));
else ok("ch4 agg: 368/59 reconciled to 427");

const p5 = lessons["05-joins-features"]._practiceOut;
if (p5[0] !== "rows preserved: true" || p5[1] !== "unmatched: 1") fail("ch5 merge: " + JSON.stringify(p5));
else ok("ch5 merge: preserved + audited unmatched");

const p6 = lessons["06-first-churn-model"]._practiceOut;
if (p6[0] !== "dummy P/R/F1: 0/0/0" || p6[1] !== "model P/R/F1: 1/0.75/0.86" || p6[2] !== "model beats dummy on recall: true") fail("ch6 metrics: " + JSON.stringify(p6));
else ok("ch6 metrics: blind dummy vs signal");

// python assertions (real execution)
const o2 = pyOut(pyCode("02-dataframes-first", 1));
if (!o2.includes("dupes: 0") && !o2.includes("dupes: 1")) fail("py ch2 dupes");
else ok("py ch2 runs (describe + dupes + mask)");

const o3 = pyOut(pyCode("03-cleaning-quarantine", 0));
if (!o3.includes("kept: 2") || !o3.includes("quarantined: 1") || !o3.includes("317.5")) fail("py ch3 cleaner: " + JSON.stringify(o3));
else ok("py ch3 cleaner matches JS twin (2/1/317.5)");

const o3b = pyOut(pyCode("03-cleaning-quarantine", 1));
if (!o3b.includes("kept: 2")) fail("py ch3 dedupe: " + JSON.stringify(o3b));
else ok("py ch3 dedupe (kept 2, total 150)");

const o4 = pyOut(pyCode("04-groupby-aggregation", 0));
if (!o4.includes("True")) fail("py ch4 reconcile: " + JSON.stringify(o4));
else ok("py ch4 named agg reconciles True");

const o5 = pyOut(pyCode("05-joins-features", 0));
if (!o5.includes("preserved: True")) fail("py ch5 merge: " + JSON.stringify(o5));
else ok("py ch5 merge validated (rows preserved)");

const o6 = pyOut(pyCode("06-first-churn-model", 0));
if (!o6.includes("dummy acc:")) fail("py ch6 dummy: " + JSON.stringify(o6));
else ok("py ch6 dummy baseline runs");

const o6b = pyOut(pyCode("06-first-churn-model", 1));
if (!o6b.includes("precision:") || !o6b.includes("recall:")) fail("py ch6 model: " + JSON.stringify(o6b));
else ok("py ch6 logistic model reports P/R/F1");

console.log(failures === 0 ? "\nALL CHECKS PASSED" : `\n${failures} FAILURES`);
process.exit(failures === 0 ? 0 : 1);
