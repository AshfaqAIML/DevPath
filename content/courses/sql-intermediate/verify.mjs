// Verification for sql-intermediate: structure + sandbox practice + real-DB spot checks.
// Run: bun content/courses/sql-intermediate/verify.mjs  (exit non-zero on failure)
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
if (course.courseSlug !== "sql-intermediate") fail("courseSlug");
if (!Array.isArray(course.assessment) || course.assessment.length !== 12) fail("assessment must be 12, got " + course.assessment?.length);
for (const [i, q] of course.assessment.entries()) {
  if (!q.q || !Array.isArray(q.options) || q.options.length < 3) fail(`assessment[${i}] shape`);
  if (!Number.isInteger(q.answer) || q.answer < 0 || q.answer >= q.options.length) fail(`assessment[${i}] answer range`);
  if (!q.explain) fail(`assessment[${i}] explain`);
}
for (const k of ["requirements","technical","steps","evaluation","stretch"]) {
  if (!course.project || !Array.isArray(course.project[k]) || course.project[k].length === 0) fail("project." + k);
}
if (!course.project?.title || !course.project?.summary) fail("project title/summary");
if (typeof course.project?.architecture !== "string" || course.project.architecture.length < 50) fail("project.architecture");
if (!Array.isArray(course.interviewQs) || course.interviewQs.length !== 6) fail("interviewQs must be 6");
if (course.contentStatus !== "published") fail("contentStatus should be published");
ok("course.json: 12Q assessment, project, 6 interviewQs, published");

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

// --- 3. real-DB spot checks (bun:sqlite mirrors the teaching dataset) ---
const db = new Database(":memory:");
for (const t of DEMO_DATABASE.tables) {
  db.run(`CREATE TABLE ${t.name} (${t.columns.map((c) => c.name + " " + c.type).join(", ")})`);
  const ins = db.prepare(`INSERT INTO ${t.name} VALUES (${t.columns.map(() => "?").join(", ")})`);
  for (const r of t.rows) ins.run(...r);
}
const must = (label, sql, cond) => {
  try {
    const rows = db.query(sql).all();
    if (cond && !cond(rows)) fail(label + " returned unexpected rows: " + JSON.stringify(rows).slice(0, 120));
    else ok(label + ": " + rows.length + " rows");
  } catch (e) { fail(label + " threw: " + e.message); }
};
const mustFail = (label, sql) => {
  try { db.query(sql).all(); fail(label + " should have thrown"); }
  catch { ok(label + " correctly rejected"); }
};

must("ch4 CASE buckets", "SELECT name, CASE WHEN hours_studied >= 800 THEN 'deep' WHEN hours_studied >= 400 THEN 'steady' ELSE 'ramping' END AS pace FROM developers ORDER BY hours_studied DESC", (r) => r.length === 14 && r[0].pace === "deep");
must("ch4 conditional rate", "SELECT c.title, COUNT(e.id) AS t, COUNT(CASE WHEN e.completed = 1 THEN 1 END) AS d FROM courses c LEFT JOIN enrollments e ON e.course_id = c.id GROUP BY c.id", (r) => r.length === 16);
must("ch4 initials", "SELECT UPPER(SUBSTR(name, 1, 1)) || '. ' || SUBSTR(name, INSTR(name, ' ') + 1, 1) || '.' FROM developers", (r) => r.length === 14);
must("ch4 role CASE report", "SELECT role, COUNT(*) d, CASE WHEN AVG(hours_studied) >= 700 THEN 'deep' WHEN AVG(hours_studied) >= 400 THEN 'steady' ELSE 'ramping' END AS pace FROM developers GROUP BY role", (r) => r.length === 4);
must("ch5 self-join pairs", "SELECT a.name, b.name FROM developers a JOIN developers b ON a.country = b.country AND a.id < b.id", (r) => r.length >= 1);
must("ch5 band join", "SELECT d.name FROM developers d JOIN (SELECT 'ramping' AS pace, 0 AS lo, 399 AS hi UNION ALL SELECT 'steady', 400, 799 UNION ALL SELECT 'deep', 800, 999999) AS bands ON d.hours_studied BETWEEN bands.lo AND bands.hi", (r) => r.length === 14);
must("ch5 buddies", "SELECT a.name, b.name FROM developers a JOIN developers b ON a.level = b.level AND a.id < b.id WHERE (a.hours_studied - b.hours_studied) BETWEEN -100 AND 100", (r) => r.length >= 1);
must("ch6 view lifecycle", "CREATE VIEW v_eng AS SELECT c.id, COUNT(e.id) AS n FROM courses c LEFT JOIN enrollments e ON e.course_id = c.id GROUP BY c.id", null);
must("ch6 view consume", "SELECT * FROM v_eng WHERE n = 0", (r) => r.length === 2);
db.run("DROP VIEW v_eng");
must("ch6 sqlite txn evolve", "BEGIN", null);
db.run("CREATE VIEW v_eng AS SELECT id FROM courses");
db.run("DROP VIEW v_eng");
db.run("COMMIT");
mustFail("ch6 OR REPLACE is PG-only", "CREATE OR REPLACE VIEW v_eng AS SELECT 1");
must("ch7 constrained DDL", "CREATE TABLE t_dev (id INTEGER PRIMARY KEY, name TEXT NOT NULL, email TEXT UNIQUE, hours_studied INTEGER NOT NULL DEFAULT 0 CHECK (hours_studied >= 0))", null);
must("ch7 FK DDL", "CREATE TABLE t_enr (id INTEGER PRIMARY KEY, developer_id INTEGER NOT NULL REFERENCES t_dev(id) ON DELETE CASCADE, progress INTEGER NOT NULL DEFAULT 0 CHECK (progress BETWEEN 0 AND 100))", null);
db.run("INSERT INTO t_dev (name, email) VALUES ('Test Dev', 't@x.io')");
mustFail("ch7 CHECK rejects negatives", "INSERT INTO t_dev (name, hours_studied) VALUES ('Bad', -5)");
mustFail("ch7 UNIQUE rejects dupes", "INSERT INTO t_dev (name, email) VALUES ('Clone', 't@x.io')");
must("ch8 EXPLAIN", "EXPLAIN QUERY PLAN SELECT name FROM developers WHERE country = 'Japan'", (r) => r.length >= 1);
db.run("CREATE INDEX idx_dev_country ON developers(country)");
must("ch8 SEARCH after index", "EXPLAIN QUERY PLAN SELECT name FROM developers WHERE country = 'Japan'", (r) => JSON.stringify(r).includes("SEARCH"));
must("ch9 fixed leaderboard", "SELECT role, COUNT(*) AS devs FROM developers GROUP BY role HAVING COUNT(*) > 1 ORDER BY devs DESC", (r) => r.length >= 1 && r[0].devs >= r[r.length - 1].devs);
must("ch10 funnel", "SELECT COUNT(*) AS t, COUNT(CASE WHEN completed = 1 THEN 1 END) AS c FROM enrollments", (r) => r[0].t === 28);
must("ch10 segmented", "SELECT c.topic, COUNT(*) AS t FROM courses c LEFT JOIN enrollments e ON e.course_id = c.id GROUP BY c.topic", (r) => r.length >= 1);

console.log(failures === 0 ? "\nALL CHECKS PASSED" : `\n${failures} FAILURES`);
process.exit(failures === 0 ? 0 : 1);
