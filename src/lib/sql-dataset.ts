// ---------------------------------------------------------------------------
// sql-dataset.ts — the SQL Query Sandbox's teaching database.
//
// A small, deliberately human-scale DevPath-themed schema: developers take
// courses and their progress lands in enrollments. The data is tuned so that
// every mission has a satisfying, verifiable answer and every JOIN tells a
// little story.
// ---------------------------------------------------------------------------

import type { SqlDatabase, SqlResultSet } from "./sql-engine";

export const DEMO_DATABASE: SqlDatabase = {
  tables: [
    {
      name: "developers",
      columns: [
        { name: "id", type: "INTEGER" },
        { name: "name", type: "TEXT" },
        { name: "role", type: "TEXT" },
        { name: "level", type: "TEXT" },
        { name: "country", type: "TEXT" },
        { name: "hours_studied", type: "INTEGER" },
      ],
      rows: [
        [1, "Maya Chen", "frontend", "Advanced", "Taiwan", 912],
        [2, "Jonas Weber", "backend", "Intermediate", "Germany", 534],
        [3, "Priya Sharma", "fullstack", "Intermediate", "India", 648],
        [4, "Diego Alvarez", "frontend", "Beginner", "Mexico", 186],
        [5, "Sofia Rossi", "devops", "Advanced", "Italy", 871],
        [6, "Kenji Tanaka", "backend", "Advanced", "Japan", 947],
        [7, "Amara Okafor", "fullstack", "Beginner", "Nigeria", 224],
        [8, "Liam Murphy", "frontend", "Intermediate", "Ireland", 402],
        [9, "Nadia Petrova", "backend", "Beginner", "Bulgaria", 158],
        [10, "Tom Baker", "devops", "Intermediate", "United Kingdom", 465],
        [11, "Yuki Sato", "frontend", "Beginner", "Japan", 205],
        [12, "Elena Novak", "fullstack", "Advanced", "Czechia", 783],
        [13, "Marcus Johnson", "frontend", "Intermediate", "United States", 519],
        [14, "Aisha Hassan", "backend", "Intermediate", "Egypt", 366],
      ],
    },
    {
      name: "courses",
      columns: [
        { name: "id", type: "INTEGER" },
        { name: "title", type: "TEXT" },
        { name: "topic", type: "TEXT" },
        { name: "level", type: "TEXT" },
        { name: "hours", type: "INTEGER" },
        { name: "price", type: "REAL" },
        { name: "published", type: "INTEGER" },
      ],
      rows: [
        [1, "TypeScript Fundamentals", "frontend", "Beginner", 12, 0, 1],
        [2, "CSS Layout Mastery", "frontend", "Intermediate", 8, 29, 1],
        [3, "React Hooks Deep Dive", "frontend", "Intermediate", 14, 49, 1],
        [4, "Accessibility in Practice", "frontend", "Beginner", 6, 0, 1],
        [5, "Node.js Event Loop", "backend", "Advanced", 10, 59, 1],
        [6, "API Design with REST", "backend", "Intermediate", 16, 49, 1],
        [7, "SQL Joins Explained", "database", "Beginner", 9, 0, 1],
        [8, "Postgres Indexing", "database", "Advanced", 11, 69, 1],
        [9, "Docker Foundations", "devops", "Beginner", 7, 39, 1],
        [10, "Kubernetes Basics", "devops", "Intermediate", 20, 79, 1],
        [11, "Testing with Vitest", "testing", "Intermediate", 9, 29, 1],
        [12, "Git Branching Workflows", "tools", "Beginner", 5, 0, 1],
        [13, "Tailwind in Production", "frontend", "Intermediate", 6, 29, 1],
        [14, "Rust for JavaScript Devs", "tools", "Advanced", 22, 89, 0],
        [15, "Performance Profiling", "frontend", "Advanced", 13, 69, 1],
        [16, "Security Essentials", "backend", "Beginner", 8, 19, 0],
      ],
    },
    {
      name: "enrollments",
      columns: [
        { name: "id", type: "INTEGER" },
        { name: "developer_id", type: "INTEGER" },
        { name: "course_id", type: "INTEGER" },
        { name: "progress", type: "INTEGER" },
        { name: "completed", type: "INTEGER" },
      ],
      rows: [
        [1, 1, 3, 100, 1],
        [2, 1, 13, 100, 1],
        [3, 1, 15, 72, 0],
        [4, 2, 6, 100, 1],
        [5, 2, 5, 45, 0],
        [6, 3, 1, 100, 1],
        [7, 3, 6, 100, 1],
        [8, 3, 9, 100, 1],
        [9, 4, 1, 38, 0],
        [10, 4, 4, 100, 1],
        [11, 5, 10, 100, 1],
        [12, 5, 9, 100, 1],
        [13, 6, 6, 100, 1],
        [14, 6, 8, 64, 0],
        [15, 7, 1, 100, 1],
        [16, 7, 12, 90, 0],
        [17, 8, 2, 100, 1],
        [18, 8, 13, 55, 0],
        [19, 9, 7, 100, 1],
        [20, 10, 9, 100, 1],
        [21, 10, 11, 100, 1],
        [22, 11, 4, 60, 0],
        [23, 12, 3, 100, 1],
        [24, 12, 6, 100, 1],
        [25, 12, 10, 100, 1],
        [26, 13, 2, 100, 1],
        [27, 14, 5, 30, 0],
        [28, 14, 7, 100, 1],
      ],
    },
  ],
};

