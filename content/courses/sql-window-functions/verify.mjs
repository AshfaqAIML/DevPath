// Verification for sql-window-functions: structure + sandbox practice + real-DB spot checks.
// Run: bun content/courses/sql-window-functions/verify.mjs  (exit non-zero on failure)
import { readdir, readFile } from "fs/promises";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import { Database } from "bun:sqlite";
import { DEMO_DATABASE } from "../../../src/lib/sql-dataset.ts";
import { executeSql } from "../../../src/lib/sql-engine.ts";

const DIR = join(dirname(fileURLToPath(import.meta.url)), "lessons");
let failures = 0;
const fail = (m) => { failures++; console.log("FAIL " + m); };
const ok = (m) => console.log("ok " + m);

const BLOCKS = new Set(["h","p","list","callout","code","table","diagram","keytakeaways","interview","practice"]);

// --- 1. course.json ---
const course = JSON.parse(await readFile(join(dirname(fileURLToPath(import.meta.url)), "course.json"), "utf8"));
if (course.courseSlug !== "sql-window-functions") fail("courseSlug");
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
if (!course.prereqSlugs?.includes("sql-intermediate")) fail("prereqSlugs must include sql-intermediate");
ok("course.json: 10Q assessment, project, 6 interviewQs, published, prereqs");

// --- 2. lessons: structure + sandbox practice ---
const files = (await readdir(DIR)).filter((f) => f.endsWith(".json")).sort();
if (files.length !== 6) fail("expected 6 lessons, got " + files.length);
for (const f of files) {
  const l = JSON.parse(await readFile(join(DIR, f), "utf8"));
  const tag = l.slug || f;
  if (!l.title || !l.slug || !l.objective || !l.why || !l.summary || !l.next) fail(tag + " metadata");
  if (!Array.isArray(l.blocks) || l.blocks.length < 8) fail(tag + " blocks");
  for (const b of l.blocks) if (!BLOCKS.has(b.t)) fail(tag + " bad block t=" + b.t);
  if (!Array.isArray(l.quiz) || l.quiz.length < 3) fail(tag + " quiz");
  for (const [i, q] of l.quiz.entries()) {
    if (!q.q || !Array.isArray(q.options) || !Number.isInteger(q.answer) || q.answer < 0 || q.answer >= q.options.length || !q.explain) fail(`${tag} quiz[${i}]`);
  }
  if (!l.exercise?.prompt || !Array.isArray(l.exercise.hints) || l.exercise.hints.length !== 3 || !l.exercise.solution || !l.exercise.why) fail(tag + " exercise");
  for (const b of l.blocks.filter((x) => x.t === "practice")) {
    try { const r = executeSql(DEMO_DATABASE, b.query); ok(`${tag} practice: ${r.rows.length} rows in sandbox`); }
    catch (e) { fail(`${tag} practice must run in sandbox: ${e.message}`); }
  }
}

// --- 3. real-DB spot checks ---
const db = new Database(":memory:");
for (const t of DEMO_DATABASE.tables) {
  db.run(`CREATE TABLE ${t.name} (${t.columns.map((c) => c.name + " " + c.type).join(", ")})`);
  const ins = db.prepare(`INSERT INTO ${t.name} VALUES (${t.columns.map(() => "?").join(", ")})`);
  for (const r of t.rows) ins.run(...r);
}
const must = (label, sql, cond) => {
  try {
    const rows = db.query(sql).all();
    if (cond && !cond(rows)) fail(label + " unexpected: " + JSON.stringify(rows).slice(0, 150));
    else ok(label + ": " + rows.length + " rows");
  } catch (e) { fail(label + " threw: " + e.message); }
};

must("ch1 rank averages", "SELECT role, RANK() OVER (ORDER BY AVG(hours_studied) DESC) FROM developers GROUP BY role", (r) => r.length === 4);
must("ch2 deterministic rn", "SELECT ROW_NUMBER() OVER (ORDER BY hours_studied DESC, id) FROM developers", (r) => r.length === 14);
must("ch2 ntile sizes", "SELECT q, COUNT(*) AS n FROM (SELECT NTILE(4) OVER (ORDER BY hours_studied DESC) AS q FROM developers) GROUP BY q ORDER BY q", (r) => r.length === 4 && r[0].n === 4 && r[2].n === 3);
must("ch2 top2", "SELECT role FROM (SELECT role, ROW_NUMBER() OVER (PARTITION BY role ORDER BY hours_studied DESC, id) AS rn FROM developers) WHERE rn <= 2", (r) => r.length === 8);
must("ch3 gaps", "SELECT hours_studied - LAG(hours_studied, 1, hours_studied) OVER (ORDER BY hours_studied DESC) AS g FROM developers", (r) => r.length === 14 && r[0].g === 0);
must("ch3 endpoints", "SELECT DISTINCT role, FIRST_VALUE(hours_studied) OVER w, LAST_VALUE(hours_studied) OVER (PARTITION BY role ORDER BY hours_studied DESC ROWS BETWEEN UNBOUNDED PRECEDING AND UNBOUNDED FOLLOWING) FROM developers WINDOW w AS (PARTITION BY role ORDER BY hours_studied DESC)", (r) => r.length === 4);
must("ch4 moving avg", "SELECT AVG(hours_studied) OVER (ORDER BY hours_studied DESC ROWS BETWEEN 2 PRECEDING AND CURRENT ROW) FROM developers", (r) => r.length === 14);
must("ch4 range peers", "SELECT COUNT(*) OVER (ORDER BY hours_studied RANGE BETWEEN 100 PRECEDING AND CURRENT ROW) FROM developers", (r) => r.length === 14);
must("ch4 exclude", "SELECT AVG(hours_studied) OVER (PARTITION BY role ROWS BETWEEN UNBOUNDED PRECEDING AND UNBOUNDED FOLLOWING EXCLUDE CURRENT ROW) FROM developers", (r) => r.length === 14);
must("ch5 filter", "SELECT course_id, COUNT(*) FILTER (WHERE completed = 1) AS d FROM enrollments GROUP BY course_id", (r) => r.length >= 1);
must("ch5 qualify emulation", "SELECT name FROM (SELECT name, RANK() OVER (ORDER BY hours_studied DESC) AS rnk FROM developers) WHERE rnk <= 3", (r) => r.length >= 3);
must("ch5 chained", "WITH ranked AS (SELECT role, RANK() OVER (ORDER BY hours_studied DESC) AS rnk FROM developers) SELECT role, AVG(rnk) FROM ranked GROUP BY role", (r) => r.length === 4);
must("ch6 tiers", "SELECT NTILE(4) OVER (ORDER BY hours_studied DESC) AS t FROM developers", (r) => r.length === 14);
must("ch6 fusion", "WITH tiered AS (SELECT name, role, hours_studied, NTILE(4) OVER (ORDER BY hours_studied DESC) AS tier, AVG(hours_studied) OVER (PARTITION BY role) AS ra FROM developers) SELECT name, tier, CASE WHEN hours_studied >= ra THEN 'above' ELSE 'below' END FROM tiered", (r) => r.length === 14);

console.log(failures === 0 ? "\nALL CHECKS PASSED" : `\n${failures} FAILURES`);
process.exit(failures === 0 ? 0 : 1);
