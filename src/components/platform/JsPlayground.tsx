"use client";

// JavaScript Playground — the fourth playable simulator.
// A Web Worker (src/lib/js-playground.ts) runs one synchronous ES2020
// snippet at a time in strict mode: console output is captured (including
// logs from timers fired right after the run), the last expression's value
// is echoed like a REPL, and a 4-second watchdog replaces runaway workers.
// Guided missions + free play, deep-linkable from course practice blocks
// (/?view=simulator&sim=js-playground&q=<code>).

import * as React from "react";
import Image from "next/image";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import {
  AlertTriangle,
  ArrowLeft,
  BookOpen,
  Braces,
  Check,
  ChevronRight,
  Copy,
  Eraser,
  History,
  KeyRound,
  Lightbulb,
  Play,
  Sparkles,
  SquareChevronRight,
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
  JS_MISSIONS,
  JS_PRESETS,
  WORKER_SOURCE,
  type ConsoleEntry,
  type JsErrorInfo,
} from "@/lib/js-playground";
import { tokenizeLine } from "./lesson/LessonBlocks";
import { trackEvent } from "./platform-data";
import type { CategoryView, ResourceItemView } from "@/lib/platform";

interface JsPlaygroundProps {
  item: ResourceItemView;
  category: CategoryView;
}

type Mode = "free" | "missions";

const EDITOR_FONT = "font-mono text-[13px] leading-6 tracking-tight";

interface HistoryEntry {
  id: number;
  code: string;
  ok: boolean;
  at: number;
}

interface RunState {
  id: number;
  logs: ConsoleEntry[];
  error: JsErrorInfo | null;
  result: string | null;
  ms: number;
  timeout: boolean;
  /** True when this run was superseded by a newer one (never rendered). */
  aborted: boolean;
}

// Friendly hints for the errors learners hit most in a worker sandbox.
function errorHint(message: string): string | null {
  const m = message.toLowerCase();
  if (/document|window|alert|localstorage|dom/.test(m) && /is not defined/.test(m)) {
    return "The playground runs in a Web Worker — there is no DOM here. Keep snippets computational: values, arrays, objects, functions, JSON.";
  }
  if (m.includes("import") || m.includes("export")) {
    return "import/export aren’t available — each run is one synchronous snippet. Declare everything in place.";
  }
  if (m.includes("await")) {
    return "Top-level await isn’t supported. Use plain synchronous code, or consume promises with .then() inside a function.";
  }
  if (/unexpected (token|identifier)|expected/.test(m)) {
    return "A syntax slip — check quotes, brackets and commas near the reported position.";
  }
  return null;
}

// ---------------------------------------------------------------------------
// Worker plumbing — one worker at a time, replaced after a watchdog kill.

function spawnWorker(): { worker: Worker; url: string } {
  const blob = new Blob([WORKER_SOURCE], { type: "text/javascript" });
  const url = URL.createObjectURL(blob);
  const worker = new Worker(url);
  return { worker, url };
}

/** Stable, mutable runner state — the worker inside can be swapped after a watchdog kill. */
interface Runner {
  worker: Worker;
  url: string;
  pending: { id: number; resolve: (r: RunState) => void; timer: number } | null;
  nextId: number;
  onDelta: ((id: number, logs: ConsoleEntry[]) => void) | null;
}