// ------------------------------------------------------------------- missions

export interface SqlMissionCheck {
  ok: boolean;
  /** Why the result missed — shown as gentle feedback, never a spoiler. */
  reason?: string;
}

export interface SqlMission {
  id: string;
  title: string;
  briefing: string;
  hint: string;
  /** The full solution, revealed only via "Show solution". */
  solution: string;
  check: (result: SqlResultSet) => SqlMissionCheck;
}

const columnValues = (result: SqlResultSet, name: string): (string | number | null)[] => {
  const idx = result.columns.findIndex((c) => c.toLowerCase() === name.toLowerCase());
  return idx >= 0 ? result.rows.map((r) => r[idx]) : [];
};

const hasColumn = (result: SqlResultSet, name: string): boolean =>
  result.columns.some((c) => c.toLowerCase() === name.toLowerCase());

const sameSet = (a: (string | number | null)[], b: (string | number | null)[]): boolean => {
  if (a.length !== b.length) return false;
  const sa = [...a].map(String).sort();
  const sb = [...b].map(String).sort();
  return sa.every((v, i) => v === sb[i]);
};

export const SQL_MISSIONS: SqlMission[] = [
  {
    id: "first-contact",
    title: "First contact",
    briefing:
      "Meet the database. Pull every column and every row from the developers table — the classic SELECT * that starts every SQL journey.",
    hint: "SELECT * FROM table_name gets everything. The table is called developers.",
    solution: "SELECT * FROM developers;",
    check: (r) => {
      if (!hasColumn(r, "name") || !hasColumn(r, "hours_studied")) {
        return { ok: false, reason: "Expected the full developers table — every column, including name and hours_studied." };
      }
      if (r.rows.length !== 14) {
        return { ok: false, reason: `Found ${r.rows.length} rows — the developers table holds 14. No WHERE or LIMIT yet!` };
      }
      return { ok: true };
    },
  },
  {
    id: "choose-columns",
    title: "Choose your columns",
    briefing:
      "SELECT * is a firehose. Ask for exactly two columns instead: every developer's name and hours_studied — nothing else.",
    hint: "List the columns you want, separated by commas: SELECT name, hours_studied FROM developers;",
    solution: "SELECT name, hours_studied FROM developers;",
    check: (r) => {
      if (r.columns.length !== 2 || !hasColumn(r, "name") || !hasColumn(r, "hours_studied")) {
        return { ok: false, reason: "The result should have exactly two columns: name and hours_studied." };
      }
      if (r.rows.length !== 14) {
        return { ok: false, reason: `Found ${r.rows.length} rows — expected all 14 developers.` };
      }
      const names = columnValues(r, "name");
      const ok = names.includes("Maya Chen") && names.includes("Aisha Hassan");
      return ok
        ? { ok: true }
        : { ok: false, reason: "Those don't look like the developer names — double-check the columns you selected." };
    },
  },
  {
    id: "filter-where",
    title: "Filter with WHERE",
    briefing:
      "Real queries are surgical. Return only the frontend developers — all their columns — using a WHERE clause on the role column.",
    hint: "Text values need single quotes: WHERE role = 'frontend'",
    solution: "SELECT * FROM developers WHERE role = 'frontend';",
    check: (r) => {
      if (!hasColumn(r, "role") || !hasColumn(r, "name")) {
        return { ok: false, reason: "Expected the developers' columns (including role) so the filter can be verified." };
      }
      const roles = columnValues(r, "role");
      const frontends = roles.filter((v) => v === "frontend").length;
      if (frontends !== roles.length || roles.length === 0) {
        return { ok: false, reason: "Every row returned should have role = 'frontend' — check your WHERE condition." };
      }
      if (roles.length !== 5) {
        return { ok: false, reason: `Found ${roles.length} frontend developers — there are exactly 5 in the table.` };
      }
      return { ok: true };
    },
  },
  {
    id: "sort-limit",
    title: "Sort and trim",
    briefing:
      "Leaderboards are ORDER BY + LIMIT. Return the names and hours_studied of the top 3 most studious developers, highest first.",
    hint: "ORDER BY hours_studied DESC puts the biggest first; LIMIT 3 keeps three rows.",
    solution: "SELECT name, hours_studied FROM developers ORDER BY hours_studied DESC LIMIT 3;",
    check: (r) => {
      if (!hasColumn(r, "name") || !hasColumn(r, "hours_studied")) {
        return { ok: false, reason: "Include both name and hours_studied in the result." };
      }
      if (r.rows.length !== 3) {
        return { ok: false, reason: `Found ${r.rows.length} rows — LIMIT the result to the top 3.` };
      }
      const hours = columnValues(r, "hours_studied").map(Number);
      const expected = [947, 912, 871];
      if (!hours.every((h, i) => h === expected[i])) {
        return { ok: false, reason: "Order matters here — sort by hours_studied descending: Kenji, Maya, Sofia." };
      }
      return { ok: true };
    },
  },
  {
    id: "group-count",
    title: "Count by group",
    briefing:
      "Aggregates answer 'how many?'. Count the developers in each role: one row per role with the number of developers beside it.",
    hint: "GROUP BY role collapses rows per role; COUNT(*) counts them: SELECT role, COUNT(*) FROM developers GROUP BY role;",
    solution: "SELECT role, COUNT(*) FROM developers GROUP BY role;",
    check: (r) => {
      if (r.columns.length !== 2) {
        return { ok: false, reason: "The result should have exactly two columns: the role and its count." };
      }
      // Identify the role column (values look like roles) — tolerant to column order.
      const roleIdx = r.columns.findIndex((c) => {
        const vals = r.rows.map((row) => row[r.columns.indexOf(c)]);
        return vals.every((v) => ["frontend", "backend", "fullstack", "devops"].includes(String(v)));
      });
      if (roleIdx < 0) {
        return { ok: false, reason: "One column should contain the roles themselves — GROUP BY role." };
      }
      const countIdx = roleIdx === 0 ? 1 : 0;
      const counts: Record<string, number> = {};
      for (const row of r.rows) {
        counts[String(row[roleIdx])] = Number(row[countIdx]);
      }
      const expected: Record<string, number> = { frontend: 5, backend: 4, fullstack: 3, devops: 2 };
      for (const [role, n] of Object.entries(expected)) {
        if (counts[role] !== n) {
          return { ok: false, reason: `Expected ${n} developers with role '${role}' — found ${counts[role] ?? 0}.` };
        }
      }
      if (r.rows.length !== 4) {
        return { ok: false, reason: "There are exactly 4 distinct roles — one output row per group." };
      }
      return { ok: true };
    },
  },
  {
    id: "join-forces",
    title: "Join forces",
    briefing:
      "The final boss: connect three tables. List the developer name and course title for every completed enrollment (completed = 1), with the developer's name and the course's title side by side.",
    hint: "JOIN enrollments to developers on developer_id = developers.id, then to courses on course_id = courses.id, then filter with WHERE completed = 1.",
    solution:
      "SELECT d.name, c.title\nFROM enrollments e\nJOIN developers d ON d.id = e.developer_id\nJOIN courses c ON c.id = e.course_id\nWHERE e.completed = 1;",
    check: (r) => {
      if (!hasColumn(r, "name") || !hasColumn(r, "title")) {
        return { ok: false, reason: "The result needs a name column (developers) and a title column (courses)." };
      }
      const completed = DEMO_DATABASE.tables[2].rows.filter((row) => row[4] === 1);
      if (r.rows.length !== completed.length) {
        return { ok: false, reason: `There are ${completed.length} completed enrollments — the join returned ${r.rows.length} rows.` };
      }
      const devs = DEMO_DATABASE.tables[0];
      const courses = DEMO_DATABASE.tables[1];
      const expected = completed.map((row) => {
        const devName = devs.rows.find((d) => d[0] === row[1])?.[1] ?? null;
        const courseTitle = courses.rows.find((c) => c[0] === row[2])?.[1] ?? null;
        return `${devName}|${courseTitle}`;
      });
      const actual = r.rows.map((row) => {
        const ni = r.columns.findIndex((c) => c.toLowerCase() === "name");
        const ti = r.columns.findIndex((c) => c.toLowerCase() === "title");
        return `${row[ni]}|${row[ti]}`;
      });
      if (!sameSet(actual, expected)) {
        return { ok: false, reason: "Close! Check the join conditions and the WHERE completed = 1 filter — the pairs don't line up yet." };
      }
      return { ok: true };
    },
  },
];

