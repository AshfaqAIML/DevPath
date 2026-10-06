// JavaScript Playground — engine definitions.
//
// A Web Worker executes one synchronous snippet at a time in strict-mode
// ES2020: console output is captured (log/info/warn/error, including calls
// made from setTimeout callbacks shortly after the run), the value of the
// last expression statement is echoed like a REPL, and runaway code is cut
// off by a 4-second watchdog that replaces the worker.
//
// Not available inside the sandbox (workers have no DOM): document, window,
// fetch, import/export, top-level await. Everything else — Math, JSON,
// Array/Object methods, Map/Set, structuredClone, setTimeout — just works.

export interface ConsoleEntry {
  level: "log" | "info" | "warn" | "error" | "debug";
  text: string;
}

export interface JsErrorInfo {
  name: string;
  message: string;
}

export type WorkerRunResponse = {
  type: "run";
  id: number;
  logs: ConsoleEntry[];
  error: JsErrorInfo | null;
  /** Formatted value of the last expression statement (null when undefined). */
  result: string | null;
  ms: number;
};

export type WorkerDeltaResponse = {
  type: "delta";
  id: number;
  logs: ConsoleEntry[];
};

export type WorkerResponse = WorkerRunResponse | WorkerDeltaResponse;

export interface JsRunSummary {
  logs: ConsoleEntry[];
  error: JsErrorInfo | null;
  resultText: string | null;
  ms: number;
}

export interface JsMission {
  id: string;
  title: string;
  briefing: string;
  starter: string;
  hint: string;
  solution: string;
  check: (run: JsRunSummary) => { ok: boolean; hint?: string };
}

// ---------------------------------------------------------------------------
// The worker source. Plain ES5-style string concatenation keeps this
// template free of ${} collisions. Runs as classic worker code.

export const WORKER_SOURCE = String.raw`
"use strict";
var MAX_DEPTH = 4;
var MAX_LEN = 600;

function fmt(v, depth, quote, seen) {
  try {
    if (v === null) return "null";
    if (v === undefined) return "undefined";
    var t = typeof v;
    if (t === "string") return quote ? JSON.stringify(v) : v;
    if (t === "number" || t === "boolean") return String(v);
    if (t === "bigint") return String(v) + "n";
    if (t === "symbol") return v.toString();
    if (t === "function") return v.name ? "function " + v.name + "()" : "function ()";
    if (v instanceof Error) return (v.name || "Error") + ": " + v.message;
    if (v instanceof Date) return v.toISOString();
    if (v instanceof RegExp) return String(v);
    if (depth >= MAX_DEPTH) return Array.isArray(v) ? "[Array]" : "[Object]";
    if (seen.indexOf(v) !== -1) return "[Circular]";
    if (v instanceof Map) {
      seen.push(v);
      var mParts = [];
      v.forEach(function (val, key) {
        if (mParts.length < 20) mParts.push(fmt(key, depth + 1, true, seen) + " => " + fmt(val, depth + 1, true, seen));
      });
      seen.pop();
      return "Map(" + v.size + ") {" + mParts.join(", ") + "}";
    }
    if (v instanceof Set) {
      seen.push(v);
      var sParts = [];
      v.forEach(function (val) {
        if (sParts.length < 20) sParts.push(fmt(val, depth + 1, true, seen));
      });
      seen.pop();
      return "Set(" + v.size + ") {" + sParts.join(", ") + "}";
    }
    seen.push(v);
    var out;
    if (Array.isArray(v)) {
      var aParts = [];
      for (var i = 0; i < v.length && aParts.length < 40; i++) {
        var hole = !(i in v);
        aParts.push(hole ? "<empty>" : fmt(v[i], depth + 1, true, seen));
      }
      if (v.length > 40) aParts.push("… " + (v.length - 40) + " more");
      out = "[" + aParts.join(", ") + "]";
    } else {
      var keys = Object.keys(v);
      var kParts = [];
      for (var k = 0; k < keys.length && kParts.length < 30; k++) {
        var key = keys[k];
        kParts.push(key + ": " + fmt(v[key], depth + 1, true, seen));
      }
      if (keys.length > 30) kParts.push("… " + (keys.length - 30) + " more");
      out = "{" + kParts.join(", ") + "}";
    }
    seen.pop();
    return out.length > MAX_LEN ? out.slice(0, MAX_LEN) + " …" : out;
  } catch (e) {
    return "[unformattable]";
  }
}

function fmtArgs(args) {
  var parts = [];
  for (var i = 0; i < args.length; i++) parts.push(fmt(args[i], 0, false, []));
  return parts.join(" ");
}

// console capture — kept installed so async callbacks (setTimeout) keep
// logging into the CURRENT run until the grace window closes.
var LEVELS = ["log", "info", "warn", "error", "debug"];
var origConsole = {};
var logs = [];
var pushLog = function (level) {
  return function () {
    try {
      logs.push({ level: level, text: fmtArgs(Array.prototype.slice.call(arguments)) });
    } catch (e) {
      logs.push({ level: level, text: String(e) });
    }
  };
};
for (var li = 0; li < LEVELS.length; li++) {
  origConsole[LEVELS[li]] = console[LEVELS[li]];
  console[LEVELS[li]] = pushLog(LEVELS[li]);
}

var latestRunId = -1;

self.onmessage = function (e) {
  var id = e.data.id;
  latestRunId = id;
  var code = e.data.code;
  logs = [];
  var error = null;
  var result = null;
  var t0 = Date.now();
  try {
    var value = eval('"use strict";\n' + code);
    if (value !== undefined) result = fmt(value, 0, true, []);
  } catch (err) {
    error = {
      name: err && err.name ? String(err.name) : "Error",
      message: err && err.message ? String(err.message) : String(err),
    };
  }
  var ms = Date.now() - t0;
  self.postMessage({ type: "run", id: id, logs: logs.slice(), error: error, result: result, ms: ms });

  // Async grace: timers scheduled during the run fire later — keep posting
  // their console output as deltas for a short window so teaching snippets
  // with setTimeout callbacks still show their full story. A newer run
  // invalidates older drains (it owns the console now).
  var sent = logs.length;
  var graceStart = Date.now();
  var drain = function () {
    if (id !== latestRunId) return;
    if (logs.length > sent) {
      self.postMessage({ type: "delta", id: id, logs: logs.slice(sent) });
      sent = logs.length;
    }
    if (Date.now() - graceStart < 1600) {
      setTimeout(drain, 120);
    }
  };
  setTimeout(drain, 120);
};
`;