function useJsRunner() {
  const stateRef = React.useRef<Runner | null>(null);

  const attach = React.useCallback((worker: Worker, runner: Runner) => {
    worker.onmessage = (e: MessageEvent) => {
      const msg = e.data as
        | { type: "run"; id: number; logs: ConsoleEntry[]; error: JsErrorInfo | null; result: string | null; ms: number }
        | { type: "delta"; id: number; logs: ConsoleEntry[] };
      if (msg.type === "run" && runner.pending && msg.id === runner.pending.id) {
        window.clearTimeout(runner.pending.timer);
        const resolve = runner.pending.resolve;
        runner.pending = null;
        resolve({ id: msg.id, logs: msg.logs, error: msg.error, result: msg.result, ms: msg.ms, timeout: false, aborted: false });
      } else if (msg.type === "delta" && runner.onDelta) {
        runner.onDelta(msg.id, msg.logs);
      }
    };
  }, []);

  const resetWorker = React.useCallback(
    (runner: Runner) => {
      runner.worker.terminate();
      URL.revokeObjectURL(runner.url);
      const { worker, url } = spawnWorker();
      attach(worker, runner);
      runner.worker = worker;
      runner.url = url;
    },
    [attach]
  );

  const ensure = React.useCallback((): Runner => {
    if (stateRef.current) return stateRef.current;
    const runner: Runner = {
      worker: undefined as unknown as Worker,
      url: "",
      pending: null,
      nextId: 0,
      onDelta: null,
    };
    const { worker, url } = spawnWorker();
    attach(worker, runner);
    runner.worker = worker;
    runner.url = url;
    stateRef.current = runner;
    return runner;
  }, [attach]);

  React.useEffect(() => {
    return () => {
      const r = stateRef.current;
      if (r) {
        if (r.pending) window.clearTimeout(r.pending.timer);
        r.worker.terminate();
        URL.revokeObjectURL(r.url);
        stateRef.current = null;
      }
    };
  }, []);

  const setDeltaHandler = React.useCallback(
    (fn: (id: number, logs: ConsoleEntry[]) => void) => {
      const r = ensure();
      r.onDelta = fn;
    },
    [ensure]
  );

  const run = React.useCallback(
    (code: string): Promise<RunState> => {
      const r = ensure();
      // A previous run still in flight — abort it (its worker may be wedged).
      if (r.pending) {
        window.clearTimeout(r.pending.timer);
        const { id: staleId, resolve: staleResolve } = r.pending;
        r.pending = null;
        resetWorker(r);
        staleResolve({ id: staleId, logs: [], error: null, result: null, ms: 0, timeout: false, aborted: true });
      }
      return new Promise<RunState>((resolve) => {
        const id = ++r.nextId;
        const timer = window.setTimeout(() => {
          // Watchdog: terminate the wedged worker, respawn on the same runner, report.
          if (r.pending && r.pending.id === id) {
            const resolveTimeout = r.pending.resolve;
            r.pending = null;
            resetWorker(r);
            resolveTimeout({
              id,
              logs: [],
              error: { name: "TimeoutError", message: "Execution exceeded the 4-second watchdog" },
              result: null,
              ms: 4000,
              timeout: true,
              aborted: false,
            });
          }
        }, 4000);
        r.pending = { id, resolve, timer };
        r.worker.postMessage({ type: "run", id, code });
      });
    },
    [ensure, resetWorker]
  );

  return { run, setDeltaHandler };
}

// ---------------------------------------------------------------------------
// The editor — line-number gutter + highlighted overlay + transparent input.

function JsEditor({
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
    if (gutterInnerRef.current) {
      gutterInnerRef.current.style.transform = `translateY(${-ta.scrollTop}px)`;
    }
    if (preInnerRef.current) {
      preInnerRef.current.style.transform = `translateY(${-ta.scrollTop}px)`;
    }
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
        "relative flex overflow-hidden rounded-xl border bg-zinc-950/[0.03] focus-within:border-amber-500/60 focus-within:ring-2 focus-within:ring-amber-500/20 dark:bg-zinc-950/40",
        EDITOR_FONT
      )}
    >
      {/* line-number gutter */}
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
        {/* highlighted layer */}
        <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden py-4 pl-4">
          <div ref={preInnerRef} className="whitespace-pre-wrap break-words">
            {value.split("\n").map((line, li) => (
              <React.Fragment key={li}>
                {tokenizeLine(line, "js").map((t, j) => (
                  <span key={j} className={t.cls}>
                    {t.text}
                  </span>
                ))}
                {li < value.split("\n").length - 1 ? "\n" : null}
              </React.Fragment>
            ))}
            {"\n "}
          </div>
        </div>
        {/* input layer */}
        <textarea
          ref={taRef}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onScroll={syncScroll}
          onKeyDown={onKeyDown}
          spellCheck={false}
          autoCapitalize="off"
          autoComplete="off"
          autoCorrect="off"
          aria-label="JavaScript code editor"
          className={cn(
            "relative block h-56 w-full resize-none overflow-auto bg-transparent p-4 text-transparent caret-amber-500 selection:bg-amber-500/25 focus-visible:outline-none [scrollbar-width:none] [&::-webkit-scrollbar]:hidden",
            EDITOR_FONT
          )}
          placeholder="console.log('hello devpath');"
        />
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Console output — terminal styling with level-aware rows + result echo.

