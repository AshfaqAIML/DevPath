// Verification for crewai-e-commerce-agent-teams: structure + execute every JS practice snippet.
// Run: bun content/courses/crewai-e-commerce-agent-teams/verify.mjs  (exit non-zero on failure)
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
if (course.courseSlug !== "crewai-e-commerce-agent-teams") fail("courseSlug");
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

const p1 = lessons["01-from-graphs-to-teams"]._practiceOut;
if (!eq(p1, ["solo acc=0.9 ctx=2000", "team acc=0.913", "team ctx=4400", "verdict=team wins"])) fail("ch1 pricing: " + JSON.stringify(p1));
else ok("ch1 pricing: marginal team win at 2.2x context");

const p2 = lessons["02-role-design"]._practiceOut;
if (p2[0] !== "pairs flagged: 2") fail("ch2 count: " + JSON.stringify(p2));
else if (!(p2.some((l) => l.includes("Quality")) && p2.some((l) => l.includes("Finance")))) fail("ch2 pairs: " + JSON.stringify(p2));
else ok("ch2 audit: true overlap + mustNot false positive");

const p3 = lessons["03-tasks-delegation-contracts"]._practiceOut;
{
  const rs = p3.map((l) => JSON.parse(l));
  if (rs[0].ok !== false || !rs[0].error.includes("triageTask.confidence")) fail("ch3 missing-both: " + p3[0]);
  else if (rs[1].ok !== false || rs[1].error !== "missing-context:triageTask.confidence") fail("ch3 missing-one: " + p3[1]);
  else if (rs[2].ok !== true || Object.keys(rs[2].input).length !== 2) fail("ch3 ok: " + p3[2]);
  else if (rs[3].ok !== true) fail("ch3 empty: " + p3[3]);
  else ok("ch3 handoff gate: missing/missing-one/ok/ok-empty");
}

const p4 = lessons["04-sequential-crews"]._practiceOut;
if (!eq(p4, ["ok=true", "stages=research,write,review", "draft=Draft re 30-day window"])) fail("ch4 pipeline: " + JSON.stringify(p4));
else ok("ch4 pipeline: gated stages carry facts forward");

const p5 = lessons["05-hierarchical-crews"]._practiceOut;
if (!eq(p5, ["ok=true rounds=2", "history=checker,drafter", "loop guard: ok=false reason=budget-exhausted"])) fail("ch5 budget: " + JSON.stringify(p5));
else ok("ch5 managed loop: done-flags finish, budgets finish loops");

const p6 = lessons["06-handoffs-task-board"]._practiceOut;
if (!eq(p6, ["a-claims-t1: true", "b-claims-t1: false", "b-completes-t1: false", "a-completes-t1: true"])) fail("ch6 board: " + JSON.stringify(p6));
else ok("ch6 board: first-claim wins, rights enforced");

const p7 = lessons["07-tools-per-role"]._practiceOut;
if (p7[0] !== "findings: 1" || !p7[1].includes("drafter")) fail("ch7 audit: " + JSON.stringify(p7));
else ok("ch7 tool audit: exactly the drafter violation");

const p8 = lessons["08-evaluating-teams"]._practiceOut;
{
  const g = JSON.parse(p8[0]), bad = JSON.parse(p8[1]);
  if (g.pass !== true || g.issues.length !== 0) fail("ch8 good run");
  else if (bad.pass !== false || !bad.issues.includes("triage.category")) fail("ch8 bad run: " + p8[1]);
  else ok("ch8 attribution: owner named on failure");
}

const p9 = lessons["09-team-failure-modes"]._practiceOut;
{
  const rs = p9.map((l) => JSON.parse(l));
  if (rs[0].drift !== false) fail("ch9 clean reviewer");
  else if (rs[1].drift !== true || !rs[1].extra.includes("rewrittenCopy")) fail("ch9 rewrite drift: " + p9[1]);
  else if (rs[2].drift !== false) fail("ch9 subset");
  else if (rs[3].drift !== true || !rs[3].extra.includes("essay")) fail("ch9 essay drift");
  else ok("ch9 drift detector: clean/drift/subset/drift");
}

const p10 = lessons["10-marketplace-crew-capstone"]._practiceOut;
if (!p10.slice(0, 4).every((l) => l.startsWith("PASS")) || p10[4] !== "manifest sound") fail("ch10 manifest: " + JSON.stringify(p10));
else ok("ch10 manifest audit: 4 PASS + sound");

console.log(failures === 0 ? "\nALL CHECKS PASSED" : `\n${failures} FAILURES`);
process.exit(failures === 0 ? 0 : 1);