// ---------------------------------------------------------------------------
// Guided missions — each check() inspects the run's console output / result.

export const JS_MISSIONS: JsMission[] = [
  {
    id: "log-first",
    title: "Print your first line",
    briefing:
      "The playground is your REPL. Use console.log to print exactly: hello devpath — then make the final line of the snippet be the expression \"dev\" + \"path\" and watch the result panel echo its value.",
    starter: `// console.log is your print statement.
console.log(/* your greeting here */);

// The LAST expression is echoed automatically, like a REPL:
"dev" + "path"`,
    hint: "console.log(\"hello devpath\"); — and leave \"dev\" + \"path\" as the last line; the result panel shows \"devpath\".",
    solution: `console.log("hello devpath");

"dev" + "path"`,
    check: (run) => {
      const hit = run.logs.some((l) => /hello devpath/i.test(l.text));
      if (!hit) return { ok: false, hint: "No log line containing “hello devpath” — check your console.log call and its exact string." };
      if (!/devpath/.test(run.resultText ?? "")) return { ok: false, hint: "The result panel didn’t echo \"devpath\" — make \"dev\" + \"path\" the LAST expression in the snippet." };
      return { ok: true };
    },
  },
  {
    id: "typeof-safari",
    title: "The typeof safari",
    briefing:
      "Two famous lies: typeof null does not report \"null\", and NaN is a number. Log both typeof null and typeof NaN and confirm the two surprises with your own eyes.",
    starter: `// Predict BOTH answers before running. Two of them lie.
console.log("typeof null:", /* replace with typeof null */);
console.log("typeof NaN:", /* replace with typeof NaN */);

// Bonus lie: typeof a function
"replace this with: typeof console.log"`,
    hint: "typeof null and typeof NaN — write the expressions exactly; the bonus is typeof console.log.",
    solution: `console.log("typeof null:", typeof null);
console.log("typeof NaN:", typeof NaN);

typeof console.log`,
    check: (run) => {
      const texts = run.logs.map((l) => l.text).join("\n");
      const hasObject = /typeof null:\s*.*\bobject\b/.test(texts) || /\bobject\b/.test(texts);
      const hasNumber = /\bnumber\b/.test(texts);
      if (!hasObject) return { ok: false, hint: "typeof null should print as “object” — the 1995 tag bug." };
      if (!hasNumber) return { ok: false, hint: "typeof NaN should print as “number” — NaN is the invalid number, but still a number." };
      return { ok: true };
    },
  },
  {
    id: "pipeline",
    title: "Pipeline: filter → map → reduce",
    briefing:
      "DevPath tracks course minutes. Chain array methods on the starter data: keep only the frontend lessons, project their minutes, and reduce them to a total. Log it — the expected total is 58.",
    starter: `const lessons = [
  { title: "Values & Types", track: "frontend", minutes: 18 },
  { title: "Functions", track: "frontend", minutes: 20 },
  { title: "SQL Joins", track: "data", minutes: 22 },
  { title: "Closures", track: "frontend", minutes: 20 },
];

const total = lessons
  .filter(/* keep frontend lessons only */)
  .map(/* project the minutes */)
  .reduce(/* sum them, start at 0 */, 0);

console.log("frontend minutes:", total);`,
    hint: "filter(l => l.track === \"frontend\"), then map(l => l.minutes), then reduce((sum, m) => sum + m, 0). 18 + 20 + 20 = 58.",
    solution: `const lessons = [
  { title: "Values & Types", track: "frontend", minutes: 18 },
  { title: "Functions", track: "frontend", minutes: 20 },
  { title: "SQL Joins", track: "data", minutes: 22 },
  { title: "Closures", track: "frontend", minutes: 20 },
];

const total = lessons
  .filter((l) => l.track === "frontend")
  .map((l) => l.minutes)
  .reduce((sum, m) => sum + m, 0);

console.log("frontend minutes:", total);`,
    check: (run) => {
      const hit = run.logs.some((l) => /\b58\b/.test(l.text));
      if (!hit) return { ok: false, hint: "The logged total should be 58 (18 + 20 + 20) — check each stage of the chain." };
      return { ok: true };
    },
  },
  {
    id: "reference-trap",
    title: "Escape the reference trap",
    briefing:
      "Aliasing shares one object through two names; spread copies only the top level. Predict both outputs, then prove it: after the alias mutation meta.logs 99 (shared state), and after the copy’s own top-level write meta STILL logs 99 — but for the opposite reason: the copy is independent.",
    starter: `const meta = { views: 12 };
const alias = meta;
alias.views = 99;
console.log("meta.views:", meta.views); // predict me

const copy = { ...meta };
copy.views = 7;
console.log("meta.views after copy:", meta.views); // predict me too`,
    hint: "Run it as-is once you’ve predicted. alias IS meta — the first 99 is shared state. The spread copy is independent at the top level — the second 99 is privacy. Same number, opposite mechanism.",
    solution: `const meta = { views: 12 };
const alias = meta;
alias.views = 99;
console.log("meta.views:", meta.views);

const copy = { ...meta };
copy.views = 7;
console.log("meta.views after copy:", meta.views);`,
    check: (run) => {
      const first = run.logs.find((l) => l.text.includes("meta.views:"))?.text ?? "";
      const second = run.logs.find((l) => l.text.includes("after copy"))?.text ?? "";
      if (!/\b99\b/.test(first)) return { ok: false, hint: "After alias.views = 99, meta.views should log 99 — alias and meta are one object." };
      if (!/\b99\b/.test(second)) return { ok: false, hint: "After the spread copy changes ITS views, meta.views should STILL log 99 — spread copies the top level, so the copy’s write stays private. If you saw 7, something shared the reference instead." };
      return { ok: true };
    },
  },
  {
    id: "closure-counter",
    title: "Two independent counters",
    briefing:
      "Write makeCounter() returning a next() function that increments and returns a private count. Create two counters a and b, then log a(), a(), b(), a(), b() on one line — the sequence proves the closures hold separate variables.",
    starter: `function makeCounter() {
  // a private count lives here, captured by the returned function
  // return a function that increments and returns it
}

const a = makeCounter();
const b = makeCounter();

console.log(a(), a(), b(), a(), b()); // predict the five numbers`,
    hint: "let count = 0; return function next() { return ++count; }; — each makeCounter() call creates a fresh count variable.",
    solution: `function makeCounter() {
  let count = 0;
  return function next() {
    return ++count;
  };
}

const a = makeCounter();
const b = makeCounter();

console.log(a(), a(), b(), a(), b());`,
    check: (run) => {
      const hit = run.logs.some((l) => /1\s*,?\s*2\s*,?\s*1\s*,?\s*3\s*,?\s*2/.test(l.text.replace(/,/g, ", ")) || l.text.includes("1 2 1 3 2"));
      if (!hit) return { ok: false, hint: "The five values should print as 1 2 1 3 2 — a and b count independently: a: 1, 2, then 3; b: 1, then 2." };
      return { ok: true };
    },
  },
  {
    id: "safe-parse",
    title: "Guard JSON.parse",
    briefing:
      "Raw JSON.parse throws on the tiniest syntax slip (single quotes are NOT valid JSON). Build safeParse(text) that returns { ok: true, value } or { ok: false, error } — then prove it on a broken payload and a clean one.",
    starter: `function safeParse(text) {
  // try to JSON.parse; return { ok: true, value } on success
  // catch the failure and return { ok: false, error: err.message }
}

const bad = safeParse("{'dev': true}"); // single quotes — invalid JSON
const good = safeParse('{"dev": true}');

console.log("bad.ok:", bad.ok);
console.log("good.ok:", good.ok);

good // last expression: inspect the parsed value`,
    hint: "try { return { ok: true, value: JSON.parse(text) }; } catch (err) { return { ok: false, error: err.message }; }",
    solution: `function safeParse(text) {
  try {
    return { ok: true, value: JSON.parse(text) };
  } catch (err) {
    return { ok: false, error: err.message };
  }
}

const bad = safeParse("{'dev': true}");
const good = safeParse('{"dev": true}');

console.log("bad.ok:", bad.ok);
console.log("good.ok:", good.ok);

good`,
    check: (run) => {
      const texts = run.logs.map((l) => l.text).join("\n");
      const badFalse = /bad\.ok:\s*false/.test(texts);
      const goodTrue = /good\.ok:\s*true/.test(texts);
      if (!badFalse) return { ok: false, hint: "bad.ok should print false — the single-quoted payload throws, and your catch branch must return ok: false." };
      if (!goodTrue) return { ok: false, hint: "good.ok should print true — the double-quoted payload parses cleanly." };
      return { ok: true };
    },
  },
];

