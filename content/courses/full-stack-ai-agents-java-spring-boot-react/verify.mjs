// Verification for full-stack-ai-agents: structure + execute every JS practice snippet.
// Run: bun content/courses/full-stack-ai-agents-java-spring-boot-react/verify.mjs
import { readdir, readFile } from "fs/promises";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const DIR = join(dirname(fileURLToPath(import.meta.url)), "lessons");
let failures = 0;
const fail = (m) => { failures++; console.log("FAIL " + m); };
const ok = (m) => console.log("ok " + m);

const BLOCKS = new Set(["h","p","list","callout","code","table","diagram","keytakeaways","interview","practice"]);

const course = JSON.parse(await readFile(join(dirname(fileURLToPath(import.meta.url)), "course.json"), "utf8"));
if (course.courseSlug !== "full-stack-ai-agents-java-spring-boot-react") fail("courseSlug");
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
if (!course.prereqSlugs?.includes("spring-ai-for-e-commerce")) fail("prereq must include spring-ai-for-e-commerce");
ok("course.json: 10Q assessment, project, 6 interviewQs, published, prereqs");

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
    if (b.t === "code" && (b.lang === "js" || !b.lang) && !b.code.includes("import ")) {
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

const eq = (a, b) => JSON.stringify(a) === JSON.stringify(b);

const p1 = lessons["01-one-repo-one-product"]._practiceOut;
if (!eq(p1, ["v1+v1=true", "v1+v2=true", "v2+v1=false", "v2+v2=true"])) fail("ch1 compat: " + JSON.stringify(p1));
else ok("ch1 compatibility: directional tolerance");

const p2 = lessons["02-boot-api-design"]._practiceOut;
if (p2.length !== 5 || !p2[1].includes("VIOLATION: mutation on GET") || !p2[4].includes("VIOLATION: untyped stream")) fail("ch2 endpoints: " + JSON.stringify(p2));
else ok("ch2 endpoint audit: 3 violations named");

const p3 = lessons["03-auth-tenant-isolation"]._practiceOut;
if (p3.length !== 4) fail("ch3 count: " + JSON.stringify(p3));
else ok("ch3 ownership: scoped + refusals + proof");

const p4 = lessons["04-react-streaming-ui"]._practiceOut;
if (p4[0] !== '"Hello world"' || p4[1] !== "complete" || p4[2] !== "tolerated-unknown: true") fail("ch4 stream: " + JSON.stringify(p4));
else ok("ch4 reducer: accumulate/tolerate/commit");

const p5 = lessons["05-tool-endpoints"]._practiceOut;
if (JSON.stringify(p5) !== JSON.stringify(["auth","key","gate","key","ok"])) fail("ch5 guards: " + JSON.stringify(p5));
else ok("ch5 guard chain: auth/keys/gates ordered");

const p6 = lessons["06-persistence"]._practiceOut;
if (p6[0] !== "t1" || !p6[1].includes("forbidden") || !p6[2].includes("Returns")) fail("ch6 store: " + JSON.stringify(p6));
else ok("ch6 ownership: scoped list + refused cross-read");

const p7 = lessons["07-fullstack-eval"]._practiceOut;
{
  const g = JSON.parse(p7[0]), bad = JSON.parse(p7[1]);
  if (g.pass !== true || g.issues.length !== 0) fail("ch7 good run");
  else if (bad.pass !== false || !bad.issues.includes("stream.resumed")) fail("ch7 bad run: " + p7[1]);
  else ok("ch7 layered gold: pass + stream attribution");
}

const p8 = lessons["08-ship-review"]._practiceOut;
if (!p8.slice(0, 6).every((l) => l.startsWith("PASS")) || p8[6] !== "conditional approval") fail("ch8 bundle: " + JSON.stringify(p8));
else ok("ch8 bundle audit: 6 PASS + conditional");

console.log(failures === 0 ? "\nALL CHECKS PASSED" : `\n${failures} FAILURES`);
process.exit(failures === 0 ? 0 : 1);
