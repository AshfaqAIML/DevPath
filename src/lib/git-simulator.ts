// Git History Playground — the engine.
//
// A faithful-enough in-memory model of Git for teaching: commits are
// immutable snapshots, branches are movable pointers, HEAD names the
// current branch, the staging area is a real intermediate tree. Commands
// are parsed from a bash-like script (no eval — this is a command
// interpreter, so it runs synchronously on the main thread with no
// untrusted-code risk).
//
// Supported commands (the practice queries in the Git course stay inside
// this set by construction):
//   shell:  touch <file> · echo "text" > file · echo "text" >> file · ls · help
//   git:    init · status · add <file|·.> · commit -m "msg" · log [--oneline]
//           [--graph --oneline [--all]] · graph · branch [name] ·
//           switch [-c] <name> · checkout [-b] <name> · merge <name> · diff ·
//           restore [--staged] <file> · reset [--soft|--mixed|--hard] HEAD~n ·
//           revert HEAD
//
// Conflict model: when both branches changed the SAME file differently
// since their merge base, `git merge` stops with a conflict (the sandbox
// has no conflict-marker editor — the lesson explains how real Git asks a
// human to decide). Files touched on only one side auto-merge.

// ---------------------------------------------------------------------------
// Types

export type ConsoleKind = "cmd" | "out" | "err" | "ok" | "hint";
export type ConsoleLine = { kind: ConsoleKind; text: string };

export type Commit = {
  /** 7-char pseudo hash, deterministic per repo history. */
  id: string;
  msg: string;
  /** Parent ids, first-parent first (merge commits have two). */
  parents: string[];
  /** Full snapshot of tracked files at this commit. */
  tree: Record<string, string>;
  /** Branch HEAD was on when the commit was created (lane + missions). */
  branch: string;
  /** Creation sequence, 1-based. */
  ts: number;
};

export type GitEvent =
  | { type: "init" }
  | { type: "commit"; id: string; msg: string }
  | { type: "branch"; name: string }
  | { type: "switch"; name: string }
  | { type: "merge"; into: string; from: string; strategy: "ff" | "merge-commit"; id: string }
  | { type: "conflict"; from: string; file: string }
  | { type: "reset"; mode: "soft" | "mixed" | "hard"; to: string }
  | { type: "revert"; reverted: string; id: string };

export type GitState = {
  initialized: boolean;
  /** Creation order (ts ascending). */
  commits: Commit[];
  /** branch name → tip commit id ("" while unborn). */
  branches: Record<string, string>;
  /** Current branch name (detached HEAD is out of scope by design). */
  head: string;
  /** Working directory: file → content. */
  working: Record<string, string>;
  /** Staging area (index): file → staged content. */
  staged: Record<string, string>;
  events: GitEvent[];
  /** Branch → creation lane (main = 0, each new branch takes the next lane). */
  branchLane: Record<string, number>;
  /** Commit counter for hashes. */
  seq: number;
};

// ---------------------------------------------------------------------------
// Constants

export const GIT_AUTHOR = "Maya Chen <maya@devpath.dev>";

/** Lane colors — teal-led warm palette, no blues/indigos. */
export const LANE_COLORS = ["#0d9488", "#d97706", "#e11d48", "#059669", "#a21caf", "#65a30d"];

export function laneColor(lane: number): string {
  return LANE_COLORS[lane % LANE_COLORS.length];
}

// ---------------------------------------------------------------------------
// State helpers

export function initialState(): GitState {
  return {
    initialized: false,
    commits: [],
    branches: {},
    head: "",
    working: {},
    staged: {},
    events: [],
    branchLane: {},
    seq: 0,
  };
}

function cloneState(s: GitState): GitState {
  return {
    initialized: s.initialized,
    commits: s.commits.map((c) => ({ ...c, tree: { ...c.tree } })),
    branches: { ...s.branches },
    head: s.head,
    working: { ...s.working },
    staged: { ...s.staged },
    events: s.events.map((e) => ({ ...e })),
    branchLane: { ...s.branchLane },
    seq: s.seq,
  };
}

