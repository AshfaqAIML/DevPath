// Verification for opendataloader-pdf: structure + execute every JS practice snippet.
// Run: bun content/courses/opendataloader-pdf/verify.mjs  (exit non-zero on failure)
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
if (course.courseSlug !== "opendataloader-pdf") fail("courseSlug");
if (!Array.isArray(course.assessment) || course.assessment.length !== 8) fail("assessment must be 8");
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
if (!Array.isArray(course.interviewQs) || course.interviewQs.length !== 5) fail("interviewQs must be 5");
for (const [i, qa] of course.interviewQs.entries()) if (!qa.q || !qa.a || qa.a.length < 100) fail(`interviewQs[${i}] thin`);
if (course.contentStatus !== "published") fail("contentStatus should be published");
ok("course.json: 8Q assessment, project, 5 interviewQs, published");

// --- 2. lessons: structure + execute practice JS ---
function runJS(code) {
  const lines = [];
  const fn = new Function("console", code);
  fn({ log: (...a) => lines.push(a.join(" ")) });
  return lines;
}

const files = (await readdir(DIR)).filter((f) => f.endsWith(".json")).sort();
if (files.length !== 5) fail("expected 5 lessons, got " + files.length);

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

// --- 3. assert practice outputs (the lesson's stated expectations) ---
const p1 = lessons["01-messy-sources-clean-datasets"]._practiceOut;
if (JSON.stringify(p1) !== JSON.stringify(["1-3 -> text-extract","4-9 -> ocr","10-10 -> inspect-manually","11-20 -> ocr-fallback"])) fail("ch1 routing outputs");
else ok("ch1 routing: evidence-based paths in order");

const p2 = lessons["02-extract-text-that-survives"]._practiceOut;
if (p2.length !== 1 || p2[0] !== JSON.stringify("The customer portal spans multiple lines.\n\nPage 12 of 40")) fail("ch2 repair output: " + JSON.stringify(p2));
else ok("ch2 repair: hyphen rejoined, soft break joined, paragraph preserved");

const p3 = lessons["03-schemas-validation-quarantine"]._practiceOut;
if (!p3[p3.length - 1].includes("clean: 2, quarantined: 2")) fail("ch3 counts: " + JSON.stringify(p3));
else if (p3.filter((l) => l.startsWith("REJECT")).length !== 2) fail("ch3 reject lines");
else ok("ch3 quarantine: 2 clean, 2 reasoned rejects");

const p4 = lessons["04-cleanup-cookbook"]._practiceOut;
{
  const parts = p4.map((l) => l.split(" -> "));
  const [a, b, c, d, e] = parts;
  if (a[1] !== b[1] || !a[1].includes("ller")) fail("ch4 convergence: " + JSON.stringify(p4.slice(0, 2)));
  else if (a[0] === b[0]) fail("ch4 inputs must differ (two encodings)");
  else if (!c[1].includes("double space") || c[1].includes("  ")) fail("ch4 collapse: " + JSON.stringify(c));
  else if (!d[1].endsWith("mojibake=true")) fail("ch4 mojibake still flags after normalize");
  else if (!e[1].endsWith("mojibake=false")) fail("ch4 clean stays clean");
  else ok("ch4 normalize: convergence + collapse + ordered detection");
}

const p5 = lessons["05-chunk-ship-measure"]._practiceOut;
{
  const ranked = JSON.parse(p5[0]);
  if (ranked[0].id !== "manual#p0") fail("ch5 top hit: " + p5[0]);
  else if (!(ranked[0].score >= ranked[1].score && ranked[1].score >= ranked[2].score)) fail("ch5 ordering");
  else if (ranked[2].score !== 0) fail("ch5 zero-overlap honesty");
  else ok("ch5 retrieval: p0 > p2 > p1=0, honest zeros");
}

console.log(failures === 0 ? "\nALL CHECKS PASSED" : `\n${failures} FAILURES`);
process.exit(failures === 0 ? 0 : 1);