// ---------------------------------------------------------------------------
// Free-play presets.

export const JS_PRESETS: { label: string; code: string }[] = [
  {
    label: "Hello DevPath",
    code: `console.log("hello devpath");

"dev" + "path"`,
  },
  {
    label: "typeof safari",
    code: `console.log(typeof null);     // object  — the 1995 bug
console.log(typeof NaN);      // number — the invalid number
console.log(typeof (() => 1)); // function

typeof Symbol("id")`,
  },
  {
    label: "Array pipeline",
    code: `const devs = [
  { name: "Ada", role: "frontend", xp: 912 },
  { name: "Yuki", role: "backend", xp: 871 },
  { name: "Maya", role: "frontend", xp: 947 },
];

devs
  .filter((d) => d.role === "frontend")
  .map((d) => d.name)
  .join(" & ")`,
  },
  {
    label: "Reference trap",
    code: `const meta = { views: 12 };
const alias = meta;
alias.views = 99;
console.log("alias write → meta.views:", meta.views);

const copy = { ...meta };
copy.views = 7;
console.log("copy write  → meta.views:", meta.views);`,
  },
  {
    label: "Closure counter",
    code: `function makeCounter() {
  let count = 0;
  return function next() {
    return ++count;
  };
}

const a = makeCounter();
const b = makeCounter();
console.log(a(), a(), b(), a(), b());`,
  },
  {
    label: "Guard JSON.parse",
    code: `function safeParse(text) {
  try {
    return { ok: true, value: JSON.parse(text) };
  } catch (err) {
    return { ok: false, error: err.message };
  }
}

console.log(safeParse("{'dev': true}")); // invalid — single quotes
safeParse('{"dev": true}')`,
  },
];
