"use client";

// Git History Playground — the fifth playable simulator.
// A faithful teaching model of Git runs synchronously on the main thread
// (src/lib/git-simulator.ts — a command interpreter, no eval, no worker
// needed). The signature panel is the LIVE COMMIT GRAPH: every run redraws
// the DAG — nodes are snapshots, chips are branch pointers, the dark chip
// is HEAD. Guided missions + free play, deep-linkable from course practice
// blocks (/?view=simulator&sim=git-history-playground&q=<commands>).

import * as React from "react";
import Image from "next/image";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import {
  AlertTriangle,
  ArrowLeft,
  Check,
  ChevronRight,
  Copy,
  Eraser,
  GitBranch,
  GitMerge,
  History,
  KeyRound,
  Lightbulb,
  Play,
  Sparkles,
  Target,
  Terminal,
  Trophy,
  Zap,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { useLibrary, useLibraryHydrated } from "@/lib/library-store";
import {
  GIT_MISSIONS,
  GIT_PRESETS,
  fileViews,
  generations,
  commitLanes,
  initialState,
  laneColor,
  runScript,
  type ConsoleLine,
  type GitState,
} from "@/lib/git-simulator";
import { tokenizeLine } from "./lesson/LessonBlocks";
import { trackEvent } from "./platform-data";
import type { CategoryView, ResourceItemView } from "@/lib/platform";

interface GitPlaygroundProps {
  item: ResourceItemView;
  category: CategoryView;
}

type Mode = "free" | "missions";

const EDITOR_FONT = "font-mono text-[13px] leading-6 tracking-tight";

// ---------------------------------------------------------------------------
// Console — a terminal transcript of the last run

function ConsolePanel({ lines }: { lines: ConsoleLine[] }) {
  const scroller = React.useRef<HTMLDivElement>(null);
  React.useEffect(() => {
    const el = scroller.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [lines]);
  return (
    <div className="overflow-hidden rounded-2xl border bg-zinc-950 text-zinc-200 dark:bg-black/60">
      <div className="flex items-center gap-2 border-b border-white/10 bg-white/[0.03] px-4 py-2.5">
        <Terminal aria-hidden className="size-3.5 text-zinc-400" />
        <span className="text-[11px] font-semibold uppercase tracking-wider text-zinc-400">Console</span>
        <span className="ml-auto text-[11px] tabular-nums text-zinc-500">{lines.length} lines</span>
      </div>
      <div ref={scroller} className="max-h-80 overflow-y-auto px-4 py-3" aria-live="polite">
        <pre className={cn(EDITOR_FONT, "whitespace-pre-wrap break-words")}>
          {lines.map((l, i) => (
            <span
              key={i}
              className={cn(
                "block",
                l.kind === "cmd" && "text-zinc-100",
                l.kind === "out" && "text-zinc-300",
                l.kind === "err" && "text-rose-400",
                l.kind === "ok" && "text-emerald-400",
                l.kind === "hint" && "text-amber-300"
              )}
            >
              {l.kind === "cmd" ? <span className="text-rose-500">$ </span> : null}
              {l.kind === "hint" ? "ⓘ " : null}
              {l.text}
            </span>
          ))}
        </pre>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// GraphView — THE signature panel: the live commit DAG

const X_STEP = 86;
const LANE_H = 58;
const PAD_X = 46;
const PAD_Y = 40;
const NODE_R = 8;

function GraphView({ state }: { state: GitState }) {
  if (!state.initialized || state.commits.length === 0) {
    return (
      <div className="flex min-h-[132px] flex-col items-center justify-center gap-2 px-6 py-8 text-center">
        <div aria-hidden className="relative">
          <span className="absolute inset-0 -m-2 rounded-full border-2 border-dashed border-rose-400/40" />
          <GitCommitDot className="size-6 text-muted-foreground/50" />
        </div>
        <p className="text-sm font-medium text-muted-foreground">
          {state.initialized ? "No commits yet" : "Not a repository yet"}
        </p>
        <p className="max-w-xs text-xs leading-relaxed text-muted-foreground/80">
          {state.initialized
            ? "The first node appears the moment you run git commit — stage a file first."
            : "Run git init in the terminal — every snapshot you commit will draw itself here."}
        </p>
      </div>
    );
  }

  const gen = generations(state);
  const lanes = commitLanes(state);
  const maxGen = Math.max(...state.commits.map((c) => gen.get(c.id) ?? 0));
  const maxLane = Math.max(...state.commits.map((c) => lanes.get(c.id) ?? 0));
  const width = PAD_X * 2 + (maxGen + 1) * X_STEP;
  const height = PAD_Y * 2 + (maxLane + 1) * LANE_H;
  const px = (id: string) => PAD_X + (gen.get(id) ?? 0) * X_STEP;
  const py = (id: string) => PAD_Y + (lanes.get(id) ?? 0) * LANE_H;

  // branch chips stacked above each tip (HEAD branch first)
  const chipsByCommit = new Map<string, { name: string; isHead: boolean; lane: number }[]>();
  for (const [name, tipId] of Object.entries(state.branches)) {
    if (!tipId) continue;
    const list = chipsByCommit.get(tipId) ?? [];
    list.push({ name, isHead: name === state.head, lane: state.branchLane[name] ?? 0 });
    chipsByCommit.set(tipId, list);
  }

  return (
    <div className="overflow-x-auto px-3 py-4" role="img" aria-label="Live commit graph: nodes are commits, chips are branch pointers">
      <svg
        viewBox={`0 0 ${width} ${height}`}
        width={Math.max(width, 320)}
        height={height}
        className="mx-auto block"
        style={{ minWidth: Math.min(width, 640) }}
      >
        {/* parent edges */}
        {state.commits.flatMap((c) =>
          c.parents.map((pid) => {
            const p = state.commits.find((x) => x.id === pid);
            if (!p) return null;
            const x1 = px(c.id);
            const y1 = py(c.id);
            const x2 = px(pid);
            const y2 = py(pid);
            const sameLane = y1 === y2;
            const stroke = laneColor(lanes.get(pid) ?? 0);
            const key = `e-${c.id}-${pid}`;
            if (sameLane) {
              return <line key={key} x1={x1} y1={y1} x2={x2} y2={y2} stroke={stroke} strokeWidth={2.5} opacity={0.55} />;
            }
            // merge edge: gentle curve through the midpoint
            const mx = (x1 + x2) / 2;
            return (
              <path
                key={key}
                d={`M ${x1} ${y1} C ${mx - 18} ${y1}, ${mx + 18} ${y2}, ${x2} ${y2}`}
                fill="none"
                stroke={stroke}
                strokeWidth={2.5}
                opacity={0.55}
              />
            );
          })
        )}
        {/* commit nodes */}
        {state.commits.map((c) => {
          const x = px(c.id);
          const y = py(c.id);
          const fill = laneColor(lanes.get(c.id) ?? 0);
          const isMerge = c.parents.length > 1;
          const isHeadTip = state.branches[state.head] === c.id;
          return (
            <g key={c.id}>
              {isMerge ? <circle cx={x} cy={y} r={NODE_R + 4.5} fill="none" stroke={fill} strokeWidth={1.5} opacity={0.5} /> : null}
              {isHeadTip ? <circle cx={x} cy={y} r={NODE_R + 3} fill="none" stroke="currentColor" strokeWidth={1.5} opacity={0.35} className="text-foreground" /> : null}
              <circle cx={x} cy={y} r={NODE_R} fill={fill} stroke="white" strokeWidth={2} className="dark:stroke-zinc-950">
                <title>{`${c.id} — ${c.msg}${isMerge ? " (merge commit, two parents)" : ""}`}</title>
              </circle>
              <text x={x} y={y + NODE_R + 13} textAnchor="middle" className="fill-muted-foreground font-mono" fontSize={9}>
                {c.id.slice(0, 5)}
              </text>
              {isMerge ? (
                <g transform={`translate(${x + 12}, ${y - 20})`}>
                  <GitMerge className="size-3" style={{ color: fill }} aria-label="merge commit" />
                </g>
              ) : null}
            </g>
          );
        })}
        {/* branch chips above tips */}
        {[...chipsByCommit.entries()].map(([tipId, chips]) => {
          const sorted = [...chips].sort((a, b) => Number(b.isHead) - Number(a.isHead));
          let ox = px(tipId) - 14;
          const y = py(tipId) - 24;
          return sorted.map((chip) => {
            const w = chip.name.length * 6.4 + (chip.isHead ? 52 : 14);
            const x = ox;
            ox += w + 6;
            const color = laneColor(chip.lane);
            return (
              <g key={`${tipId}-${chip.name}`} transform={`translate(${Math.max(x, 6)}, ${y})`}>
                <rect
                  width={w}
                  height={18}
                  rx={9}
                  fill={chip.isHead ? "currentColor" : color}
                  opacity={chip.isHead ? 0.92 : 0.14}
                  className={chip.isHead ? "text-foreground" : undefined}
                  stroke={chip.isHead ? "none" : color}
                  strokeWidth={1.2}
                />
                <text
                  x={w / 2}
                  y={12.5}
                  textAnchor="middle"
                  fontSize={9.5}
                  className={cn("font-mono font-semibold", chip.isHead ? "fill-background" : "")}
                  fill={chip.isHead ? undefined : color}
                  style={chip.isHead ? { fill: "var(--background)" } : undefined}
                >
                  {chip.isHead ? `◆ HEAD → ${chip.name}` : chip.name}
                </text>
              </g>
            );
          });
        })}
      </svg>
    </div>
  );
}

function GitCommitDot({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={className} aria-hidden="true">
      <circle cx="12" cy="12" r="4" />
      <path d="M12 4v4M12 16v4" />
    </svg>
  );
}

// ---------------------------------------------------------------------------
// StatePanel — branches + files with lifecycle badges

function StatePanel({ state }: { state: GitState }) {
  const branches = Object.entries(state.branches).sort(([a], [b]) => {
    if (a === state.head) return -1;
    if (b === state.head) return 1;
    return a.localeCompare(b);
  });
  const files = fileViews(state);
  return (
    <div className="overflow-hidden rounded-2xl border bg-card">
      <div className="flex items-center gap-2 border-b bg-muted/30 px-4 py-3">
        <GitBranch aria-hidden className="size-3.5 text-muted-foreground" />
        <h2 className="text-xs font-semibold uppercase tracking-wider">Repository state</h2>
      </div>
      <div className="space-y-1 p-4">
        <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Branches</p>
        {branches.length === 0 ? (
          <p className="text-xs text-muted-foreground">— none yet —</p>
        ) : (
          branches.map(([name, tipId]) => (
            <div key={name} className="flex items-center gap-2 rounded-lg px-2 py-1 font-mono text-[12px]">
              <span aria-hidden className="size-2 shrink-0 rounded-full" style={{ background: laneColor(state.branchLane[name] ?? 0) }} />
              <span className={cn("truncate", name === state.head ? "font-bold text-foreground" : "text-muted-foreground")}>
                {name === state.head ? `* ${name}` : name}
              </span>
              <span className="ml-auto text-[10.5px] text-muted-foreground/70">{tipId ? tipId.slice(0, 7) : "unborn"}</span>
            </div>
          ))
        )}
      </div>
      <div className="space-y-1.5 border-t bg-muted/20 p-4">
        <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Working directory</p>
        {files.length === 0 ? (
          <p className="text-xs text-muted-foreground">— empty —</p>
        ) : (
          <ul className="max-h-44 space-y-1 overflow-y-auto pr-1">
            {files.map((f) => (
              <li key={f.name} className="flex items-center gap-2 rounded-lg px-2 py-1 font-mono text-[12px]">
                <span className="truncate text-foreground/90">{f.name}</span>
                <span className="ml-auto shrink-0">
                  {f.untracked ? (
                    <Badge variant="outline" className="border-rose-500/40 bg-rose-500/10 px-1.5 py-0 text-[9.5px] font-semibold text-rose-600 dark:text-rose-300">
                      untracked
                    </Badge>
                  ) : f.staged && f.work ? (
                    <Badge variant="outline" className="border-amber-500/40 bg-amber-500/10 px-1.5 py-0 text-[9.5px] font-semibold text-amber-700 dark:text-amber-300">
                      staged + modified
                    </Badge>
                  ) : f.staged ? (
                    <Badge variant="outline" className="border-teal-500/40 bg-teal-500/10 px-1.5 py-0 text-[9.5px] font-semibold text-teal-700 dark:text-teal-300">
                      {f.staged === "new" ? "new file" : "staged"}
                    </Badge>
                  ) : f.work ? (
                    <Badge variant="outline" className="border-amber-500/40 bg-amber-500/10 px-1.5 py-0 text-[9.5px] font-semibold text-amber-700 dark:text-amber-300">
                      modified
                    </Badge>
                  ) : (
                    <Badge variant="outline" className="border-emerald-500/40 bg-emerald-500/10 px-1.5 py-0 text-[9.5px] font-semibold text-emerald-600 dark:text-emerald-300">
                      clean
                    </Badge>
                  )}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// CheatSheet — the command surface, honestly scoped

function CheatSheet() {
  const groups: { title: string; rows: [string, string][] }[] = [
    {
      title: "shell",
      rows: [
        ["touch <file>", "create an empty file"],
        ['echo "text" > file', "write a file (>> appends)"],
        ["ls", "list working files"],
      ],
    },
    {
      title: "snapshots",
      rows: [
        ["git init", "start the repository"],
        ["git status", "staged / modified / untracked"],
        ["git add <file|·.>", "stage current content"],
        ['git commit -m "msg"', "snapshot the index"],
        ["git diff", "working vs staging"],
      ],
    },
    {
      title: "pointers",
      rows: [
        ["git branch [name]", "list / create a pointer"],
        ["git switch -c <name>", "create + move HEAD"],
        ["git merge <name>", "ff or merge commit"],
        ["git log --graph --oneline --all", "ASCII topology"],
        ["git graph", "shortcut for the above"],
      ],
    },
    {
      title: "undo",
      rows: [
        ["git restore <file>", "discard working edits ✗"],
        ["git restore --staged <f>", "unstage, keep edits"],
        ["git reset --soft HEAD~1", "move pointer, keep index"],
        ["git reset --hard HEAD~1", "move pointer, wipe tree ✗"],
        ["git revert HEAD", "new inverse commit"],
      ],
    },
  ];
  return (
    <div className="overflow-hidden rounded-2xl border bg-card">
      <div className="flex items-center gap-2 border-b bg-muted/30 px-4 py-3">
        <Zap aria-hidden className="size-3.5 text-rose-500" />
        <h2 className="text-xs font-semibold uppercase tracking-wider">Command surface</h2>
      </div>
      <div className="space-y-3.5 p-4">
        {groups.map((g) => (
          <div key={g.title}>
            <p className="text-[11px] font-semibold uppercase tracking-wider text-rose-600 dark:text-rose-400">{g.title}</p>
            <ul className="mt-1.5 space-y-2.5">
              {g.rows.map(([cmd, desc]) => (
                <li key={cmd} className="leading-normal">
                  <code className="font-mono text-[11px] font-semibold text-foreground">{cmd}</code>
                  <span className="mt-0.5 block text-[11px] text-muted-foreground">{desc}</span>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
      <div className="border-t bg-muted/30 px-4 py-3">
        <p className="flex items-start gap-2 text-[11px] leading-snug text-muted-foreground">
          <AlertTriangle aria-hidden className="mt-0.5 size-3.5 shrink-0 text-amber-500" />
          No remotes, no rebase, no stash — a strict teaching subset. Same-file changes on both branches
          trigger a CONFLICT on merge (by design).
        </p>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// GitEditor — terminal-style multi-command editor with bash highlighting

function GitEditor({
  value,
  onChange,
  onRun,
}: {
  value: string;
  onChange: (v: string) => void;
  onRun: () => void;
}) {
  const taRef = React.useRef<HTMLTextAreaElement>(null);
  const preInnerRef = React.useRef<HTMLDivElement>(null);
  const gutterInnerRef = React.useRef<HTMLDivElement>(null);
  const lineCount = Math.max(value.split("\n").length, 1);

  const syncScroll = () => {
    const ta = taRef.current;
    if (!ta) return;
    if (gutterInnerRef.current) gutterInnerRef.current.style.transform = `translateY(${-ta.scrollTop}px)`;
    if (preInnerRef.current) preInnerRef.current.style.transform = `translateY(${-ta.scrollTop}px)`;
  };

  const onKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
      e.preventDefault();
      onRun();
      return;
    }
    if (e.key === "Tab") {
      e.preventDefault();
      const ta = e.currentTarget;
      const start = ta.selectionStart;
      const end = ta.selectionEnd;
      const next = `${value.slice(0, start)}  ${value.slice(end)}`;
      onChange(next);
      requestAnimationFrame(() => {
        ta.selectionStart = ta.selectionEnd = start + 2;
      });
    }
  };

  return (
    <div
      className={cn(
        "relative flex overflow-hidden rounded-xl border bg-zinc-950/[0.03] focus-within:border-rose-500/60 focus-within:ring-2 focus-within:ring-rose-500/20 dark:bg-zinc-950/40",
        EDITOR_FONT
      )}
    >
      <div aria-hidden className="w-11 shrink-0 select-none overflow-hidden border-r bg-muted/40 py-4 text-right">
        <div ref={gutterInnerRef} className="text-muted-foreground/60">
          {Array.from({ length: lineCount }, (_, i) => (
            <div key={i} className="pr-2.5">
              {i + 1}
            </div>
          ))}
        </div>
      </div>
      <div className="relative min-w-0 flex-1">
        <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden py-4 pl-3.5">
          <div ref={preInnerRef}>
            {value.split("\n").map((line, li) => (
              <div key={li} className="whitespace-pre">
                {tokenizeLine(line, "bash").map((t, j) => (
                  <span key={j} className={t.cls}>
                    {t.text}
                  </span>
                ))}
              </div>
            ))}
          </div>
        </div>
        <textarea
          ref={taRef}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={onKeyDown}
          onScroll={syncScroll}
          spellCheck={false}
          autoCapitalize="none"
          autoCorrect="off"
          aria-label="Git command script — one command per line"
          className="relative z-10 block min-h-[120px] w-full resize-y bg-transparent py-4 pl-3.5 pr-3 text-transparent caret-foreground outline-none placeholder:text-muted-foreground/50"
          placeholder={"git init\ntouch notes.md\ngit add .\ngit commit -m \"first snapshot\""}
          rows={Math.min(Math.max(lineCount, 5), 14)}
        />
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// GitPlayground

let historyId = 0;

export function GitPlayground({ item, category }: GitPlaygroundProps) {
  const { toast } = useToast();
  const hydrated = useLibraryHydrated();
  const searchParams = useSearchParams();
  const simProgressMap = useLibrary((s) => s.simProgress);
  const completeChallenge = useLibrary((s) => s.completeChallenge);
  const pushRecent = useLibrary((s) => s.pushRecent);

  const [mode, setMode] = React.useState<Mode>("free");
  const [code, setCode] = React.useState(GIT_PRESETS[0].script);
  const [state, setState] = React.useState<GitState>(initialState);
  const [lines, setLines] = React.useState<ConsoleLine[] | null>(null);
  const [history, setHistory] = React.useState<{ id: number; script: string; ok: boolean }[]>([]);
  const [activeMission, setActiveMission] = React.useState(0);
  const [showHint, setShowHint] = React.useState(false);
  const [showSolution, setShowSolution] = React.useState(false);
  const [missionFeedback, setMissionFeedback] = React.useState<string | null>(null);
  const [copied, setCopied] = React.useState(false);

  const solvedIds = hydrated ? simProgressMap[item.slug] ?? [] : [];
  const solvedCount = solvedIds.length;
  const mission = GIT_MISSIONS[activeMission] ?? null;

  React.useEffect(() => {
    trackEvent("simulator_view", item.slug, item.title);
    pushRecent({
      slug: item.slug,
      title: item.title,
      level: item.level,
      duration: item.duration,
      categorySlug: category.slug,
      categoryTitle: category.title,
      categoryIcon: category.icon,
      categoryAccent: category.accent,
    });
  }, [item, category, pushRecent]);

  // Deep-link support: /?view=simulator&sim=git-history-playground&q=<script>
  const appliedDeepLink = React.useRef(false);
  React.useEffect(() => {
    if (appliedDeepLink.current) return;
    const q = searchParams.get("q");
    if (q && q.trim().length > 0) {
      appliedDeepLink.current = true;
      setCode(q);
      trackEvent("sandbox_deep_link", item.slug, "lesson-practice");
      toast({
        title: "Commands loaded from lesson",
        description: "They're in the terminal — press ⌘/Ctrl+Enter (or Run) to execute them.",
      });
    }
  }, [searchParams, toast, item.slug]);

  const copyCode = async () => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 1600);
    } catch { /* clipboard unavailable */ }
  };

  const runCommands = React.useCallback(() => {
    const source = code.trim();
    if (!source) return;
    const result = runScript(state, source);
    setState(result.state);
    setLines(result.lines);
    setHistory((prev) => [{ id: ++historyId, script: source, ok: !result.hadError }, ...prev].slice(0, 10));

    if (mode === "missions" && mission && !result.hadError) {
      if (solvedIds.includes(mission.id)) {
        setMissionFeedback(null);
        return;
      }
      if (mission.check(result.state)) {
        setMissionFeedback(null);
        setShowHint(false);
        setShowSolution(false);
        completeChallenge(item.slug, mission.id);
        trackEvent("challenge_complete", item.slug, mission.id);
        const isLast = solvedCount + 1 >= GIT_MISSIONS.length;
        toast({
          title: isLast ? "All missions cleared" : `Mission solved: ${mission.title}`,
          description: isLast
            ? "Snapshots, staging, pointers, both merge kinds, and a safe undo — the whole Git mental model, proven in the graph."
            : "Locked in. On to the next one.",
        });
        if (activeMission < GIT_MISSIONS.length - 1) {
          window.setTimeout(() => selectMission(activeMission + 1), 900);
        }
      } else {
        setMissionFeedback(
          "Not quite yet — check the mission briefing, then read the graph: does it show the shape the mission asks for?"
        );
      }
    }
  }, [code, state, mode, mission, solvedIds, solvedCount, completeChallenge, item.slug, activeMission, toast]);

  // Missions always start from a FRESH repository — the starter scripts assume
  // an empty folder, and a clean slate keeps every mission replayable.
  const selectMission = (i: number) => {
    setActiveMission(i);
    setShowHint(false);
    setShowSolution(false);
    setMissionFeedback(null);
    setLines(null);
    setState(initialState());
    const m = GIT_MISSIONS[i];
    if (m) setCode(m.starter);
  };

  const resetRepository = () => {
    setState(initialState());
    setLines(null);
    setMissionFeedback(null);
  };

  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-6">
      {/* Breadcrumb */}
      <nav aria-label="Breadcrumb" className="flex items-center gap-1.5 text-sm text-muted-foreground">
        <Link
          href="/"
          className="rounded inline-flex items-center gap-1 transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <ArrowLeft aria-hidden className="size-3.5" />
          All categories
        </Link>
        <ChevronRight aria-hidden className="size-3.5" />
        <Link
          href={`/?category=${category.slug}`}
          className="rounded transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          {category.title}
        </Link>
        <ChevronRight aria-hidden className="size-3.5" />
        <span aria-current="page" className="truncate font-medium text-foreground">
          {item.title}
        </span>
      </nav>

      {/* Header */}
      <motion.header
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35 }}
        className="relative overflow-hidden rounded-2xl border bg-gradient-to-br from-rose-500/15 via-transparent to-transparent p-6 sm:p-8"
      >
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 opacity-60 [background-image:radial-gradient(circle,var(--border)_1px,transparent_1px)] [background-size:18px_18px]"
        />
        <div className="relative flex flex-col gap-5 sm:flex-row sm:items-center">
          <div className="relative size-16 shrink-0 overflow-hidden rounded-2xl ring-1 ring-rose-500/25">
            <Image src={category.icon} alt={`${category.title} category icon`} fill sizes="64px" className="object-cover" />
          </div>
          <div className="min-w-0 flex-1 space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">{item.title}</h1>
              <Badge variant="outline" className="gap-1.5 border-rose-500/40 bg-rose-500/15 font-medium text-rose-700 dark:text-rose-300">
                <Play aria-hidden className="size-3" />
                Interactive
              </Badge>
              {item.level && <Badge variant="outline" className="font-normal">{item.level}</Badge>}
            </div>
            <p className="max-w-2xl text-sm leading-relaxed text-muted-foreground">{item.description}</p>
          </div>
          {hydrated && (
            <div className="flex shrink-0 items-center gap-2 rounded-xl border bg-card/60 px-4 py-2.5 backdrop-blur">
              <Trophy aria-hidden className={cn("size-4", solvedCount === GIT_MISSIONS.length ? "fill-amber-500 text-amber-500" : "text-muted-foreground")} />
              <div className="text-xs">
                <span className="block font-semibold tabular-nums">
                  {solvedCount}/{GIT_MISSIONS.length} missions
                </span>
                <span className="text-muted-foreground">{solvedCount === GIT_MISSIONS.length ? "All clear!" : "keep going"}</span>
              </div>
            </div>
          )}
        </div>
      </motion.header>

      {/* Mode switch */}
      <div
        role="tablist"
        aria-label="Sandbox mode"
        className="flex w-full max-w-md gap-1 rounded-xl border bg-muted/50 p-1"
      >
        {(["free", "missions"] as const).map((m) => (
          <button
            key={m}
            role="tab"
            aria-selected={mode === m}
            onClick={() => {
              setMode(m);
              setMissionFeedback(null);
              setLines(null);
              if (m === "missions") {
                const firstUnsolved = GIT_MISSIONS.findIndex((x) => !solvedIds.includes(x.id));
                selectMission(firstUnsolved >= 0 ? firstUnsolved : 0);
              } else {
                setCode(GIT_PRESETS[0].script);
              }
            }}
            className={cn(
              "relative flex-1 rounded-lg px-4 py-2 text-sm font-medium transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
              mode === m ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
            )}
          >
            {m === "free" ? (
              <span className="inline-flex items-center gap-2">
                <Terminal aria-hidden className="size-3.5" /> Free play
              </span>
            ) : (
              <span className="inline-flex items-center gap-2">
                <Target aria-hidden className="size-3.5" /> Missions
                {solvedCount > 0 && (
                  <span className="rounded-full bg-rose-500/15 px-1.5 text-[10px] font-bold tabular-nums text-rose-700 dark:text-rose-300">
                    {solvedCount}
                  </span>
                )}
              </span>
            )}
          </button>
        ))}
      </div>

      <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,280px)_minmax(0,1fr)]">
        {/* Left: state + cheat sheet / missions sidebar */}
        <div className="space-y-4">
          <StatePanel state={state} />
          {mode === "free" ? <CheatSheet /> : null}
          {mode === "missions" && (
            <div className="rounded-2xl border bg-card p-4">
              <div className="flex items-center justify-between">
                <h2 className="text-sm font-semibold">Guided missions</h2>
                <span className="text-xs tabular-nums text-muted-foreground">
                  {solvedCount}/{GIT_MISSIONS.length} solved
                </span>
              </div>
              <ol className="mt-3 space-y-1.5">
                {GIT_MISSIONS.map((m, i) => {
                  const solved = solvedIds.includes(m.id);
                  const active = i === activeMission;
                  return (
                    <li key={m.id}>
                      <button
                        onClick={() => selectMission(i)}
                        aria-current={active ? "step" : undefined}
                        className={cn(
                          "flex w-full items-center gap-3 rounded-xl border px-3 py-2.5 text-left transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                          active
                            ? "border-rose-500/50 bg-rose-500/10 shadow-sm"
                            : "border-transparent hover:border-border hover:bg-muted/50",
                          solved && !active && "opacity-70"
                        )}
                      >
                        <span
                          aria-hidden
                          className={cn(
                            "flex size-6 shrink-0 items-center justify-center rounded-full border text-[11px] font-bold tabular-nums",
                            solved
                              ? "border-emerald-500/40 bg-emerald-500/15 text-emerald-600 dark:text-emerald-400"
                              : active
                                ? "border-rose-500/50 bg-rose-500/15 text-rose-700 dark:text-rose-300"
                                : "border-border text-muted-foreground"
                          )}
                        >
                          {solved ? <Check aria-hidden className="size-3.5" /> : i + 1}
                        </span>
                        <span className="min-w-0">
                          <span className={cn("block truncate text-sm font-medium", solved && "line-through decoration-muted-foreground/40")}>
                            {m.title}
                          </span>
                        </span>
                      </button>
                    </li>
                  );
                })}
              </ol>
            </div>
          )}
        </div>

        {/* Right: mission card, graph, editor, console */}
        <div className="min-w-0 space-y-4">
          {mode === "missions" && mission && (
            <div className="rounded-2xl border border-rose-500/30 bg-rose-500/[0.05] p-5">
              <div className="flex items-center gap-2">
                <Target aria-hidden className="size-4 text-rose-500" />
                <h2 className="text-sm font-semibold">
                  Mission {activeMission + 1} — {mission.title}
                </h2>
                {solvedIds.includes(mission.id) && (
                  <Badge variant="outline" className="ml-auto gap-1 border-emerald-500/40 bg-emerald-500/10 text-emerald-600 dark:text-emerald-300">
                    <Check aria-hidden className="size-3" /> Solved
                  </Badge>
                )}
              </div>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{mission.brief}</p>
              <div className="mt-3 flex flex-wrap gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="h-8 gap-2 rounded-lg text-xs"
                  onClick={() => setShowHint((h) => !h)}
                >
                  <Lightbulb aria-hidden className={cn("size-3.5", showHint && "text-rose-500")} />
                  {showHint ? "Hide hint" : "Hint"}
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="h-8 gap-2 rounded-lg text-xs"
                  onClick={() => setShowSolution((s) => !s)}
                >
                  <KeyRound aria-hidden className={cn("size-3.5", showSolution && "text-rose-500")} />
                  {showSolution ? "Hide solution" : "Solution"}
                </Button>
                <span className="ml-auto self-center text-[11px] text-muted-foreground">
                  Runs are checked automatically · fresh repo per mission
                </span>
              </div>
              <AnimatePresence>
                {showHint && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    transition={{ duration: 0.25 }}
                    className="overflow-hidden"
                  >
                    <div className="mt-3 flex items-start gap-2.5 rounded-xl border border-rose-500/30 bg-rose-500/[0.08] px-3.5 py-3">
                      <Lightbulb aria-hidden className="mt-0.5 size-3.5 shrink-0 text-rose-500" />
                      <p className="text-xs leading-relaxed text-rose-800 dark:text-rose-200">{mission.hint}</p>
                    </div>
                  </motion.div>
                )}
                {showSolution && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    transition={{ duration: 0.25 }}
                    className="overflow-hidden"
                  >
                    <div className="mt-3 rounded-xl border bg-zinc-950/[0.03] p-3.5 dark:bg-zinc-950/40">
                      <pre className="overflow-x-auto font-mono text-[12px] leading-5">
                        {mission.solution.split("\n").map((line, li) => (
                          <React.Fragment key={li}>
                            {tokenizeLine(line, "bash").map((t, j) => (
                              <span key={j} className={t.cls}>
                                {t.text}
                              </span>
                            ))}
                            {li < mission.solution.split("\n").length - 1 ? "\n" : null}
                          </React.Fragment>
                        ))}
                      </pre>
                      <Button
                        variant="outline"
                        size="sm"
                        className="mt-2.5 h-7 gap-1.5 rounded-lg text-[11px]"
                        onClick={() => setCode(mission.solution)}
                      >
                        <Play aria-hidden className="size-3" />
                        Load into terminal
                      </Button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          )}

          {/* THE LIVE COMMIT GRAPH */}
          <div className="overflow-hidden rounded-2xl border bg-card">
            <div className="flex flex-wrap items-center gap-2 border-b bg-muted/30 px-4 py-2.5">
              <GitBranch aria-hidden className="size-3.5 text-rose-500" />
              <h2 className="text-xs font-semibold uppercase tracking-wider">Live commit graph</h2>
              <span className="hidden text-[11px] text-muted-foreground sm:inline">
                nodes = snapshots · chips = branch pointers · ringed node = merge commit
              </span>
              <button
                onClick={resetRepository}
                className="ml-auto inline-flex items-center gap-1 rounded-md text-[11px] font-medium text-muted-foreground transition-colors hover:text-rose-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring dark:hover:text-rose-400"
                aria-label="Reset repository to a fresh state"
                title="Wipe history, branches and files — start over"
              >
                <Eraser aria-hidden className="size-3" />
                Reset repo
              </button>
              <span className="shrink-0 text-[11px] tabular-nums text-muted-foreground">
                {state.commits.length} commit{state.commits.length === 1 ? "" : "s"} ·{" "}
                {Object.keys(state.branches).length} branch{Object.keys(state.branches).length === 1 ? "" : "es"}
              </span>
            </div>
            <GraphView state={state} />
          </div>

          {/* Editor card */}
          <div className="rounded-2xl border bg-card p-4 sm:p-5">
            <div className="mb-3 flex flex-wrap items-center gap-2">
              <Terminal aria-hidden className="size-4 text-rose-500" />
              <h2 className="text-sm font-semibold">Terminal</h2>
              <span className="hidden items-center gap-1 rounded-full border border-border bg-muted/40 px-2 py-0.5 font-mono text-[10px] text-muted-foreground sm:inline-flex">
                bash · one command per line
              </span>
              <div className="ml-auto flex items-center gap-1.5">
                <Button
                  variant="ghost"
                  size="icon"
                  className="size-8 text-muted-foreground hover:text-foreground"
                  onClick={() => void copyCode()}
                  aria-label="Copy script"
                  title="Copy script"
                >
                  {copied ? <Check aria-hidden className="size-3.5 text-emerald-500" /> : <Copy aria-hidden className="size-3.5" />}
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="size-8 text-muted-foreground hover:text-foreground"
                  onClick={() => {
                    setCode("");
                    setLines(null);
                    setMissionFeedback(null);
                  }}
                  aria-label="Clear terminal"
                  title="Clear terminal"
                >
                  <Eraser aria-hidden className="size-3.5" />
                </Button>
                <Button
                  size="sm"
                  disabled={code.trim().length === 0}
                  className="h-8 gap-2 rounded-lg bg-rose-600 text-white shadow-sm transition-all hover:bg-rose-500 hover:shadow-md active:scale-[0.98] disabled:opacity-50"
                  onClick={runCommands}
                >
                  <Play aria-hidden className="size-3.5" />
                  Run
                  <kbd className="ml-1 hidden rounded border border-foreground/20 bg-foreground/5 px-1.5 py-0.5 font-mono text-[9px] font-medium sm:inline-block">
                    ⌘↵
                  </kbd>
                </Button>
              </div>
            </div>
            <GitEditor value={code} onChange={setCode} onRun={runCommands} />
            {mode === "free" && (
              <div className="mt-3 flex flex-wrap gap-1.5">
                {GIT_PRESETS.map((p) => (
                  <button
                    key={p.name}
                    onClick={() => setCode(p.script)}
                    title={p.blurb}
                    className="inline-flex items-center gap-1.5 rounded-full border bg-muted/40 px-3 py-1.5 text-[11px] font-medium text-muted-foreground transition-all hover:border-rose-500/40 hover:bg-rose-500/10 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    <Sparkles aria-hidden className="size-3 text-rose-500/70" />
                    {p.name}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Console */}
          {lines ? <ConsolePanel lines={lines} /> : null}

          {/* Mission feedback */}
          <AnimatePresence>
            {mode === "missions" && missionFeedback && (
              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 8 }}
                transition={{ duration: 0.25 }}
                role="status"
                className="flex items-start gap-2.5 rounded-xl border border-amber-500/30 bg-amber-500/[0.06] px-4 py-3"
              >
                <AlertTriangle aria-hidden className="mt-0.5 size-4 shrink-0 text-amber-500" />
                <p className="text-sm leading-relaxed text-amber-800 dark:text-amber-200">{missionFeedback}</p>
              </motion.div>
            )}
          </AnimatePresence>

          {/* History */}
          {history.length > 0 && (
            <div className="rounded-2xl border bg-card p-4">
              <div className="flex items-center gap-2">
                <History aria-hidden className="size-4 text-muted-foreground" />
                <h2 className="text-sm font-semibold">Recent scripts</h2>
                <button
                  className="ml-auto rounded text-[11px] font-medium text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  onClick={() => setHistory([])}
                >
                  Clear
                </button>
              </div>
              <ul className="mt-3 space-y-1">
                {history.map((h) => (
                  <li key={h.id}>
                    <button
                      onClick={() => setCode(h.script)}
                      title={h.script}
                      className={cn(
                        "flex w-full items-center gap-2.5 rounded-lg border border-transparent px-2.5 py-1.5 text-left font-mono text-[11px] transition-colors hover:border-border hover:bg-muted/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                        h.ok ? "text-muted-foreground" : "text-rose-600 dark:text-rose-400"
                      )}
                    >
                      {h.ok ? (
                        <Check aria-hidden className="size-3 shrink-0 text-emerald-500" />
                      ) : (
                        <AlertTriangle aria-hidden className="size-3 shrink-0 text-rose-500" />
                      )}
                      <span className="truncate">{h.script.replace(/\s+/g, " ").trim()}</span>
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
