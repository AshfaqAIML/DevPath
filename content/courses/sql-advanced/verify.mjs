// Verification for sql-advanced: structure + sandbox practice + real-DB spot checks.
// Run: bun content/courses/sql-advanced/verify.mjs  (exit non-zero on failure)
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
if (course.courseSlug !== "sql-advanced") fail("courseSlug");
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
if (!course.prereqSlugs?.includes("sql-intermediate")) fail("prereqSlugs must include sql-intermediate");
ok("course.json: 12Q assessment, project, 6 interviewQs, published, prereqs");

// --- 2. lessons: structure + sandbox practice ---
const files = (await readdir(DIR)).filter((f) => f.endsWith(".json")).sort();
if (files.length !== 10) fail("expected 10 lessons, got " + files.length);
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
const mustFail = (label, sql) => {
  try { db.query(sql).all(); fail(label + " should have thrown"); }
  catch { ok(label + " correctly rejected"); }
};

must("ch1 plan", "EXPLAIN QUERY PLAN SELECT d.name FROM developers d LEFT JOIN enrollments e ON e.developer_id = d.id GROUP BY d.id", (r) => r.length >= 1);
must("ch2 composite", "CREATE INDEX idx_t1 ON enrollments(course_id, completed)", null);
must("ch2 left-prefix probe", "EXPLAIN QUERY PLAN SELECT * FROM enrollments WHERE course_id = 5", (r) => JSON.stringify(r).includes("SEARCH"));
must("ch3 sargable range", "SELECT name FROM developers WHERE hours_studied > 400", (r) => r.length === 9);
must("ch3 flattened", "SELECT d.name, COALESCE(p.n, 0) AS n FROM developers d LEFT JOIN (SELECT developer_id, COUNT(*) AS n FROM enrollments GROUP BY developer_id) AS p ON p.developer_id = d.id", (r) => r.length === 14);
must("ch3 OR split", "SELECT id FROM developers WHERE country = 'Japan' UNION ALL SELECT id FROM developers WHERE role = 'backend' AND country <> 'Japan'", (r) => r.length >= 1);
must("ch4 counter", "WITH RECURSIVE counter(n) AS (SELECT 1 UNION ALL SELECT n + 1 FROM counter WHERE n < 10) SELECT n FROM counter", (r) => r.length === 10 && r[9].n === 10);
must("ch4 hierarchy", "WITH RECURSIVE org(id, name, mgr) AS (VALUES (1, 'Ava', NULL), (2, 'Ben', 1), (3, 'Cy', 1), (4, 'Dee', 2)), chain(id, name, depth, path) AS (SELECT id, name, 0, name FROM org WHERE mgr IS NULL UNION ALL SELECT o.id, o.name, c.depth + 1, c.path || ' > ' || o.name FROM org o JOIN chain c ON o.mgr = c.id WHERE c.depth < 20) SELECT name, depth, path FROM chain ORDER BY path", (r) => r.length === 4 && r.some((x) => x.depth === 2));
must("ch4 prereq chain", "WITH RECURSIVE prereq(course_id, needs_id) AS (VALUES (8, 5), (5, 3), (3, 1)), chain(current_id, depth) AS (SELECT needs_id, 1 FROM prereq WHERE course_id = 8 UNION ALL SELECT p.needs_id, c.depth + 1 FROM prereq p JOIN chain c ON p.course_id = c.current_id WHERE c.depth < 20) SELECT current_id, depth FROM chain ORDER BY depth", (r) => r.length === 3 && r[2].current_id === 1);
must("ch5 annotated", "SELECT name, AVG(hours_studied) OVER (PARTITION BY role) AS ra FROM developers", (r) => r.length === 14);
must("ch5 ranks", "SELECT ROW_NUMBER() OVER (ORDER BY hours_studied DESC) AS rn, RANK() OVER (ORDER BY hours_studied DESC) AS rk, DENSE_RANK() OVER (ORDER BY hours_studied DESC) AS dr FROM developers", (r) => r.length === 14);
must("ch5 top2", "SELECT role, name FROM (SELECT role, name, ROW_NUMBER() OVER (PARTITION BY role ORDER BY hours_studied DESC) AS rn FROM developers) WHERE rn <= 2", (r) => r.length === 8);
must("ch6 txn", "BEGIN", null);
db.run("INSERT INTO enrollments (developer_id, course_id, progress, completed) VALUES (1, 1, 0, 0)");
db.run("ROLLBACK");
must("ch6 rollback", "SELECT COUNT(*) AS n FROM enrollments", (r) => r[0].n === 28);
must("ch7 temp staging", "CREATE TEMP TABLE heavy AS SELECT course_id, COUNT(*) AS n FROM enrollments GROUP BY course_id", null);
must("ch7 temp consume", "SELECT COUNT(*) AS n FROM heavy", (r) => r[0].n >= 1);
must("ch8 sargable", "SELECT * FROM courses WHERE published = 1", (r) => r.length >= 1);
must("ch9 probes", "SELECT COUNT(*) AS n FROM enrollments WHERE progress > 90", (r) => r.length === 1);
must("ch10 baseline", "SELECT d.name, COUNT(*) AS s, SUM(e.completed) AS d2 FROM developers d JOIN enrollments e ON e.developer_id = d.id GROUP BY d.id HAVING SUM(e.completed) = 0", (r) => Array.isArray(r));
mustFail("shape: UNION mismatch", "SELECT name, hours_studied FROM developers UNION ALL SELECT title FROM courses");

console.log(failures === 0 ? "\nALL CHECKS PASSED" : `\n${failures} FAILURES`);
process.exit(failures === 0 ? 0 : 1);
