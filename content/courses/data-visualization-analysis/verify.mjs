// Verification for data-visualization-analysis: structure + execute every JS practice snippet.
// Run: bun content/courses/data-visualization-analysis/verify.mjs
import { readdir, readFile } from "fs/promises";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const DIR = join(dirname(fileURLToPath(import.meta.url)), "lessons");
let failures = 0;
const fail = (m) => { failures++; console.log("FAIL " + m); };
const ok = (m) => console.log("ok " + m);

const BLOCKS = new Set(["h","p","list","callout","code","table","diagram","keytakeaways","interview","practice"]);

const course = JSON.parse(await readFile(join(dirname(fileURLToPath(import.meta.url)), "course.json"), "utf8"));
if (course.courseSlug !== "data-visualization-analysis") fail("courseSlug");
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
if (!course.prereqSlugs?.includes("python-pandas-ml-genai-for-e-commerce")) fail("prereq must include python course");
ok("course.json: 12Q assessment, project, 6 interviewQs, published, prereqs");

function runJS(code) {
  const lines = [];
  const fn = new Function("console", code);
  fn({ log: (...a) => lines.push(a.join(" ")) });
  return lines;
}

const files = (await readdir(DIR)).filter((f) => f.endsWith(".json")).sort();
if (files.length !== 11) fail("expected 11 lessons, got " + files.length);

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

const eq = (a, b) => JSON.stringify(a) === JSON.stringify(b);

const p1 = lessons["01-profile-first"]._practiceOut;
if (!eq(p1, ["rows=4 cols=3", "total missing=1 max=99999", "outlier flagged: true"])) fail("ch1 profile: " + JSON.stringify(p1));
else ok("ch1 profiler: shape/missing/outlier routed");

const p2 = lessons["02-chart-selection"]._practiceOut;
if (!eq(p2, ["6/6 questions routed"])) fail("ch2 routing: " + JSON.stringify(p2));
else ok("ch2 router: 6/6 incl. clarify fallback");

const p3 = lessons["03-distributions"]._practiceOut;
if (p3[0] !== "bins5=4,0,0,0,4" || p3[1] !== "bins2=4,4" || p3[2] !== "peaks-stable: true") fail("ch3 bins: " + JSON.stringify(p3));
else ok("ch3 bins: twin peaks vs merged lie");

const p4 = lessons["04-time-trends"]._practiceOut;
if (!p4[0].includes("2026-09-28:2pts") || p4[1] !== "gap visible: true") fail("ch4 resample: " + JSON.stringify(p4));
else ok("ch4 resample: weeks + flagged gap");

const p5 = lessons["05-comparisons"]._practiceOut;
if (p5[0] !== "1.shoes,2.hats,3.apparel" || p5[1] !== "leader=shoes margin=158") fail("ch5 rank: " + JSON.stringify(p5));
else ok("ch5 ranking: sorted + margin");

const p6 = lessons["06-part-to-whole"]._practiceOut;
if (p6[0] !== "shoes=57.8% hats=33% apparel=9.3%" || p6[1] !== "sums-to-100: true") fail("ch6 shares: " + JSON.stringify(p6));
else ok("ch6 shares: normalized with sum check");

const p7 = lessons["07-relationships"]._practiceOut;
if (p7[0] !== "A:110/4.10 | B:210/4.85") fail("ch7 strata: " + JSON.stringify(p7));
else ok("ch7 stratification: brand means dissolve trend");

const p8 = lessons["08-kpi-dashboards"]._practiceOut;
if (p8[0] !== "visits rate=100% drop=0%" || p8[2] !== "carts rate=22.2% drop=77.8%" || !p8[4].includes("views->carts")) fail("ch8 funnel: " + JSON.stringify(p8));
else ok("ch8 funnel: cliff located and sized");

const p9 = lessons["09-misleading-gallery"]._practiceOut;
if (p9[0] !== "truncated bars: 246" || p9[1] !== "honest bars: 1") fail("ch9 lie factor: " + JSON.stringify(p9));
else ok("ch9 lie factor: 246x vs 1.0");

const p10 = lessons["10-storytelling"]._practiceOut;
if (p10.length !== 3) fail("ch10 count: " + JSON.stringify(p10));
else ok("ch10 titles: argue+cite vs describe-nothing");

const p11 = lessons["11-category-report-capstone"]._practiceOut;
if (!p11.slice(0, 5).every((l) => l.startsWith("PASS")) || p11[5] !== "report shippable") fail("ch11 manifest: " + JSON.stringify(p11));
else ok("ch11 manifest audit: 5 PASS + shippable");

console.log(failures === 0 ? "\nALL CHECKS PASSED" : `\n${failures} FAILURES`);
process.exit(failures === 0 ? 0 : 1);