// -------------------------------------------------------------------- presets

export interface SqlPreset {
  label: string;
  query: string;
}

/** One-click starters for free play — each teaches a clause. */
export const SQL_PRESETS: SqlPreset[] = [
  { label: "Everything", query: "SELECT * FROM developers;" },
  {
    label: "WHERE + comparison",
    query: "SELECT name, role, hours_studied\nFROM developers\nWHERE hours_studied > 500\nORDER BY hours_studied DESC;",
  },
  {
    label: "LIKE search",
    query: "SELECT title, topic, hours\nFROM courses\nWHERE title LIKE '%s%';",
  },
  {
    label: "GROUP BY + HAVING",
    query:
      "SELECT topic, COUNT(*) AS courses, AVG(hours) AS avg_hours\nFROM courses\nWHERE published = 1\nGROUP BY topic\nHAVING COUNT(*) >= 2\nORDER BY courses DESC;",
  },
  {
    label: "Free vs paid",
    query:
      "SELECT price, COUNT(*) AS how_many\nFROM courses\nGROUP BY price\nORDER BY price;",
  },
  {
    label: "Two-table join",
    query:
      "SELECT d.name, e.progress, c.title\nFROM enrollments e\nJOIN developers d ON d.id = e.developer_id\nJOIN courses c ON c.id = e.course_id\nWHERE e.completed = 0\nORDER BY e.progress DESC;",
  },
  {
    label: "Arithmetic + alias",
    query:
      "SELECT name, hours_studied / 10 AS tens_of_hours, hours_studied * 2 AS doubled\nFROM developers\nLIMIT 5;",
  },
  {
    label: "BETWEEN + IN",
    query:
      "SELECT name, role, country\nFROM developers\nWHERE hours_studied BETWEEN 400 AND 700\n  AND role IN ('frontend', 'backend');",
  },
];
