// verify-lessons-12b.mjs — Task 12-b verification: JSON validity, metadata, practice-query whitelist, spec conformance
import { readFileSync, existsSync } from "fs";

const DIR = "/home/z/my-project/content/courses/git-for-beginners-visual-learning/lessons";

const EXPECTED = {
  "06-fast-forward-merges.json": {
    title: "Fast-Forward Merges: The Pointer Shortcut",
    slug: "06-fast-forward-merges",
    minutes: 18, xp: 70, hasPractice: true,
  },
  "07-merge-commits-and-conflicts.json": {
    title: "Merge Commits and What a Conflict Really Is",
    slug: "07-merge-commits-and-conflicts",
    minutes: 20, xp: 80, hasPractice: true,
  },
  "08-remotes-push-and-pull.json": {
    title: "Remotes: push, pull, and Sharing Your History",
    slug: "08-remotes-push-and-pull",
    minutes: 18, xp: 70, hasPractice: false,
  },
  "09-reading-history-log-and-graph.json": {
    title: "Reading History Like a Pro: log --graph and HEAD~",
    slug: "09-reading-history-log-and-graph",
    minutes: 16, xp: 65, hasPractice: true,
  },
  "10-undoing-things-safely.json": {
    title: "Undoing Things Safely: restore, reset, revert",
    slug: "10-undoing-things-safely",
    minutes: 18, xp: 70, hasPractice: true,
  },
};

// Exact practice queries mandated by the task (lessons 6,7,9,10)
const EXPECTED_PRACTICE = {
  "06-fast-forward-merges.json": `git init\ntouch journal.md\ngit add .\ngit commit -m "the shared starting point"\ngit switch -c feature\necho "a lane of my own" >> journal.md\ngit add .\ngit commit -m "one commit ahead"\ngit switch main\ngit merge feature\ngit log --oneline`,
  "07-merge-commits-and-conflicts.json": `git init\ntouch journal.md\ngit add .\ngit commit -m "base"\ngit switch -c feature\necho "feature notes" >> feature.md\ngit add .\ngit commit -m "work on the side lane"\ngit switch main\necho "main keeps moving" >> main.md\ngit add .\ngit commit -m "main is not idle"\ngit merge feature\ngit log --graph --oneline --all`,
  "09-reading-history-log-and-graph.json": `git init\ntouch journal.md\ngit add .\ngit commit -m "root"\ngit switch -c left-lane\necho "left" >> left.md\ngit add .\ngit commit -m "left work"\ngit switch main\necho "main" >> main.md\ngit add .\ngit commit -m "main work"\ngit switch -c right-lane\necho "right" >> right.md\ngit add .\ngit commit -m "right work"\ngit log --graph --oneline --all`,
  "10-undoing-things-safely.json": `git init\ntouch journal.md\ngit add .\ngit commit -m "keep this one"\necho "this line will be unstaged soon" >> journal.md\ngit add journal.md\ngit restore --staged journal.md\ngit status\ngit restore journal.md\necho "safe to commit" >> journal.md\ngit add .\ngit commit -m "a keeper"\ngit revert HEAD\ngit log --oneline`,
};

// The simulator's EXACT command set (practice queries + exercises must stay inside it)
const ALLOWED = [
  /^touch\s+\S+$/,
  /^echo\s+"[^"]*"\s*>\s*\S+$/,
  /^echo\s+"[^"]*"\s*>>\s*\S+$/,
  /^ls$/,
  /^help$/,
  /^clear$/,
  /^git\s+init$/,
  /^git\s+status$/,
  /^git\s+add\s+\S+$/,          // file or "."
  /^git\s+commit\s+-m\s+"[^"]*"$/,
  /^git\s+log$/,
  /^git\s+log\s+--oneline$/,
  /^git\s+log\s+--graph\s+--oneline$/,
  /^git\s+log\s+--graph\s+--oneline\s+--all$/,
  /^git\s+graph$/,
  /^git\s+branch$/,
  /^git\s+branch\s+\S+$/,
  /^git\s+switch\s+\S+$/,
  /^git\s+switch\s+-c\s+\S+$/,
  /^git\s+checkout\s+\S+$/,
  /^git\s+checkout\s+-b\s+\S+$/,
  /^git\s+merge\s+\S+$/,
  /^git\s+diff$/,
  /^git\s+restore\s+\S+$/,
  /^git\s+restore\s+--staged\s+\S+$/,
  /^git\s+reset\s+--soft\s+HEAD~1$/,
  /^git\s+reset\s+HEAD~1$/,
  /^git\s+reset\s+--hard\s+HEAD~1$/,
  /^git\s+revert\s+HEAD$/,
];

function checkCommandsOK(code, label, errs) {
  const lines = code.split("\n").map((l) => l.trim()).filter((l) => l.length > 0 && !l.startsWith("#"));
  for (const line of lines) {
    if (!ALLOWED.some((re) => re.test(line))) {
      errs.push(`${label}: command outside simulator set -> "${line}"`);
    }
  }
}

let failures = 0;
const report = [];