/** Deterministic 7-char hash so transcripts are reproducible. */
function fakeHash(seed: string): string {
  let h = 0x811c9dc5;
  for (let i = 0; i < seed.length; i++) {
    h ^= seed.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return (h >>> 0).toString(16).padStart(8, "0").slice(0, 7);
}

function commitById(s: GitState, id: string): Commit | undefined {
  return s.commits.find((c) => c.id === id);
}

/** All commit ids reachable from `tipId` by walking parents. */
export function reachable(s: GitState, tipId: string): Set<string> {
  const seen = new Set<string>();
  const stack = [tipId];
  while (stack.length) {
    const id = stack.pop()!;
    if (!id || seen.has(id)) continue;
    seen.add(id);
    const c = commitById(s, id);
    if (c) stack.push(...c.parents);
  }
  return seen;
}

function tipOf(s: GitState, branch: string): Commit | undefined {
  const id = s.branches[branch];
  return id ? commitById(s, id) : undefined;
}

function requireInit(s: GitState): ConsoleLine[] | null {
  if (!s.initialized) {
    return [
      { kind: "err", text: "fatal: not a git repository (or any of the parent directories): .git" },
      { kind: "hint", text: "Run git init first — a repository is just a .git folder that starts tracking history." },
    ];
  }
  return null;
}

/** Commits reachable from the current HEAD branch only. */
function headHistory(s: GitState): Commit[] {
  const tip = tipOf(s, s.head);
  if (!tip) return [];
  const set = reachable(s, tip.id);
  return s.commits.filter((c) => set.has(c.id)).reverse(); // newest first
}

/** Commits reachable from ANY branch tip. */
function allHistory(s: GitState): Commit[] {
  const set = new Set<string>();
  for (const id of Object.values(s.branches)) {
    if (!id) continue;
    for (const x of reachable(s, id)) set.add(x);
  }
  return s.commits.filter((c) => set.has(c.id)).reverse(); // newest first
}

/** Lowest common ancestor of two commits (merge base). */
function mergeBase(s: GitState, a: string, b: string): Commit | undefined {
  const ancA = reachable(s, a);
  if (ancA.has(b)) return commitById(s, b);
  // BFS from b in newest-first order; first hit inside ancA is the LCA.
  const queue = [b];
  const seen = new Set<string>();
  while (queue.length) {
    const id = queue.shift()!;
    if (seen.has(id)) continue;
    seen.add(id);
    if (ancA.has(id)) return commitById(s, id);
    const c = commitById(s, id);
    if (c) queue.push(...c.parents);
  }
  return undefined;
}

/** nth first-parent ancestor of a commit id (HEAD~n). */
function nthAncestor(s: GitState, id: string, n: number): Commit | undefined {
  let cur = commitById(s, id);
  for (let i = 0; i < n && cur; i++) {
    cur = cur.parents[0] ? commitById(s, cur.parents[0]) : undefined;
  }
  return cur;
}

// ---------------------------------------------------------------------------
// File status model (drives git status, the Files panel, and diffs)

export type FileView = {
  name: string;
  /** "new" | "modified" when staged differs from HEAD, else null. */
  staged: "new" | "modified" | null;
  /** "modified" when working differs from staging, else null. */
  work: "modified" | null;
  /** Not tracked by HEAD nor staged. */
  untracked: boolean;
};

export function fileViews(s: GitState): FileView[] {
  const tip = tipOf(s, s.head);
  const headTree = tip?.tree ?? {};
  const names = new Set([...Object.keys(headTree), ...Object.keys(s.staged), ...Object.keys(s.working)]);
  const views: FileView[] = [];
  for (const name of [...names].sort()) {
    const inHead = name in headTree;
    const inStaged = name in s.staged;
    const stagedContent = s.staged[name];
    const workingContent = s.working[name];
    if (!inHead && !inStaged) {
      views.push({ name, staged: null, work: null, untracked: true });
      continue;
    }
    const stagedChange: FileView["staged"] = !inHead
      ? "new"
      : stagedContent !== headTree[name]
        ? "modified"
        : null;
    const workChange: FileView["work"] =
      workingContent !== undefined && workingContent !== stagedContent ? "modified" : null;
    views.push({ name, staged: stagedChange, work: workChange, untracked: false });
  }
  return views;
}

/** Count files changed + insertions between two trees (for receipts). */
function treeStats(before: Record<string, string>, after: Record<string, string>): { files: number; insertions: number } {
  let files = 0;
  let insertions = 0;
  const names = new Set([...Object.keys(before), ...Object.keys(after)]);
  for (const n of names) {
    if ((before[n] ?? null) !== (after[n] ?? null)) {
      files++;
      const afterLines = (after[n] ?? "").split("\n").filter((l) => l !== "").length;
      const beforeLines = (before[n] ?? "").split("\n").filter((l) => l !== "").length;
      insertions += Math.max(0, afterLines - beforeLines) || (beforeLines === 0 ? afterLines : 0);
    }
  }
  return { files, insertions };
}

// ---------------------------------------------------------------------------
// Command parsing

/** Split a command line into tokens honoring double quotes. */
function tokenize(line: string): string[] {
  const toks: string[] = [];
  let i = 0;
  while (i < line.length) {
    while (i < line.length && /\s/.test(line[i])) i++;
    if (i >= line.length) break;
    if (line[i] === '"' || line[i] === "'") {
      const quote = line[i++];
      let buf = "";
      while (i < line.length && line[i] !== quote) {
        if (line[i] === "\\" && quote === '"' && i + 1 < line.length) {
          buf += line[i + 1];
          i += 2;
        } else {
          buf += line[i++];
        }
      }
      i++; // closing quote
      toks.push(buf);
    } else {
      let buf = "";
      while (i < line.length && !/\s/.test(line[i])) {
        // keep > >> attached to words split off below
        buf += line[i++];
      }
      toks.push(buf);
    }
  }
  return toks;
}

// ---------------------------------------------------------------------------
// The interpreter

export type RunResult = {
  state: GitState;
  lines: ConsoleLine[];
  /** Set when the script ended on an error (missions refuse to check). */
  hadError: boolean;
};

export function runScript(state: GitState, script: string): RunResult {
  const s = cloneState(state);
  const lines: ConsoleLine[] = [];
  let hadError = false;

  for (const raw of script.split("\n")) {
    const line = raw.trim();
    if (!line || line.startsWith("#")) continue;
    lines.push({ kind: "cmd", text: `$ ${line}` });
    const out = runCommand(s, tokenize(line));
    for (const l of out) {
      lines.push(l);
      if (l.kind === "err") hadError = true;
    }
  }
  return { state: s, lines, hadError };
}

type Lines = ConsoleLine[];

function ok(text: string): ConsoleLine { return { kind: "ok", text }; }
function out(text: string): ConsoleLine { return { kind: "out", text }; }
function err(text: string): ConsoleLine { return { kind: "err", text }; }
function hint(text: string): ConsoleLine { return { kind: "hint", text }; }

function runCommand(s: GitState, toks: string[]): Lines {
  const [cmd, ...rest] = toks;
  switch (cmd) {
    case "help":
      return [
        out("shell   touch <file> · echo \"text\" > <file> · echo \"text\" >> <file> · ls · clear"),
        out("git     init · status · add <file|.> · commit -m \"msg\" · log [--oneline] ·"),
        out("        log --graph --oneline [--all] · graph · branch [name] · switch [-c] <name> ·"),
        out("        checkout [-b] <name> · merge <name> · diff · restore [--staged] <file> ·"),
        out("        reset [--soft|--mixed|--hard] HEAD~n · revert HEAD"),
      ];
    case "ls": {
      const names = Object.keys(s.working).sort();
      if (!names.length) return [out("(empty directory)")];
      return [out(names.join("  "))];
    }
    case "touch": {
      const file = rest[0];
      if (!file) return [err("touch: missing file operand")];
      if (!(file in s.working)) s.working[file] = "";
      return [];
    }
    case "echo": {
      // echo "text" > file | echo "text" >> file | echo "text"
      const gt = rest.indexOf(">");
      const ggt = rest.indexOf(">>");
      const idx = ggt !== -1 ? ggt : gt;
      if (idx !== -1) {
        const text = rest.slice(0, idx).join(" ");
        const file = rest[idx + 1];
        if (!file) return [err("syntax error near unexpected token `newline'")];
        const append = ggt !== -1;
        s.working[file] = append ? (s.working[file] ? s.working[file] + "\n" + text : text) : text;
        return [];
      }
      return [out(rest.join(" "))];
    }
    case "git":
      return gitCommand(s, rest);
    default:
      return [
        err(`bash: ${cmd}: command not found`),
        hint("Type help to see every command this sandbox understands."),
      ];
  }
}

function gitCommand(s: GitState, toks: string[]): Lines {
  const [sub, ...rest] = toks;
  switch (sub) {
    case "init":
      return gitInit(s);
    case "status":
      return gitStatus(s);
    case "add":
      return gitAdd(s, rest);
    case "commit":
      return gitCommit(s, rest);
    case "log":
      return gitLog(s, rest);
    case "graph":
      return gitLog(s, ["--graph", "--oneline", "--all"]);
    case "branch":
      return gitBranch(s, rest);
    case "switch":
      return gitSwitch(s, rest, "switch");
    case "checkout":
      return gitSwitch(s, rest, "checkout");
    case "merge":
      return gitMerge(s, rest);
    case "diff":
      return gitDiff(s);
    case "restore":
      return gitRestore(s, rest);
    case "reset":
      return gitReset(s, rest);
    case "revert":
      return gitRevert(s, rest);
    case "config":
      return [hint("No config needed here — the sandbox already knows who you are. (Maya Chen <maya@devpath.dev>)")];
    default:
      return [
        err(`git: '${sub}' is not a git command in this sandbox`),
        hint("Supported: init, status, add, commit, log, graph, branch, switch, checkout, merge, diff, restore, reset, revert."),
      ];
  }
}

// --- individual git commands ------------------------------------------------

function gitInit(s: GitState): Lines {
  if (s.initialized) return [out("Reinitialized existing Git repository in ~/devpath-journal/.git/")];
  s.initialized = true;
  s.branches = { main: "" };
  s.branchLane = { main: 0 };
  s.head = "main";
  s.events.push({ type: "init" });
  return [out("Initialized empty Git repository in ~/devpath-journal/.git/")];
}

function gitStatus(s: GitState): Lines {
  const initErr = requireInit(s);
  if (initErr) return initErr;
  const lines: Lines = [out(`On branch ${s.head}`)];
  const tip = tipOf(s, s.head);
  if (!tip) lines.push(out(""), out("No commits yet"));
  const views = fileViews(s);
  const staged = views.filter((v) => v.staged);
  const modified = views.filter((v) => v.work);
  const untracked = views.filter((v) => v.untracked);

  if (staged.length) {
    lines.push(out(""), out("Changes to be committed:"));
    lines.push(out('  (use "git restore --staged <file>..." to unstage)'));
    for (const v of staged) {
      lines.push(out(`\t${v.staged === "new" ? "new file:" : "modified:"}   ${v.name}`));
    }
  }
  if (modified.length) {
    lines.push(out(""), out("Changes not staged for commit:"));
    lines.push(out('  (use "git add <file>..." to update what will be committed)'));
    lines.push(out('  (use "git restore <file>..." to discard changes in working directory)'));
    for (const v of modified) lines.push(out(`\tmodified:   ${v.name}`));
  }
  if (untracked.length) {
    lines.push(out(""), out("Untracked files:"));
    lines.push(out('  (use "git add <file>..." to include in what will be committed)'));
    for (const v of untracked) lines.push(out(`\t${v.name}`));
  }
  if (!staged.length && !modified.length && !untracked.length) {
    lines.push(out(tip ? "nothing to commit, working tree clean" : "nothing to commit (create/copy files and use \"git add\" to track)"));
  } else if (!staged.length) {
    lines.push(out("no changes added to commit (use \"git add\" and/or \"git commit -a\")"));
  }
  return lines;
}

function gitAdd(s: GitState, rest: string[]): Lines {
  const initErr = requireInit(s);
  if (initErr) return initErr;
  const target = rest[0];
  if (!target) return [err("Nothing specified, nothing added."), hint("hint: Maybe you wanted to say 'git add .'?")];
  if (target === "." || target === "--all" || target === "-A") {
    for (const [name, content] of Object.entries(s.working)) s.staged[name] = content;
    return [];
  }
  if (!(target in s.working)) {
    return [
      err(`fatal: pathspec '${target}' did not match any files`),
      hint(`Create it first: touch ${target} (or echo "text" > ${target}).`),
    ];
  }
  s.staged[target] = s.working[target];
  return [];
}

function gitCommit(s: GitState, rest: string[]): Lines {
  const initErr = requireInit(s);
  if (initErr) return initErr;
  // -m "msg" | -m msg | --message "msg"
  let msg = "";
  for (let i = 0; i < rest.length; i++) {
    if (rest[i] === "-m" || rest[i] === "--message") {
      msg = rest.slice(i + 1).join(" ");
      break;
    }
  }
  if (!msg) {
    return [
      err('error: switch `m\' requires a value'),
      hint('Write it as: git commit -m "your message"'),
    ];
  }
  const tip = tipOf(s, s.head);
  const parentTree = tip?.tree ?? {};
  // The commit records the INDEX — nothing staged that differs means nothing to commit.
  const stagedChange = Object.keys({ ...parentTree, ...s.staged }).some(
    (k) => (s.staged[k] ?? null) !== (parentTree[k] ?? null)
  );
  if (!stagedChange) {
    const dirty = fileViews(s).some((v) => v.work || v.untracked);
    return [
      err("nothing to commit" + (dirty ? ", nothing staged" : "")),
      hint(
        dirty
          ? "You have changes, but git commit only records what is staged — run git add first."
          : "The working tree is clean — make a change before committing (or stage something)."
      ),
    ];
  }
  s.seq += 1;
  const id = fakeHash(`${s.seq}:${s.head}:${msg}`);
  const commit: Commit = {
    id,
    msg,
    parents: tip ? [tip.id] : [],
    tree: { ...s.staged },
    branch: s.head,
    ts: s.seq,
  };
  s.commits.push(commit);
  s.branches[s.head] = id;
  s.events.push({ type: "commit", id, msg });
  const stats = treeStats(parentTree, commit.tree);
  const isRoot = !tip;
  return [
    out(`[${s.head}${isRoot ? " (root-commit)" : ""} ${id}] ${msg}`),
    out(` ${stats.files} file${stats.files === 1 ? "" : "s"} changed, ${stats.insertions} insertion${stats.insertions === 1 ? "" : "s"}(+)`),
  ];
}

function gitLog(s: GitState, rest: string[]): Lines {
  const initErr = requireInit(s);
  if (initErr) return initErr;
  const oneline = rest.includes("--oneline");
  const graph = rest.includes("--graph");
  const all = rest.includes("--all") || rest.includes("-a");
  const history = all ? allHistory(s) : headHistory(s);
  if (!history.length) {
    return [err(`fatal: your current branch '${s.head}' does not have any commits yet`)];
  }
  if (graph) {
    // The graph walk starts from the tips (newest first), not raw history.
    const tipList = all
      ? Object.keys(s.branches)
          .map((n) => tipOf(s, n))
          .filter((c): c is Commit => !!c)
          .sort((a, b) => b.ts - a.ts)
      : [tipOf(s, s.head)].filter((c): c is Commit => !!c);
    return renderGraph(s, tipList, all);
  }
  const lines: Lines = [];
  for (const c of history) {
    if (oneline) {
      lines.push(out(`${c.id} ${decorate(s, c)}${c.msg}`.trimEnd()));
    } else {
      lines.push(out(`commit ${c.id} ${decorate(s, c)}`.trimEnd()));
      lines.push(out(`Author: ${GIT_AUTHOR}`));
      lines.push(out(""));
      lines.push(out(`    ${c.msg}`));
      lines.push(out(""));
    }
  }
  return lines;
}

/** `(HEAD -> main)`-style decoration for a commit row. */
function decorate(s: GitState, c: Commit): string {
  const refs = Object.entries(s.branches)
    .filter(([, id]) => id === c.id)
    .map(([name]) => (name === s.head ? `HEAD -> ${name}` : name));
  // HEAD branch first, then alphabetical
  refs.sort((a, b) => (a.startsWith("HEAD") ? -1 : b.startsWith("HEAD") ? 1 : a.localeCompare(b)));
  return refs.length ? `(${refs.join(", ")}) ` : "";
}

// --- ASCII graph ------------------------------------------------------------
//
// Follows the classic git shapes (verified against real git 2.47):
//   *   8e20fe9 (HEAD -> main) Merge branch 'feature'
//   |\
//   | * 7432f62 (feature) work on the side lane
//   * | f35b481 main is not idle
//   |/
//   * 53fc261 base
//
// Display order: FIFO traversal seeded with the tips (newest first);
// each commit pushes its parents in REVERSE order (the second parent
// enters the queue first) — this reproduces real git's rendering order
// for merge graphs. Display lanes follow first-parent chains: a commit
// inherits the LOWEST lane among its first-parent children; merge
// second-parents and independent tips open new lanes.

function graphDisplayOrder(s: GitState, tips: Commit[]): Commit[] {
  const byId = new Map(s.commits.map((c) => [c.id, c]));
  // The display set: everything reachable from the tips.
  const inSet = new Set<string>();
  const walk = [...tips.map((c) => c.id)];
  while (walk.length) {
    const id = walk.pop()!;
    if (!id || inSet.has(id)) continue;
    inSet.add(id);
    const c = byId.get(id);
    if (c) walk.push(...c.parents);
  }
  // Pending-children counters guarantee a parent never renders before its
  // children (Kahn-style topological guard over the FIFO preference).
  const pending = new Map<string, number>();
  for (const id of inSet) {
    for (const p of byId.get(id)!.parents) {
      if (inSet.has(p)) pending.set(p, (pending.get(p) ?? 0) + 1);
    }
  }
  const queue: string[] = [...tips.map((c) => c.id)];
  const queued = new Set(queue);
  const popped = new Set<string>();
  const order: Commit[] = [];
  while (queue.length) {
    const id = queue.shift()!;
    if (popped.has(id)) continue;
    if ((pending.get(id) ?? 0) > 0) {
      // children still waiting — defer to the back of the queue
      queue.push(id);
      continue;
    }
    popped.add(id);
    const c = byId.get(id);
    if (c) order.push(c);
    // parents enter in reverse so the second parent renders first
    for (const pid of [...(c?.parents ?? [])].reverse()) {
      if (!inSet.has(pid)) continue;
      const left = (pending.get(pid) ?? 0) - 1;
      pending.set(pid, left);
      if (left === 0 && !queued.has(pid)) {
        queued.add(pid);
        queue.push(pid);
      }
    }
  }
  return order;
}

function renderGraph(s: GitState, tips: Commit[], all: boolean): Lines {
  if (!tips.length) return [];
  // Display order comes from the queue walk, not raw timestamps.
  const order = graphDisplayOrder(s, tips);
  // displayLane: min lane among first-parent children; else a new lane.
  const displayLane = new Map<string, number>();
  let nextLane = 0;
  for (const c of order) {
    const childLanes = s.commits
      .filter((x) => x.parents[0] === c.id && displayLane.has(x.id))
      .map((x) => displayLane.get(x.id)!);
    if (childLanes.length) {
      displayLane.set(c.id, Math.min(...childLanes));
    } else {
      displayLane.set(c.id, nextLane++);
    }
  }
  const laneCount = nextLane;

  // Edges: (childRow, childLane, parentRow, parentLane)
  type Edge = { cr: number; cl: number; pr: number; pl: number; pid: string; secondParent: boolean };
  const rowOf = new Map(order.map((c, i) => [c.id, i]));
  const edges: Edge[] = [];
  for (const c of order) {
    for (const pid of c.parents) {
      const pr = rowOf.get(pid);
      if (pr === undefined) continue; // parent not displayed
      edges.push({
        cr: rowOf.get(c.id)!,
        cl: displayLane.get(c.id)!,
        pr,
        pl: displayLane.get(pid)!,
        pid,
        secondParent: c.parents.length > 1 && c.parents[1] === pid,
      });
    }
  }

  const laneActive = (rowIdx: number, lane: number): boolean => {
    // a commit with this display lane exists at a later row
    if (order.some((_, j) => j > rowIdx && displayLane.get(order[j].id) === lane)) return true;
    // an edge crosses this row on this lane
    return edges.some((e) => e.cl === lane && e.cr < rowIdx && rowIdx < e.pr);
  };

  const lines: Lines = [];
  for (let i = 0; i < order.length; i++) {
    const c = order[i];
    const dl = displayLane.get(c.id)!;

    // Pre-connector: another lane's history converges INTO this commit
    // (the CHILD sits on a different lane than this commit). Merge
    // second-parent edges are excluded — the `|\` post-connector draws them.
    const landing = edges.filter((e) => e.pr === i && e.cl !== dl && !e.secondParent);
    for (const e of landing) {
      const chars = buildChars(i - 1, laneActive, laneCount);
      // the converging lane ends here — clear its column, draw `/` between
      chars[e.cl * 2] = " ";
      const lo = Math.min(e.cl, e.pl);
      const hi = Math.max(e.cl, e.pl);
      chars[lo * 2 + (hi - lo) * 2 - 1] = "/";
      lines.push(out(padChars(chars)));
    }

    // The commit row itself.
    const chars = buildChars(i, laneActive, laneCount);
    chars[dl * 2] = "*";
    if (c.parents.length > 1) {
      // merge rows collapse the lanes: classic `*` + padding
      const starIdx = dl * 2;
      const merged = chars.slice(0, starIdx);
      merged[starIdx] = "*";
      while (merged.length < starIdx + 4) merged.push(" ");
      lines.push(out(`${merged.join("")}${c.id} ${decorate(s, c)}${c.msg}`.replace(/\s+$/, "")));
    } else {
      lines.push(out(`${chars.join("").trimEnd()} ${c.id} ${decorate(s, c)}${c.msg}`.replace(/\s+$/, "")));
    }

    // Post-connector: merge commits draw `|\` right below.
    if (c.parents.length > 1) {
      const second = c.parents[1];
      const pr = rowOf.get(second);
      if (pr !== undefined) {
        const pl = displayLane.get(second)!;
        const chars = buildChars(i + 1, laneActive, laneCount);
        chars[dl * 2] = "|";
        // the second parent's lane column stays clear on this row
        chars[pl * 2] = " ";
        // also clear lanes that have no business crossing this connector
        for (let j = 0; j < laneCount; j++) {
          if (j !== dl && j !== pl && !laneActive(i, j)) chars[j * 2] = " ";
        }
        const lo = Math.min(dl, pl);
        const hi = Math.max(dl, pl);
        chars[lo * 2 + (hi - lo) * 2 - 1] = pl > dl ? "\\" : "/";
        lines.push(out(padChars(chars)));
      }
    }
  }
  return lines;
}

/** Pad connector rows so they visually align with commit rows (like git). */
function padChars(chars: string[]): string {
  return chars.join("").replace(/\s+$/, "") + "  ";
}

function buildChars(
  rowIdx: number,
  laneActive: (row: number, lane: number) => boolean,
  laneCount: number
): string[] {
  const chars: string[] = [];
  for (let j = 0; j < laneCount; j++) {
    chars.push(laneActive(rowIdx, j) ? "|" : " ");
    if (j < laneCount - 1) chars.push(" ");
  }
  return chars;
}

// --- branches & switching ---------------------------------------------------

function gitBranch(s: GitState, rest: string[]): Lines {
  const initErr = requireInit(s);
  if (initErr) return initErr;
  const [name] = rest;
  if (!name) {
    const names = Object.keys(s.branches).sort((a, b) => {
      if (a === s.head) return -1;
      if (b === s.head) return 1;
      return a.localeCompare(b);
    });
    return names.map((n) => out(`${n === s.head ? "* " : "  "}${n}`));
  }
  if (!/^[A-Za-z0-9][A-Za-z0-9._/-]*$/.test(name)) {
    return [err(`fatal: '${name}' is not a valid branch name`)];
  }
  if (name in s.branches) {
    return [err(`fatal: a branch named '${name}' already exists`)];
  }
  s.branches[name] = s.branches[s.head] ?? "";
  s.branchLane[name] = Math.max(-1, ...Object.values(s.branchLane)) + 1;
  s.events.push({ type: "branch", name });
  return [];
}

function gitSwitch(s: GitState, rest: string[], via: "switch" | "checkout"): Lines {
  const initErr = requireInit(s);
  if (initErr) return initErr;
  const create = rest.includes("-c") || rest.includes("--create") || (via === "checkout" && (rest.includes("-b")));
  const name = rest.filter((r) => !r.startsWith("-"))[0];
  if (!name) return [err(`usage: git ${via} ${via === "switch" ? "[-c] " : "[-b] "}<branch>`)];
  if (create) {
    if (name in s.branches) return [err(`fatal: a branch named '${name}' already exists`)];
    // uncommitted staged/modified changes refuse the switch (teaching model)
    const dirty = fileViews(s).some((v) => v.staged || v.work);
    if (dirty) {
      return [
        err(`error: Your local changes would be overwritten by checkout`),
        hint("Commit (or unstage) your work before creating a branch from a clean tree — the sandbox keeps switching strict so the graph stays honest."),
      ];
    }
    s.branches[name] = s.branches[s.head] ?? "";
    s.branchLane[name] = Math.max(-1, ...Object.values(s.branchLane)) + 1;
    s.events.push({ type: "branch", name });
    const target = tipOf(s, name);
    syncWorktree(s, target);
    s.head = name;
    s.events.push({ type: "switch", name });
    return [out(`Switched to a new branch '${name}'`)];
  }
  if (!(name in s.branches)) {
    return [
      err(`error: pathspec '${name}' did not match any file(s) known to git`),
      hint(`Create it first: git switch -c ${name}`),
    ];
  }
  if (name === s.head) return [out(`Already on '${name}'`)];
  const dirty = fileViews(s).some((v) => v.staged || v.work);
  if (dirty) {
    return [
      err("error: Your local changes would be overwritten by checkout. Please commit your changes before you switch branches."),
      hint("Branches point at snapshots — switching rewrites the working tree, so the sandbox demands a clean tree first (untracked files are fine)."),
    ];
  }
  const target = tipOf(s, name);
  syncWorktree(s, target);
  s.head = name;
  s.events.push({ type: "switch", name });
  return [out(`Switched to branch '${name}'`)];
}

/** After switching, working + staging mirror the target snapshot (untracked files carry over). */
function syncWorktree(s: GitState, target: Commit | undefined) {
  const tree = target?.tree ?? {};
  // keep untracked files (not in target tree, not tracked in current tip)
  const carried: Record<string, string> = {};
  const currentTree = tipOf(s, s.head)?.tree ?? {};
  for (const [n, content] of Object.entries(s.working)) {
    if (!(n in tree) && !(n in currentTree)) carried[n] = content;
  }
  s.working = { ...tree, ...carried };
  s.staged = { ...tree };
}

// --- merging ------------------------------------------------------------------

function gitMerge(s: GitState, rest: string[]): Lines {
  const initErr = requireInit(s);
  if (initErr) return initErr;
  const name = rest.filter((r) => !r.startsWith("-") && !r.includes("="))[0];
  if (!name) return [err("usage: git merge <branch>")];
  if (!(name in s.branches)) {
    return [err(`merge: ${name} - not something we can merge`), hint(`Branches that exist: ${Object.keys(s.branches).join(", ")}`)];
  }
  if (name === s.head) {
    return [err("fatal: You cannot merge a branch with itself.")];
  }
  const source = tipOf(s, name);
  const target = tipOf(s, s.head);
  if (!source || !target) {
    return [err("fatal: both branches need at least one commit before a merge means anything")];
  }
  if (source.id === target.id || reachable(s, target.id).has(source.id)) {
    return [ok("Already up to date.")];
  }
  // Fast-forward: source is a direct descendant of target.
  if (reachable(s, source.id).has(target.id)) {
    const stats = treeStats(target.tree, source.tree);
    s.branches[s.head] = source.id;
    syncWorktree(s, source);
    s.events.push({ type: "merge", into: s.head, from: name, strategy: "ff", id: source.id });
    return [
      out(`Updating ${target.id}..${source.id}`),
      ok("Fast-forward"),
      out(` ${stats.files} file${stats.files === 1 ? "" : "s"} changed, ${stats.insertions} insertion${stats.insertions === 1 ? "" : "s"}(+)`),
    ];
  }
  // True merge: find the base, diff both sides.
  const base = mergeBase(s, target.id, source.id);
  const baseTree = base?.tree ?? {};
  const changedOn = (tipTree: Record<string, string>): Set<string> => {
    const names = new Set([...Object.keys(baseTree), ...Object.keys(tipTree)]);
    const changed = new Set<string>();
    for (const n of names) {
      if ((baseTree[n] ?? null) !== (tipTree[n] ?? null)) changed.add(n);
    }
    return changed;
  };
  const targetChanged = changedOn(target.tree);
  const sourceChanged = changedOn(source.tree);
  const conflicts = [...targetChanged].filter((n) => sourceChanged.has(n));
  if (conflicts.length) {
    const file = conflicts[0];
    s.events.push({ type: "conflict", from: name, file });
    return [
      out(`Auto-merging ${file}`),
      err(`CONFLICT (content): Merge conflict in ${file}`),
      err("Automatic merge failed; fix conflicts and then commit the result."),
      hint(
        "Both branches changed the same file since the split. In real Git you would edit the file between the <<<<<<< ======= >>>>>>> markers and commit the resolution. In this sandbox: change one branch so the sides agree (or keep the file on a single lane), then merge again."
      ),
    ];
  }
  // Auto-merge: union of both sides (no overlapping files by the check above).
  const merged: Record<string, string> = { ...baseTree };
  for (const n of targetChanged) merged[n] = target.tree[n];
  for (const n of sourceChanged) merged[n] = source.tree[n];
  s.seq += 1;
  const id = fakeHash(`${s.seq}:merge:${s.head}:${name}`);
  const commit: Commit = {
    id,
    msg: `Merge branch '${name}'`,
    parents: [target.id, source.id],
    tree: merged,
    branch: s.head,
    ts: s.seq,
  };
  s.commits.push(commit);
  s.branches[s.head] = id;
  s.staged = { ...merged };
  s.working = { ...merged };
  s.events.push({ type: "merge", into: s.head, from: name, strategy: "merge-commit", id });
  const stats = treeStats(target.tree, merged);
  return [
    out(`Merge made by the 'ort' strategy.`),
    out(` ${stats.files} file${stats.files === 1 ? "" : "s"} changed, ${stats.insertions} insertion${stats.insertions === 1 ? "" : "s"}(+)`),
  ];
}

// --- diff ---------------------------------------------------------------------

function gitDiff(s: GitState): Lines {
  const initErr = requireInit(s);
  if (initErr) return initErr;
  const lines: Lines = [];
  for (const v of fileViews(s).filter((x) => x.work)) {
    const stagedContent = s.staged[v.name] ?? "";
    const workingContent = s.working[v.name] ?? "";
    const stagedLines = stagedContent.split("\n").filter((l) => l !== "");
    const workingLines = workingContent.split("\n").filter((l) => l !== "");
    const stagedSet = new Set(stagedLines);
    const workingSet = new Set(workingLines);
    lines.push(out(`diff --git a/${v.name} b/${v.name}`));
    lines.push(out(`--- a/${v.name}`));
    lines.push(out(`+++ b/${v.name}`));
    for (const l of stagedLines) if (!workingSet.has(l)) lines.push(err(`-${l}`));
    for (const l of workingLines) if (!stagedSet.has(l)) lines.push(ok(`+${l}`));
  }
  if (!lines.length) {
    lines.push(hint("(git diff compares the working tree with the staging area — nothing unstaged right now)"));
  }
  return lines;
}

// --- undo ---------------------------------------------------------------------

function gitRestore(s: GitState, rest: string[]): Lines {
  const initErr = requireInit(s);
  if (initErr) return initErr;
  const stagedFlag = rest.includes("--staged") || rest.includes("--staged=true");
  const file = rest.filter((r) => !r.startsWith("-"))[0];
  if (!file) return [err("usage: git restore [--staged] <file>"), hint("Plain restore discards uncommitted edits; --staged unstages but keeps your edits.")];
  if (stagedFlag) {
    const tip = tipOf(s, s.head);
    const headTree = tip?.tree ?? {};
    if (file in headTree) {
      s.staged[file] = headTree[file];
    } else if (file in s.staged) {
      delete s.staged[file];
    } else {
      return [err(`error: pathspec '${file}' did not match any file(s) known to git`)];
    }
    return [
      hint(
        `${file} unstaged — the staging area now matches the last commit again (your working-tree edits are untouched).`
      ),
    ];
  }
  if (!(file in s.staged)) {
    return [
      err(`error: pathspec '${file}' did not match any file(s) known to git`),
      hint("restore only works on tracked files — untracked files have no snapshot to return to."),
    ];
  }
  s.working[file] = s.staged[file];
  return [hint(`${file} restored from the staging area — uncommitted edits discarded (this one is NOT undoable).`)];
}

function gitReset(s: GitState, rest: string[]): Lines {
  const initErr = requireInit(s);
  if (initErr) return initErr;
  let mode: "soft" | "mixed" | "hard" = "mixed";
  for (const r of rest) {
    if (r === "--soft") mode = "soft";
    else if (r === "--hard") mode = "hard";
    else if (r === "--mixed" || r === "-m") mode = "mixed";
  }
  const rev = rest.filter((r) => !r.startsWith("-")).find((r) => r.startsWith("HEAD")) ?? "HEAD~1";
  const m = rev.match(/^HEAD~(\d+)$/);
  if (!m) return [err(`fatal: ambiguous argument '${rev}': unknown revision`)];
  const n = parseInt(m[1], 10);
  const tip = tipOf(s, s.head);
  if (!tip) return [err(`fatal: ${rev} is not a valid revision — this branch has no commits yet`)];
  const target = nthAncestor(s, tip.id, n);
  if (!target) return [err(`fatal: Cannot move HEAD ${n} commits back — only ${countAncestors(s, tip.id)} exist on this branch`)];
  s.branches[s.head] = target.id;
  s.events.push({ type: "reset", mode, to: target.id });
  if (mode === "soft") {
    return [hint(`Branch pointer moved to ${target.id} (${target.msg}). Staging and working tree untouched — your changes wait in the index, ready to re-commit.`)];
  }
  if (mode === "mixed") {
    s.staged = { ...target.tree };
    const unstaged = Object.keys({ ...target.tree, ...s.working }).filter(
      (k) => (s.working[k] ?? null) !== (target.tree[k] ?? null)
    );
    const lines: Lines = [hint(`Branch pointer moved to ${target.id} (${target.msg}). The staging area now matches it — your working edits survive.`)];
    if (unstaged.length) {
      lines.push(out("Unstaged changes after reset:"));
      for (const f of unstaged) lines.push(out(`\t${f}`));
    }
    return lines;
  }
  s.staged = { ...target.tree };
  s.working = { ...target.tree };
  return [ok(`HEAD is now at ${target.id} ${target.msg}`), hint("--hard wiped the working tree to match — anything uncommitted is gone for good.")];
}

function countAncestors(s: GitState, id: string): number {
  let n = 0;
  let cur = commitById(s, id);
  while (cur && cur.parents[0]) {
    n++;
    cur = commitById(s, cur.parents[0]);
  }
  return n;
}

function gitRevert(s: GitState, rest: string[]): Lines {
  const initErr = requireInit(s);
  if (initErr) return initErr;
  const rev = rest.find((r) => !r.startsWith("-")) ?? "HEAD";
  if (rev !== "HEAD") {
    return [err("This sandbox reverts only the most recent commit: git revert HEAD")];
  }
  const tip = tipOf(s, s.head);
  if (!tip) return [err("fatal: no commits to revert yet")];
  const parent = tip.parents[0] ? commitById(s, tip.parents[0]) : undefined;
  if (!parent) return [err("fatal: cannot revert a root commit — nothing came before it")];
  s.seq += 1;
  const id = fakeHash(`${s.seq}:revert:${tip.id}`);
  const commit: Commit = {
    id,
    msg: `Revert "${tip.msg}"`,
    parents: [tip.id],
    tree: { ...parent.tree },
    branch: s.head,
    ts: s.seq,
  };
  s.commits.push(commit);
  s.branches[s.head] = id;
  s.staged = { ...commit.tree };
  s.working = { ...commit.tree };
  s.events.push({ type: "revert", reverted: tip.id, id });
  const stats = treeStats(tip.tree, commit.tree);
  return [
    out(`[${s.head} ${id}] Revert "${tip.msg}"`),
    out(` This reverts commit ${tip.id}.`),
    out(` ${stats.files} file${stats.files === 1 ? "" : "s"} changed, ${stats.insertions} insertion${stats.insertions === 1 ? "" : "s"}(+), ${stats.insertions} deletion${stats.insertions === 1 ? "" : "s"}(-)`),
  ];
}

// ---------------------------------------------------------------------------
// Missions

export type MissionDef = {
  id: string;
  title: string;
  brief: string;
  starter: string;
  hint: string;
  solution: string;
  check: (s: GitState) => boolean;
};

export const GIT_MISSIONS: MissionDef[] = [
  {
    id: "first-snapshot",
    title: "Your first snapshot",
    brief:
      "Turn an empty folder into a repository and capture your first snapshot: init the repo, create a file, stage it, commit it. Watch a commit node appear in the graph.",
    starter: "git init\ntouch journal.md\ngit status",
    hint: "git status told you the file is untracked. Stage it with git add, then capture it with git commit -m \"start the journal\".",
    solution: "git init\ntouch journal.md\ngit add journal.md\ngit commit -m \"start the journal\"",
    check: (s) => s.initialized && s.commits.length >= 1,
  },
  {
    id: "three-checkpoints",
    title: "Three checkpoints",
    brief:
      "Real projects move in small steps. Make three commits on main — edit the file between each one so every snapshot captures something new.",
    starter: "git init\ntouch journal.md\ngit add .\ngit commit -m \"checkpoint one\"",
    hint: "After each commit, append a line to journal.md (echo \"...\" >> journal.md), stage it, and commit again. Repeat until the graph shows three nodes.",
    solution:
      'git init\ntouch journal.md\ngit add .\ngit commit -m "one"\necho "second" >> journal.md\ngit add .\ngit commit -m "two"\necho "third" >> journal.md\ngit add .\ngit commit -m "three"',
    check: (s) => s.commits.length >= 3,
  },
  {
    id: "second-lane",
    title: "Open a second lane",
    brief:
      "Create a branch and commit on it while main stays behind. Proof that branching copies nothing: the file list never changes, only the pointers move.",
    starter: "git init\ntouch journal.md\ngit add .\ngit commit -m \"the shared starting point\"",
    hint: "git switch -c experiment creates AND switches in one step. Edit the file, stage, commit — then look at the graph: two lanes, main unchanged.",
    solution:
      'git init\ntouch journal.md\ngit add .\ngit commit -m "the shared starting point"\ngit switch -c experiment\necho "a lane of my own" >> journal.md\ngit add .\ngit commit -m "a commit on the side lane"',
    check: (s) => s.commits.some((c) => c.branch !== "main") && Object.keys(s.branches).length >= 2,
  },
  {
    id: "fast-forward",
    title: "A fast-forward merge",
    brief:
      "Branch, commit ahead, switch back to main and merge. When main never moved, git takes the shortcut: no new commit — the main pointer just slides forward.",
    starter: "git init\ntouch journal.md\ngit add .\ngit commit -m \"the shared starting point\"",
    hint: "Create feature (git switch -c feature), commit once, switch back to main, then git merge feature. Read the output: it says Fast-forward — count the commits before and after.",
    solution:
      'git init\ntouch journal.md\ngit add .\ngit commit -m "the shared starting point"\ngit switch -c feature\necho "a lane of my own" >> journal.md\ngit add .\ngit commit -m "one commit ahead"\ngit switch main\ngit merge feature\ngit log --oneline',
    check: (s) => s.events.some((e) => e.type === "merge" && e.strategy === "ff"),
  },
  {
    id: "true-merge",
    title: "A true merge commit",
    brief:
      "Make both lanes advance after the split, then merge. This time there is no shortcut — git must build a brand-new commit with two parents. Find it in the graph.",
    starter: "git init\ntouch journal.md\ngit add .\ngit commit -m \"base\"",
    hint: "Commit on the branch (feature.md), then ALSO commit on main (main.md) before merging. Both sides advanced, so the merge creates a commit with two parents.",
    solution:
      'git init\ntouch journal.md\ngit add .\ngit commit -m "base"\ngit switch -c feature\necho "feature notes" > feature.md\ngit add .\ngit commit -m "work on the side lane"\ngit switch main\necho "main keeps moving" > main.md\ngit add .\ngit commit -m "main is not idle"\ngit merge feature\ngit log --graph --oneline --all',
    check: (s) => s.commits.some((c) => c.parents.length >= 2),
  },
  {
    id: "safe-undo",
    title: "The safe undo",
    brief:
      "Rewind history without losing it: stage something you should not have, then move the branch pointer back one commit with git reset. The commits are still in the repo's memory — only the pointer moved.",
    starter: "git init\ntouch journal.md\ngit add .\ngit commit -m \"keep this one\"\necho \"a second thought\" >> journal.md\ngit add .\ngit commit -m \"maybe too fast\"",
    hint: "git reset --soft HEAD~1 moves the branch back one commit but keeps everything staged — then you can re-commit or unstage with git restore --staged journal.md.",
    solution:
      'git init\ntouch journal.md\ngit add .\ngit commit -m "keep this one"\necho "a second thought" >> journal.md\ngit add .\ngit commit -m "maybe too fast"\ngit reset --soft HEAD~1\ngit restore --staged journal.md\ngit status',
    check: (s) => s.events.some((e) => e.type === "reset") && s.commits.length >= 1,
  },
];

// ---------------------------------------------------------------------------
// Free-play presets (loaded into the editor as a starting script)

export type Preset = { name: string; blurb: string; script: string };

export const GIT_PRESETS: Preset[] = [
  {
    name: "Fresh repo",
    blurb: "Start from zero — init, create, stage, commit.",
    script: "git init\ntouch journal.md\ngit status",
  },
  {
    name: "Diverged lanes",
    blurb: "Two branches, both ahead — the merge is yours to run.",
    script:
      'git init\ntouch journal.md\ngit add .\ngit commit -m "the shared starting point"\ngit switch -c feature\necho "a lane of my own" >> journal.md\ngit add .\ngit commit -m "one commit ahead"\ngit switch main\necho "main keeps moving" >> main.md\ngit add .\ngit commit -m "main is not idle"',
  },
  {
    name: "Conflict kitchen",
    blurb: "Both branches edited the same file — merge and meet the CONFLICT.",
    script:
      'git init\ntouch recipe.md\necho "shared base line" > recipe.md\ngit add .\ngit commit -m "the base recipe"\ngit switch -c spicy\necho "add chili" > recipe.md\ngit add .\ngit commit -m "spice it up"\ngit switch main\necho "add honey" > recipe.md\ngit add .\ngit commit -m "sweeten it"',
  },
  {
    name: "The undo kit",
    blurb: "Three commits and a staged draft — practice restore, reset, revert.",
    script:
      'git init\ntouch draft.md\necho "v1" > draft.md\ngit add .\ngit commit -m "first draft"\necho "v2" > draft.md\ngit add .\ngit commit -m "second draft"\necho "v3" > draft.md\ngit add .\ngit commit -m "third draft"\necho "scratch notes" > notes.md\ngit add notes.md',
  },
  {
    name: "Graph reading drill",
    blurb: "Three tips, one root — read the topology with git graph.",
    script:
      'git init\ntouch journal.md\ngit add .\ngit commit -m "root"\ngit switch -c left-lane\necho "left" > left.md\ngit add .\ngit commit -m "left work"\ngit switch main\necho "main" > main.md\ngit add .\ngit commit -m "main work"\ngit switch -c right-lane\necho "right" > right.md\ngit add .\ngit commit -m "right work"\ngit log --graph --oneline --all',
  },
  {
    name: "Checkpoint journal",
    blurb: "The course capstone starter — a journal repo with rhythm.",
    script:
      'git init\ntouch journal.md\ngit add .\ngit commit -m "day 0: the repo begins"\necho "day 1: snapshots clicked" >> journal.md\ngit add .\ngit commit -m "day 1"\ngit switch -c ideas\necho "day 2 idea: branches are free" >> journal.md\ngit add .\ngit commit -m "day 2 on ideas"\ngit switch main\necho "day 2 main: steady rhythm" >> journal.md\ngit add .\ngit commit -m "day 2 on main"',
  },
];

// ---------------------------------------------------------------------------
// Layout helpers for the SVG DAG panel

export type DagNode = {
  commit: Commit;
  /** Longest path from a root (x position). */
  gen: number;
  /** Creation lane (y position). */
  lane: number;
};

/** Generation index for every commit (roots = 0, children = 1 + max(parents)). */
export function generations(s: GitState): Map<string, number> {
  const gen = new Map<string, number>();
  const byId = new Map(s.commits.map((c) => [c.id, c]));
  const walk = (id: string): number => {
    if (gen.has(id)) return gen.get(id)!;
    const c = byId.get(id);
    if (!c || c.parents.length === 0) {
      gen.set(id, 0);
      return 0;
    }
    // guard against cycles (shouldn't happen, but cheap)
    gen.set(id, 0);
    const g = 1 + Math.max(...c.parents.map((p) => (byId.has(p) ? walk(p) : 0)));
    gen.set(id, g);
    return g;
  };
  for (const c of s.commits) walk(c.id);
  return gen;
}

/** Creation lane for every commit (its branch's lane). */
export function commitLanes(s: GitState): Map<string, number> {
  const lanes = new Map<string, number>();
  for (const c of s.commits) {
    lanes.set(c.id, s.branchLane[c.branch] ?? 0);
  }
  return lanes;
}