const LEVEL_STYLES: Record<ConsoleEntry["level"], { label: string; tag: string; text: string }> = {
  log: { label: "log", tag: "text-zinc-500 dark:text-zinc-500", text: "text-zinc-100" },
  info: { label: "info", tag: "text-teal-400", text: "text-zinc-100" },
  warn: { label: "warn", tag: "text-amber-400", text: "text-amber-100" },
  error: { label: "error", tag: "text-rose-400", text: "text-rose-100" },
  debug: { label: "debug", tag: "text-zinc-500", text: "text-zinc-300" },
};

function ConsolePanel({ run }: { run: RunState }) {
  return (
    <div className="overflow-hidden rounded-2xl border bg-zinc-950 dark:bg-black/70">
      <div className="flex items-center gap-2 border-b border-zinc-800 px-4 py-2.5">
        <Terminal aria-hidden className="size-3.5 text-zinc-400" />
        <span className="text-xs font-semibold text-zinc-300">Console</span>
        <span className="ml-auto flex items-center gap-2">
          <span className="rounded-full bg-zinc-800/80 px-2 py-0.5 font-mono text-[10px] font-medium tabular-nums text-zinc-400">
            {run.logs.length} {run.logs.length === 1 ? "line" : "lines"}
          </span>
          <span className="rounded-full bg-zinc-800/80 px-2 py-0.5 font-mono text-[10px] font-medium tabular-nums text-zinc-400">
            {run.ms} ms
          </span>
        </span>
      </div>
      <div className="max-h-72 overflow-y-auto px-4 py-3">
        {run.logs.length === 0 && !run.result && !run.error ? (
          <p className="font-mono text-[12px] text-zinc-600">{"// output appears here when you run your code"}</p>
        ) : (
          <>
            {run.logs.map((l, i) => {
              const s = LEVEL_STYLES[l.level];
              return (
                <div key={i} className="flex gap-2.5 py-0.5">
                  <span className={cn("shrink-0 select-none font-mono text-[10px] font-bold uppercase leading-6", s.tag)}>
                    {s.label}
                  </span>
                  <pre className="min-w-0 flex-1 whitespace-pre-wrap break-words font-mono text-[12.5px] leading-6">
                    {run.timeout ? <span className="text-zinc-500">{l.text}</span> : <span className={s.text}>{l.text}</span>}
                  </pre>
                </div>
              );
            })}
            {run.result !== null && (
              <div className="mt-1.5 flex items-start gap-2.5 border-t border-zinc-800 pt-2.5">
                <SquareChevronRight aria-hidden className="mt-1 size-3.5 shrink-0 text-emerald-400" />
                <span className="shrink-0 select-none font-mono text-[10px] font-bold uppercase leading-6 text-emerald-500">
                  result
                </span>
                <pre className="min-w-0 flex-1 whitespace-pre-wrap break-words font-mono text-[12.5px] leading-6 text-emerald-300">
                  {run.result}
                </pre>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

function ErrorPanel({ error, timeout }: { error: JsErrorInfo; timeout: boolean }) {
  const hint = timeout
    ? "An infinite loop is the usual cause. The wedged worker was replaced — check your loop conditions and run again."
    : errorHint(error.message);
  return (
    <div className="overflow-hidden rounded-2xl border border-rose-500/30 bg-rose-500/[0.04]">
      <div className="flex items-start gap-3 px-4 py-3.5">
        <AlertTriangle aria-hidden className="mt-0.5 size-4 shrink-0 text-rose-500" />
        <div className="min-w-0 space-y-1">
          <p className="text-sm font-semibold text-rose-700 dark:text-rose-300">
            {error.name}: {error.message}
          </p>
          {timeout ? null : (
            <p className="font-mono text-[11px] text-rose-500/80">
              your snippet threw — caught live from the worker
            </p>
          )}
        </div>
      </div>
      {hint ? (
        <div className="flex items-start gap-2.5 border-t border-rose-500/20 bg-amber-500/[0.05] px-4 py-3">
          <Lightbulb aria-hidden className="mt-0.5 size-3.5 shrink-0 text-amber-500" />
          <p className="text-xs leading-relaxed text-amber-700 dark:text-amber-300">{hint}</p>
        </div>
      ) : null}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Sidebar — environment cheat sheet (free mode).

function CheatSheet() {
  const rows: { label: string; value: string }[] = [
    { label: "console.log / warn / error / info", value: "capture into the output panel" },
    { label: "Math, JSON, Array, Object, Map, Set", value: "all standard built-ins" },
    { label: "setTimeout", value: "works — logs land as async deltas" },
    { label: "structuredClone", value: "deep copies without surprises" },
    { label: "import / export", value: "✗ single synchronous snippet" },
    { label: "top-level await", value: "✗ keep it synchronous" },
    { label: "DOM, fetch, window", value: "✗ Web Worker — no DOM" },
  ];
  return (
    <div className="rounded-2xl border bg-card">
      <div className="flex items-center gap-2.5 border-b px-4 py-3">
        <BookOpen aria-hidden className="size-4 text-amber-500" />
        <h2 className="text-sm font-semibold">Environment</h2>
        <Badge variant="outline" className="ml-auto font-mono text-[10px] font-normal text-muted-foreground">
          ES2020 · strict
        </Badge>
      </div>
      <ul className="space-y-2.5 p-4">
        {rows.map((r) => {
          const denied = r.value.startsWith("✗");
          return (
            <li key={r.label} className="flex items-start gap-2.5">
              <span
                aria-hidden
                className={cn(
                  "mt-1 size-1.5 shrink-0 rounded-full",
                  denied ? "bg-rose-500/70" : "bg-emerald-500/70"
                )}
              />
              <div className="min-w-0">
                <code className="font-mono text-[11.5px] font-semibold text-foreground">{r.label}</code>
                <p className="mt-0.5 text-[11px] leading-normal text-muted-foreground">{r.value.slice(denied ? 1 : 0).trim()}</p>
              </div>
            </li>
          );
        })}
      </ul>
      <div className="border-t bg-muted/30 px-4 py-3">
        <p className="flex items-center gap-2 text-[11px] leading-snug text-muted-foreground">
          <Zap aria-hidden className="size-3.5 shrink-0 text-amber-500" />
          The value of the last expression is echoed in the result row — write snippets REPL-style.
        </p>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// JsPlayground

let historyId = 0;

export function JsPlayground({ item, category }: JsPlaygroundProps) {
  const { toast } = useToast();
  const hydrated = useLibraryHydrated();
  const searchParams = useSearchParams();
  const { run: runInWorker, setDeltaHandler } = useJsRunner();
  // Select the stable record reference; derive the array outside the selector.
  const simProgressMap = useLibrary((s) => s.simProgress);
  const completeChallenge = useLibrary((s) => s.completeChallenge);
  const pushRecent = useLibrary((s) => s.pushRecent);

  const [mode, setMode] = React.useState<Mode>("free");
  const [code, setCode] = React.useState(JS_PRESETS[0].code);
  const [running, setRunning] = React.useState(false);
  const [run, setRun] = React.useState<RunState | null>(null);
  const [history, setHistory] = React.useState<HistoryEntry[]>([]);
  const [activeMission, setActiveMission] = React.useState(0);
  const [showHint, setShowHint] = React.useState(false);
  const [showSolution, setShowSolution] = React.useState(false);
  const [missionFeedback, setMissionFeedback] = React.useState<string | null>(null);
  const [copied, setCopied] = React.useState(false);

  const runRef = React.useRef<RunState | null>(null);
  React.useEffect(() => {
    runRef.current = run;
  }, [run]);

  const solvedIds = hydrated ? simProgressMap[item.slug] ?? [] : [];
  const solvedCount = solvedIds.length;
  const mission = JS_MISSIONS[activeMission] ?? null;

  // Track the view once on mount + keep the sandbox in the recents strip
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

  // Async console deltas from timers land in the displayed run.
  React.useEffect(() => {
    setDeltaHandler((id, logs) => {
      const current = runRef.current;
      if (!current || current.id !== id) return;
      setRun({ ...current, logs: [...current.logs, ...logs] });
    });
  }, [setDeltaHandler]);

  // Deep-link support: /?view=simulator&sim=js-playground&q=<code> pre-fills
  // the editor — practice cards in the JavaScript course link here with the
  // lesson snippet. Applied once per mount so later edits are never overwritten.
  const appliedDeepLink = React.useRef(false);
  React.useEffect(() => {
    if (appliedDeepLink.current) return;
    const q = searchParams.get("q");
    if (q && q.trim().length > 0) {
      appliedDeepLink.current = true;
      setCode(q);
      trackEvent("sandbox_deep_link", item.slug, "lesson-practice");
      toast({
        title: "Snippet loaded from lesson",
        description: "It's in the editor — press ⌘/Ctrl+Enter (or Run) to execute it.",
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

  const runCode = React.useCallback(async () => {
    const source = code.trim();
    if (!source) return;
    setRunning(true);
    const result = await runInWorker(source);
    setRunning(false);
    if (result.aborted) return; // superseded by a newer run — keep the newer state
    setRun(result);
    setHistory((prev) => [{ id: ++historyId, code: source, ok: !result.error, at: Date.now() }, ...prev].slice(0, 10));

    if (mode === "missions" && mission && !result.error) {
      if (solvedIds.includes(mission.id)) {
        setMissionFeedback(null);
        return;
      }
      const verdict = mission.check({
        logs: result.logs,
        error: result.error,
        resultText: result.result,
        ms: result.ms,
      });
      if (verdict.ok) {
        setMissionFeedback(null);
        setShowHint(false);
        setShowSolution(false);
        completeChallenge(item.slug, mission.id);
        trackEvent("challenge_complete", item.slug, mission.id);
        const isLast = solvedCount + 1 >= JS_MISSIONS.length;
        toast({
          title: isLast ? "All missions cleared" : `Mission solved: ${mission.title}`,
          description: isLast
            ? "Values, references, pipelines, closures and guarded parsing — the whole JS toolkit, proven."
            : "Locked in. On to the next one.",
        });
        if (activeMission < JS_MISSIONS.length - 1) {
          window.setTimeout(() => setActiveMission(activeMission + 1), 900);
        }
      } else {
        setMissionFeedback(verdict.hint ?? "Not quite yet — check the mission briefing and the console output.");
      }
    }
  }, [code, mode, mission, runInWorker, solvedIds, solvedCount, completeChallenge, item.slug, activeMission, toast]);

  const selectMission = (i: number) => {
    setActiveMission(i);
    setShowHint(false);
    setShowSolution(false);
    setMissionFeedback(null);
    setRun(null);
    const m = JS_MISSIONS[i];
    if (m) setCode(m.starter);
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
        className="relative overflow-hidden rounded-2xl border bg-gradient-to-br from-amber-500/15 via-transparent to-transparent p-6 sm:p-8"
      >
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 opacity-60 [background-image:radial-gradient(circle,var(--border)_1px,transparent_1px)] [background-size:18px_18px] [mask-image:radial-gradient(ellipse_80%_100%_at_60%_0%,black,transparent)]"
        />
        <div className="relative flex flex-col gap-5 sm:flex-row sm:items-center">
          <div className="relative size-16 shrink-0 overflow-hidden rounded-2xl ring-1 ring-amber-500/25">
            <Image src={category.icon} alt={`${category.title} category icon`} fill sizes="64px" className="object-cover" />
          </div>
          <div className="min-w-0 flex-1 space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">{item.title}</h1>
              <Badge variant="outline" className="gap-1.5 border-amber-500/40 bg-amber-500/15 font-medium text-amber-700 dark:text-amber-300">
                <Play aria-hidden className="size-3" />
                Interactive
              </Badge>
              {item.level && <Badge variant="outline" className="font-normal">{item.level}</Badge>}
            </div>
            <p className="max-w-2xl text-sm leading-relaxed text-muted-foreground">{item.description}</p>
          </div>
          {hydrated && (
            <div className="flex shrink-0 items-center gap-2 rounded-xl border bg-card/60 px-4 py-2.5 backdrop-blur">
              <Trophy aria-hidden className={cn("size-4", solvedCount === JS_MISSIONS.length ? "fill-amber-500 text-amber-500" : "text-muted-foreground")} />
              <div className="text-xs">
                <span className="block font-semibold tabular-nums">
                  {solvedCount}/{JS_MISSIONS.length} missions
                </span>
                <span className="text-muted-foreground">{solvedCount === JS_MISSIONS.length ? "All clear!" : "keep going"}</span>
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
              setRun(null);
              if (m === "missions") {
                const firstUnsolved = JS_MISSIONS.findIndex((x) => !solvedIds.includes(x.id));
                selectMission(firstUnsolved >= 0 ? firstUnsolved : 0);
              } else {
                setCode(JS_PRESETS[0].code);
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
                  <span className="rounded-full bg-amber-500/15 px-1.5 text-[10px] font-bold tabular-nums text-amber-700 dark:text-amber-400">
                    {solvedCount}
                  </span>
                )}
              </span>
            )}
          </button>
        ))}
      </div>

      <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,280px)_minmax(0,1fr)]">
        {/* Left: cheat sheet / missions sidebar */}
        <div className="space-y-4">
          {mode === "free" ? <CheatSheet /> : null}
          {mode === "missions" && (
            <div className="rounded-2xl border bg-card p-4">
              <div className="flex items-center justify-between">
                <h2 className="text-sm font-semibold">Guided missions</h2>
                <span className="text-xs tabular-nums text-muted-foreground">
                  {solvedCount}/{JS_MISSIONS.length} solved
                </span>
              </div>
              <ol className="mt-3 space-y-1.5">
                {JS_MISSIONS.map((m, i) => {
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
                            ? "border-amber-500/50 bg-amber-500/10 shadow-sm"
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
                                ? "border-amber-500/50 bg-amber-500/15 text-amber-700 dark:text-amber-300"
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

        {/* Right: editor + console */}
        <div className="min-w-0 space-y-4">
          {mode === "missions" && mission && (
            <div className="rounded-2xl border border-amber-500/30 bg-amber-500/[0.05] p-5">
              <div className="flex items-center gap-2">
                <Target aria-hidden className="size-4 text-amber-500" />
                <h2 className="text-sm font-semibold">
                  Mission {activeMission + 1} — {mission.title}
                </h2>
                {solvedIds.includes(mission.id) && (
                  <Badge variant="outline" className="ml-auto gap-1 border-emerald-500/40 bg-emerald-500/10 text-emerald-600 dark:text-emerald-300">
                    <Check aria-hidden className="size-3" /> Solved
                  </Badge>
                )}
              </div>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{mission.briefing}</p>
              <div className="mt-3 flex flex-wrap gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="h-8 gap-2 rounded-lg text-xs"
                  onClick={() => setShowHint((h) => !h)}
                >
                  <Lightbulb aria-hidden className={cn("size-3.5", showHint && "text-amber-500")} />
                  {showHint ? "Hide hint" : "Hint"}
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="h-8 gap-2 rounded-lg text-xs"
                  onClick={() => setShowSolution((s) => !s)}
                >
                  <KeyRound aria-hidden className={cn("size-3.5", showSolution && "text-amber-500")} />
                  {showSolution ? "Hide solution" : "Solution"}
                </Button>
                <span className="ml-auto self-center text-[11px] text-muted-foreground">
                  Runs are checked automatically
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
                    <div className="mt-3 flex items-start gap-2.5 rounded-xl border border-amber-500/30 bg-amber-500/[0.08] px-3.5 py-3">
                      <Lightbulb aria-hidden className="mt-0.5 size-3.5 shrink-0 text-amber-500" />
                      <p className="text-xs leading-relaxed text-amber-800 dark:text-amber-200">{mission.hint}</p>
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
                            {tokenizeLine(line, "js").map((t, j) => (
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
                        Load into editor
                      </Button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          )}

          {/* Editor card */}
          <div className="rounded-2xl border bg-card p-4 sm:p-5">
            <div className="mb-3 flex flex-wrap items-center gap-2">
              <Braces aria-hidden className="size-4 text-amber-500" />
              <h2 className="text-sm font-semibold">Snippet</h2>
              <span className="hidden items-center gap-1 rounded-full border border-border bg-muted/40 px-2 py-0.5 font-mono text-[10px] text-muted-foreground sm:inline-flex">
                JavaScript · ES2020 · strict
              </span>
              <div className="ml-auto flex items-center gap-1.5">
                <Button
                  variant="ghost"
                  size="icon"
                  className="size-8 text-muted-foreground hover:text-foreground"
                  onClick={() => void copyCode()}
                  aria-label="Copy snippet"
                  title="Copy snippet"
                >
                  {copied ? <Check aria-hidden className="size-3.5 text-emerald-500" /> : <Copy aria-hidden className="size-3.5" />}
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="size-8 text-muted-foreground hover:text-foreground"
                  onClick={() => {
                    setCode("");
                    setRun(null);
                    setMissionFeedback(null);
                  }}
                  aria-label="Clear editor"
                  title="Clear editor"
                >
                  <Eraser aria-hidden className="size-3.5" />
                </Button>
                <Button
                  size="sm"
                  disabled={running || code.trim().length === 0}
                  className="h-8 gap-2 rounded-lg bg-amber-600 text-white shadow-sm transition-all hover:bg-amber-500 hover:shadow-md active:scale-[0.98] disabled:opacity-50"
                  onClick={() => void runCode()}
                >
                  {running ? (
                    <>
                      <span aria-hidden className="size-3.5 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                      Running
                    </>
                  ) : (
                    <>
                      <Play aria-hidden className="size-3.5" />
                      Run
                      <kbd className="ml-1 hidden rounded border border-foreground/20 bg-foreground/5 px-1.5 py-0.5 font-mono text-[9px] font-medium sm:inline-block">
                        ⌘↵
                      </kbd>
                    </>
                  )}
                </Button>
              </div>
            </div>
            <JsEditor value={code} onChange={setCode} onRun={() => void runCode()} />
            {mode === "free" && (
              <div className="mt-3 flex flex-wrap gap-1.5">
                {JS_PRESETS.map((p) => (
                  <button
                    key={p.label}
                    onClick={() => setCode(p.code)}
                    title={p.code.split("\n").join(" ")}
                    className="inline-flex items-center gap-1.5 rounded-full border bg-muted/40 px-3 py-1.5 text-[11px] font-medium text-muted-foreground transition-all hover:border-amber-500/40 hover:bg-amber-500/10 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    <Sparkles aria-hidden className="size-3 text-amber-500/70" />
                    {p.label}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Console / error */}
          {run && run.error ? <ErrorPanel error={run.error} timeout={run.timeout} /> : null}
          {run && !run.error ? <ConsolePanel run={run} /> : null}

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
                <h2 className="text-sm font-semibold">Recent snippets</h2>
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
                      onClick={() => setCode(h.code)}
                      title={h.code}
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
                      <span className="truncate">{h.code.replace(/\s+/g, " ").trim()}</span>
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