for (const [file, exp] of Object.entries(EXPECTED)) {
  const path = `${DIR}/${file}`;
  const errs = [];
  if (!existsSync(path)) { console.log(`FAIL ${file}: missing`); failures++; continue; }

  let d;
  try { d = JSON.parse(readFileSync(path, "utf8")); }
  catch (e) { console.log(`FAIL ${file}: invalid JSON — ${e.message}`); failures++; continue; }

  // top-level keys (exact set)
  const wantKeys = ["title","slug","objective","why","minutes","xp","blocks","exercise","quiz","summary","next"];
  const gotKeys = Object.keys(d);
  for (const k of wantKeys) if (!gotKeys.includes(k)) errs.push(`missing top-level key: ${k}`);
  for (const k of gotKeys) if (!wantKeys.includes(k)) errs.push(`unexpected top-level key: ${k}`);

  // metadata vs table
  if (d.title !== exp.title) errs.push(`title mismatch: "${d.title}"`);
  if (d.slug !== exp.slug) errs.push(`slug mismatch: "${d.slug}"`);
  if (d.minutes !== exp.minutes) errs.push(`minutes mismatch: ${d.minutes} (want ${exp.minutes})`);
  if (d.xp !== exp.xp) errs.push(`xp mismatch: ${d.xp} (want ${exp.xp})`);

  // blocks
  const nBlocks = d.blocks?.length ?? 0;
  if (nBlocks < 20 || nBlocks > 26) errs.push(`block count ${nBlocks} outside 20-26`);
  const types = {};
  for (const [i, b] of (d.blocks ?? []).entries()) {
    types[b.t] = (types[b.t] || 0) + 1;
    if (b.t === "diagram" && (!Array.isArray(b.nodes) || b.nodes.length < 2)) errs.push(`block ${i}: diagram needs >=2 nodes`);
    if (b.t === "practice") {
      if (b.sim !== "git-history-playground") errs.push(`practice sim mismatch: ${b.sim}`);
      if (exp.hasPractice === false) errs.push("lesson 8 must have NO practice block");
      if (EXPECTED_PRACTICE[file] && b.query !== EXPECTED_PRACTICE[file]) errs.push("practice query does NOT match the mandated query verbatim");
      if (!b.note || !b.title) errs.push("practice missing title/note");
      checkCommandsOK(b.query, `practice`, errs);
    }
    if (b.t === "callout" && !["info","tip","warn","danger"].includes(b.variant)) errs.push(`block ${i}: bad callout variant`);
  }
  const nDiagrams = types.diagram || 0;
  if (nDiagrams < 2) errs.push(`only ${nDiagrams} diagrams (need >=2)`);
  if (!types.keytakeaways) errs.push("missing keytakeaways");
  if ((types.interview || 0) > 1) errs.push("more than 1 interview block");

  // exercise
  const ex = d.exercise;
  if (!ex.prompt) errs.push("exercise missing prompt");
  if (!Array.isArray(ex.hints) || ex.hints.length !== 3) errs.push(`exercise hints = ${ex.hints?.length} (need exactly 3)`);
  if (!ex.solution || !ex.why) errs.push("exercise missing solution/why");
  if (ex.lang !== "bash") errs.push(`exercise lang = ${ex.lang} (want bash)`);
  // Lessons 6,7,9,10: exercise solutions must be runnable in the simulator's command set.
  // Lesson 8 has NO simulator remote — the task explicitly directs real-world remote commands
  // (git remote add, git push -u origin main, git pull) for its content, so its exercise is
  // checked only for being non-empty bash.
  if (exp.hasPractice && ex.solution) checkCommandsOK(ex.solution, "exercise solution", errs);

  // quiz
  const nQuiz = d.quiz?.length ?? 0;
  if (nQuiz !== 4) errs.push(`quiz count = ${nQuiz} (need 4)`);
  const diffs = new Set();
  for (const [i, q] of (d.quiz ?? []).entries()) {
    if (!q.q) errs.push(`quiz ${i}: missing q`);
    if (!Array.isArray(q.options) || q.options.length !== 4) errs.push(`quiz ${i}: options = ${q.options?.length}`);
    if (!Number.isInteger(q.answer) || q.answer < 0 || q.answer >= (q.options?.length ?? 0)) errs.push(`quiz ${i}: bad answer index ${q.answer}`);
    if (!q.explain || q.explain.length < 80) errs.push(`quiz ${i}: explain too thin`);
    if (!["easy","medium","hard"].includes(q.difficulty)) errs.push(`quiz ${i}: bad difficulty`);
    diffs.add(q.difficulty);
  }
  if (!diffs.has("easy") || !diffs.has("hard") || !diffs.has("medium")) errs.push(`quiz difficulty mix incomplete: ${[...diffs]}`);

  // prose sanity
  if ((d.summary?.split(/[.!?]/).filter(Boolean).length ?? 0) < 3) errs.push("summary too short for a 3-4 sentence recap");
  if (!d.next || d.next.length < 40) errs.push("next teaser missing/too short");

  const status = errs.length === 0 ? "PASS" : "FAIL";
  if (errs.length > 0) failures++;
  report.push({ file, status, nBlocks, nQuiz, types, nDiagrams, hasPractice: !!types.practice, errs });
}

for (const r of report) {
  console.log(`${r.status}  ${r.file}  blocks=${r.nBlocks}  quiz=${r.nQuiz}  diagrams=${r.nDiagrams}  practice=${r.hasPractice}`);
  console.log(`       block types: ${JSON.stringify(r.types)}`);
  if (r.errs.length) r.errs.forEach((e) => console.log(`       !! ${e}`));
}
console.log(failures === 0 ? "\nALL 5 LESSONS PASS" : `\n${failures} LESSON(S) FAILED`);
process.exit(failures === 0 ? 0 : 1);
