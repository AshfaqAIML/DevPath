// Verification for spring-ai-for-e-commerce: structure + execute every JS practice snippet.
// Run: bun content/courses/spring-ai-for-e-commerce/verify.mjs  (exit non-zero on failure)
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
if (course.courseSlug !== "spring-ai-for-e-commerce") fail("courseSlug");
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
if (!course.prereqSlugs?.includes("rag-agents-for-e-commerce")) fail("prereq must include rag-agents-for-e-commerce");
if (!course.technologies?.some((t) => t.includes("2.0.1"))) fail("version basis must cite verified reference");
ok("course.json: 10Q assessment, project, 6 interviewQs, published, versioned prereqs");

// --- 2. lessons: structure + execute practice JS ---
function runJS(code) {
  const lines = [];
  const fn = new Function("console", code);
  fn({ log: (...a) => lines.push(a.join(" ")) });
  return lines;
}

const files = (await readdir(DIR)).filter((f) => f.endsWith(".json")).sort();
if (files.length !== 8) fail("expected 8 lessons, got " + files.length);

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

const p1 = lessons["01-spring-ai-landscape"]._practiceOut;
if (p1[2] !== "minimal for chat-only: 2 starters") fail("ch1 minimal: " + JSON.stringify(p1));
else if (p1[0].split(",").length !== 2 || p1[1].split(",").length !== 5) fail("ch1 counts: " + JSON.stringify(p1));
else ok("ch1 starters: 2 vs 5 by need");

const p2 = lessons["02-chatclient-fluency"]._practiceOut;
if (!eq(p2.slice(0, 4), ["prompt->user->call->content", "prompt->user->call->entity(Class, spec?)", "prompt->user->stream->content", "prompt->user->stream->collect->convert(BeanOutputConverter)"]) || p2[4] !== "unknown=null") fail("ch2 chains: " + JSON.stringify(p2));
else ok("ch2 call shapes incl. streaming bridge");

const p3 = lessons["03-advisors-memory-rag"]._practiceOut;
if (p3[0] !== "memory,rag,logger" || p3[1] !== "memory-before-rag: true" || p3[3] !== "memory-before-rag: false") fail("ch3 order: " + JSON.stringify(p3));
else ok("ch3 advisor order: semantics + absence signal");

const p4 = lessons["04-structured-output"]._practiceOut;
{
  const [a, b, c] = p4.map((l) => JSON.parse(l));
  if (a.ok !== true) fail("ch4 ok: " + p4[0]);
  else if (b.ok !== false) fail("ch4 enum: " + p4[1]);
  else if (c.ok !== false) fail("ch4 missing: " + p4[2]);
  else ok("ch4 entity validation: ok/enum/missing named");
}

const p5 = lessons["05-tool-calling"]._practiceOut;
if (p5[0] !== "memory,rag,tools" || p5[1] !== "tools,audit") fail("ch5 order: " + JSON.stringify(p5));
else ok("ch5 advisor order incl. audit-outside");

const p6 = lessons["06-rag-spring"]._practiceOut;
if (p6[0] !== "a,b,c" || p6[1] !== "a,c" || p6[2] !== "empty-correct") fail("ch6 filter: " + JSON.stringify(p6));
else ok("ch6 metadata filters: exact prune + abstain");

const p7 = lessons["07-eval-observability"]._practiceOut;
{
  const g = JSON.parse(p7[0]), bad = JSON.parse(p7[1]);
  if (g.pass !== true || g.issues.length !== 0) fail("ch7 good run");
  else if (bad.pass !== false || !bad.issues.includes("retrieval")) fail("ch7 bad run: " + p7[1]);
  else ok("ch7 attribution: owner named on failure");
}

const p8 = lessons["08-storefront-capstone"]._practiceOut;
if (!p8.slice(0, 5).every((l) => l.startsWith("PASS")) || p8[5] !== "manifest sound") fail("ch8 manifest: " + JSON.stringify(p8));
else ok("ch8 manifest audit: 5 PASS + sound");

console.log(failures === 0 ? "\nALL CHECKS PASSED" : `\n${failures} FAILURES`);
process.exit(failures === 0 ? 0 : 1);
