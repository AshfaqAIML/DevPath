"use client";

// SQL Query Sandbox — the third playable simulator.
// A dependency-free SQL SELECT engine (src/lib/sql-engine.ts) runs queries
// against a DevPath-themed teaching database entirely in the browser:
// schema browser, syntax-highlighted editor, guided missions and a query
// history — no server round-trips, no WASM download.

import * as React from "react";
import Image from "next/image";
import Link from "next/link";
import { AnimatePresence, motion } from "framer-motion";
import {
  AlertTriangle,
  ArrowLeft,
  Check,
  ChevronRight,
  Columns3,
  Copy,
  Database,
  Eraser,
  Hash,
  History,
  KeyRound,
  Lightbulb,
  Play,
  Sparkles,
  Table2,
  Target,
  Terminal,
  Trophy,
  Type,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { useLibrary, useLibraryHydrated } from "@/lib/library-store";
import { SqlError, executeSql, type SqlResultSet, type SqlValue } from "@/lib/sql-engine";
import { DEMO_DATABASE, SQL_MISSIONS, SQL_PRESETS } from "@/lib/sql-dataset";
import { trackEvent } from "./platform-data";
import type { CategoryView, ResourceItemView } from "@/lib/platform";

interface SqlLabProps {
  item: ResourceItemView;
  category: CategoryView;
}

type Mode = "free" | "missions";

interface HistoryEntry {
  id: number;
  sql: string;
  ok: boolean;
  at: number;
}

// --------------------------------------------------------------- highlighting

const HL_KEYWORDS = new Set([
  "SELECT", "DISTINCT", "AS", "FROM", "WHERE", "AND", "OR", "NOT", "NULL",
  "IS", "LIKE", "IN", "BETWEEN", "JOIN", "INNER", "LEFT", "OUTER", "ON",
  "GROUP", "BY", "HAVING", "ORDER", "ASC", "DESC", "LIMIT", "OFFSET",
  "TRUE", "FALSE", "COUNT", "SUM", "AVG", "MIN", "MAX",
]);

function highlightSql(sql: string): React.ReactNode[] {
  const out: React.ReactNode[] = [];
  const re =
    /('(?:[^']|'')*')|(--[^\n]*)|(\b\d+(?:\.\d+)?\b)|([A-Za-z_][A-Za-z0-9_]*)|([=<>!+\-*/(),.;])/g;
  let last = 0;
  let key = 0;
  let m: RegExpExecArray | null;
  while ((m = re.exec(sql)) !== null) {
    if (m.index > last) out.push(sql.slice(last, m.index));
    const [full, str, comment, num, ident, op] = m;
    if (str) {
      out.push(
        <span key={key++} className="text-emerald-600 dark:text-emerald-400">
          {str}
        </span>
      );
    } else if (comment) {
      out.push(
        <span key={key++} className="italic text-muted-foreground/70">
          {comment}
        </span>
      );
    } else if (num) {
      out.push(
        <span key={key++} className="text-amber-600 dark:text-amber-400">
          {num}
        </span>
      );
    } else if (ident && HL_KEYWORDS.has(ident.toUpperCase())) {
      out.push(
        <span key={key++} className="font-semibold text-teal-600 dark:text-teal-400">
          {ident}
        </span>
      );
    } else if (ident) {
      out.push(
        <span key={key++} className="text-foreground">
          {ident}
        </span>
      );
    } else if (op) {
      out.push(
        <span key={key++} className="text-muted-foreground">
          {op}
        </span>
      );
    }
    last = m.index + full.length;
  }
  if (last < sql.length) out.push(sql.slice(last));
  return out;
}

// ---------------------------------------------------------------- SQL editor

const EDITOR_FONT = "font-mono text-[13px] leading-6";

function SqlEditor({
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
        "relative flex overflow-hidden rounded-xl border bg-zinc-950/[0.03] focus-within:border-teal-500/60 focus-within:ring-2 focus-within:ring-teal-500/20 dark:bg-zinc-950/40",
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
            {highlightSql(value)}
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
          aria-label="SQL query editor"
          className={cn(
            "relative block h-48 w-full resize-none overflow-auto bg-transparent p-4 text-transparent caret-teal-500 selection:bg-teal-500/25 focus-visible:outline-none [scrollbar-width:none] [&::-webkit-scrollbar]:hidden",
            EDITOR_FONT
          )}
          placeholder="SELECT * FROM developers;"
        />
      </div>
    </div>
  );
}

// ----------------------------------------------------------- schema browser

const TYPE_STYLES: Record<string, string> = {
  INTEGER: "border-amber-500/20 bg-amber-500/[0.06] text-amber-700 dark:text-amber-300",
  TEXT: "border-rose-500/20 bg-rose-500/[0.06] text-rose-700/90 dark:text-rose-300",
  REAL: "border-teal-500/20 bg-teal-500/[0.06] text-teal-700 dark:text-teal-300",
};

function SchemaBrowser({ onPick }: { onPick: (sql: string) => void }) {
  const [openTable, setOpenTable] = React.useState<string | null>(DEMO_DATABASE.tables[0]?.name ?? null);

  return (
    <div className="rounded-2xl border bg-card">
      <div className="flex items-center gap-2.5 border-b px-4 py-3">
        <Database aria-hidden className="size-4 text-teal-500" />
        <h2 className="text-sm font-semibold">Schema</h2>
        <Badge variant="outline" className="ml-auto font-mono text-[10px] font-normal text-muted-foreground">
          devpath_demo
        </Badge>
      </div>
      <div className="space-y-1.5 p-2">
        {DEMO_DATABASE.tables.map((t) => {
          const open = openTable === t.name;
          return (
            <div key={t.name} className="rounded-xl">
              <button
                onClick={() => setOpenTable(open ? null : t.name)}
                aria-expanded={open}
                className="flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left transition-colors hover:bg-muted/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <Table2 aria-hidden className="size-4 shrink-0 text-muted-foreground" />
                <span className="font-mono text-[13px] font-bold tracking-tight">{t.name}</span>
                <span className="ml-auto rounded-full bg-muted px-1.5 py-0.5 text-[10px] font-semibold tabular-nums text-muted-foreground">
                  {t.rows.length} rows
                </span>
                <ChevronRight
                  aria-hidden
                  className={cn("size-3.5 shrink-0 text-muted-foreground transition-transform", open && "rotate-90")}
                />
              </button>
              {open && (
                <ul className="mt-1 space-y-px px-2 pb-1.5">
                  {t.columns.map((c) => (
                    <li key={c.name}>
                      <button
                        onClick={() => onPick(`SELECT ${c.name}\nFROM ${t.name};`)}
                        title={`SELECT ${c.name} FROM ${t.name};`}
                        className="flex w-full items-center gap-2 rounded-md px-2.5 py-1.5 text-left transition-colors hover:bg-muted/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                      >
                        {c.type === "INTEGER" ? (
                          <Hash aria-hidden className="size-3 shrink-0 text-muted-foreground/70" />
                        ) : c.type === "REAL" ? (
                          <Sparkles aria-hidden className="size-3 shrink-0 text-muted-foreground/70" />
                        ) : (
                          <Type aria-hidden className="size-3 shrink-0 text-muted-foreground/70" />
                        )}
                        <span className="font-mono text-xs">{c.name}</span>
                        <span
                          className={cn(
                            "ml-auto rounded border px-1.5 py-px font-mono text-[9px] font-medium tracking-wide",
                            TYPE_STYLES[c.type]
                          )}
                        >
                          {c.type}
                        </span>
                      </button>
                    </li>
                  ))}
                  <li className="pt-1">
                    <button
                      onClick={() => onPick(`SELECT * FROM ${t.name};`)}
                      className="w-full rounded-md border border-dashed px-2.5 py-1.5 text-left font-mono text-[11px] text-muted-foreground transition-colors hover:border-teal-500/40 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    >
                      SELECT * FROM {t.name};
                    </button>
                  </li>
                </ul>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ------------------------------------------------------------ results viewer

function formatCell(v: SqlValue): { text: string; cls: string } {
  if (v === null) return { text: "NULL", cls: "italic text-muted-foreground/50" };
  if (typeof v === "number") {
    const text = Number.isInteger(v) ? String(v) : String(Math.round(v * 100) / 100);
    return { text, cls: "tabular-nums text-amber-700 dark:text-amber-300" };
  }
  return { text: v, cls: "" };
}

function ResultsTable({ result, ms }: { result: SqlResultSet; ms: number }) {
  return (
    <div className="overflow-hidden rounded-2xl border bg-card">
      <div className="flex flex-wrap items-center gap-2 border-b px-4 py-3">
        <Columns3 aria-hidden className="size-4 text-teal-500" />
        <h2 className="text-sm font-semibold">Result</h2>
        <div className="ml-auto flex items-center gap-1.5">
          <Badge variant="outline" className="font-mono text-[10px] font-normal tabular-nums text-muted-foreground">
            {result.rows.length} row{result.rows.length === 1 ? "" : "s"}
          </Badge>
          <Badge variant="outline" className="font-mono text-[10px] font-normal tabular-nums text-muted-foreground">
            {result.columns.length} col{result.columns.length === 1 ? "" : "s"}
          </Badge>
          <Badge
            variant="outline"
            className="border-emerald-500/30 bg-emerald-500/10 font-mono text-[10px] font-normal tabular-nums text-emerald-600 dark:text-emerald-300"
          >
            {ms < 1 ? "<1" : Math.round(ms)} ms
          </Badge>
        </div>
      </div>
      {result.rows.length === 0 ? (
        <div className="flex flex-col items-center gap-2 px-4 py-12 text-center">
          <Eraser aria-hidden className="size-5 text-muted-foreground/60" />
          <p className="text-sm font-medium text-muted-foreground">0 rows — the query ran, nothing matched.</p>
          <p className="text-xs text-muted-foreground/70">
            A valid query with an empty result is still a valid query.
          </p>
        </div>
      ) : (
        <div className="max-h-[440px] overflow-auto">
          <table className="w-full border-collapse text-sm">
            <thead className="sticky top-0 z-10 bg-card">
              <tr>
                {result.columns.map((c, i) => (
                  <th
                    key={`${c}-${i}`}
                    scope="col"
                    className="whitespace-nowrap border-b bg-card px-4 py-2.5 text-left font-mono text-[11px] font-semibold uppercase tracking-wider text-muted-foreground"
                  >
                    {c}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {result.rows.map((row, ri) => (
                <tr key={ri} className={cn(ri % 2 === 1 && "bg-muted/30", "transition-colors hover:bg-teal-500/5")}>
                  {row.map((cell, ci) => {
                    const { text, cls } = formatCell(cell);
                    return (
                      <td
                        key={ci}
                        className={cn("whitespace-nowrap border-b border-border/40 px-4 py-2", cls)}
                      >
                        {text === "" ? <span className="text-muted-foreground/40">''</span> : text}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

// --------------------------------------------------------------- error panel

function ErrorPanel({ error, sql }: { error: SqlError; sql: string }) {
  let where: string | null = null;
  let lineText: string | null = null;
  let caret: string | null = null;
  if (typeof error.pos === "number" && error.pos >= 0) {
    const before = sql.slice(0, error.pos);
    const lines = before.split("\n");
    const line = lines.length;
    const col = (lines[lines.length - 1]?.length ?? 0) + 1;
    where = `Line ${line} · character ${col}`;
    lineText = sql.split("\n")[line - 1] ?? "";
    caret = `${" ".repeat(Math.max(0, col - 1))}^`;
  }
  return (
    <div className="overflow-hidden rounded-2xl border border-rose-500/30 bg-rose-500/[0.04]">
      <div className="flex items-start gap-3 px-4 py-3.5">
        <AlertTriangle aria-hidden className="mt-0.5 size-4 shrink-0 text-rose-500" />
        <div className="min-w-0 space-y-1">
          <p className="text-sm font-semibold text-rose-700 dark:text-rose-300">{error.message}</p>
          {where && <p className="font-mono text-[11px] text-rose-500/80">{where}</p>}
        </div>
      </div>
      {lineText !== null && lineText.trim() !== "" && (
        <pre
          aria-hidden
          className="mx-4 mb-3 overflow-x-auto rounded-lg bg-rose-500/[0.06] px-3 py-2 font-mono text-[12px] leading-5 text-rose-700 dark:text-rose-300"
        >
          {`${lineText}\n${caret ?? ""}`}
        </pre>
      )}
      {error.hint && (
        <div className="flex items-start gap-2.5 border-t border-rose-500/20 bg-amber-500/[0.05] px-4 py-3">
          <Lightbulb aria-hidden className="mt-0.5 size-3.5 shrink-0 text-amber-500" />
          <p className="text-xs leading-relaxed text-amber-700 dark:text-amber-300">{error.hint}</p>
        </div>
      )}
    </div>
  );
}

// -------------------------------------------------------------------- SqlLab

let historyId = 0;

export function SqlLab({ item, category }: SqlLabProps) {
  const { toast } = useToast();
  const hydrated = useLibraryHydrated();
  // Select the stable record reference; derive the array outside the selector.
  const simProgressMap = useLibrary((s) => s.simProgress);
  const completeChallenge = useLibrary((s) => s.completeChallenge);
  const pushRecent = useLibrary((s) => s.pushRecent);

  const [mode, setMode] = React.useState<Mode>("free");
  const [sql, setSql] = React.useState(SQL_PRESETS[0].query);
  const [result, setResult] = React.useState<SqlResultSet | null>(null);
  const [error, setError] = React.useState<SqlError | null>(null);
  const [ms, setMs] = React.useState(0);
  const [history, setHistory] = React.useState<HistoryEntry[]>([]);
  const [activeMission, setActiveMission] = React.useState(0);
  const [showHint, setShowHint] = React.useState(false);
  const [showSolution, setShowSolution] = React.useState(false);
  const [missionFeedback, setMissionFeedback] = React.useState<string | null>(null);

  const solvedIds = hydrated ? simProgressMap[item.slug] ?? [] : [];
  const solvedCount = solvedIds.length;
  const mission = SQL_MISSIONS[activeMission] ?? null;

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

  const runQuery = React.useCallback(() => {
    const t0 = performance.now();
    try {
      const r = executeSql(DEMO_DATABASE, sql);
      const elapsed = performance.now() - t0;
      setResult(r);
      setError(null);
      setMs(elapsed);
      setHistory((prev) => [{ id: ++historyId, sql, ok: true, at: Date.now() }, ...prev].slice(0, 10));
      if (mode === "missions" && mission) {
        if (solvedIds.includes(mission.id)) {
          setMissionFeedback(null);
          return;
        }
        const verdict = mission.check(r);
        if (verdict.ok) {
          setMissionFeedback(null);
          setShowHint(false);
          setShowSolution(false);
          completeChallenge(item.slug, mission.id);
          trackEvent("challenge_complete", item.slug, mission.id);
          const isLast = solvedIds.length + 1 >= SQL_MISSIONS.length;
          toast({
            title: isLast ? "All missions cleared" : `Mission solved: ${mission.title}`,
            description: isLast
              ? "SELECT, WHERE, ORDER BY, LIMIT, GROUP BY and a three-table JOIN — the whole toolkit, proven."
              : "Locked in. On to the next one.",
          });
          if (activeMission < SQL_MISSIONS.length - 1) {
            window.setTimeout(() => selectMission(activeMission + 1), 900);
          }
        } else {
          setMissionFeedback(verdict.reason ?? "Not quite — re-read the briefing and adjust the query.");
        }
      } else {
        setMissionFeedback(null);
      }
    } catch (e) {
      setResult(null);
      const err = e instanceof SqlError ? e : new SqlError(String(e));
      setError(err);
      setMs(performance.now() - t0);
      setHistory((prev) => [{ id: ++historyId, sql, ok: false, at: Date.now() }, ...prev].slice(0, 10));
      setMissionFeedback(null);
    }
  }, [sql, mode, mission, solvedIds, activeMission, item.slug, completeChallenge]);

  const selectMission = (index: number) => {
    setActiveMission(index);
    setShowHint(false);
    setShowSolution(false);
    setMissionFeedback(null);
    const m = SQL_MISSIONS[index];
    if (m) {
      setSql(`-- Mission ${index + 1}: ${m.title}\n-- Write your query below, then hit Run (⌘/Ctrl + Enter)\n\n`);
    }
  };

  const copySql = async () => {
    try {
      await navigator.clipboard.writeText(sql);
      toast({ title: "Query copied", description: "The SQL is on your clipboard." });
    } catch {
      toast({ title: "Copy failed", description: "Your browser blocked clipboard access.", variant: "destructive" });
    }
  };

  return (
    <div className="space-y-6">
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
        className="relative overflow-hidden rounded-2xl border bg-gradient-to-br from-teal-500/15 via-transparent to-transparent p-6 sm:p-8"
      >
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 opacity-60 [background-image:radial-gradient(circle,var(--border)_1px,transparent_1px)] [background-size:18px_18px] [mask-image:radial-gradient(ellipse_80%_100%_at_60%_0%,black,transparent)]"
        />
        <div className="relative flex flex-col gap-5 sm:flex-row sm:items-center">
          <div className="relative size-16 shrink-0 overflow-hidden rounded-2xl ring-1 ring-teal-500/25">
            <Image src={category.icon} alt={`${category.title} category icon`} fill sizes="64px" className="object-cover" />
          </div>
          <div className="min-w-0 flex-1 space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">{item.title}</h1>
              <Badge variant="outline" className="gap-1.5 border-teal-500/40 bg-teal-500/15 font-medium text-teal-600 dark:text-teal-300">
                <Play aria-hidden className="size-3" />
                Interactive
              </Badge>
              {item.level && <Badge variant="outline" className="font-normal">{item.level}</Badge>}
            </div>
            <p className="max-w-2xl text-sm leading-relaxed text-muted-foreground">{item.description}</p>
          </div>
          {hydrated && (
            <div className="flex shrink-0 items-center gap-2 rounded-xl border bg-card/60 px-4 py-2.5 backdrop-blur">
              <Trophy aria-hidden className={cn("size-4", solvedCount === SQL_MISSIONS.length ? "fill-amber-500 text-amber-500" : "text-muted-foreground")} />
              <div className="text-xs">
                <span className="block font-semibold tabular-nums">
                  {solvedCount}/{SQL_MISSIONS.length} missions
                </span>
                <span className="text-muted-foreground">{solvedCount === SQL_MISSIONS.length ? "All clear!" : "keep going"}</span>
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
              if (m === "missions") {
                const firstUnsolved = SQL_MISSIONS.findIndex((x) => !solvedIds.includes(x.id));
                selectMission(firstUnsolved >= 0 ? firstUnsolved : 0);
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
                  <span className="rounded-full bg-teal-500/15 px-1.5 text-[10px] font-bold tabular-nums text-teal-600 dark:text-teal-400">
                    {solvedCount}
                  </span>
                )}
              </span>
            )}
          </button>
        ))}
      </div>

      <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,280px)_minmax(0,1fr)]">
        {/* Left: schema / missions sidebar */}
        <div className="space-y-4">
          <SchemaBrowser onPick={(q) => setSql(q)} />
          {mode === "missions" && (
            <div className="rounded-2xl border bg-card p-4">
              <div className="flex items-center justify-between">
                <h2 className="text-sm font-semibold">Guided missions</h2>
                <span className="text-xs tabular-nums text-muted-foreground">
                  {solvedCount}/{SQL_MISSIONS.length} solved
                </span>
              </div>
              <ol className="mt-3 space-y-1.5">
                {SQL_MISSIONS.map((m, i) => {
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
                            ? "border-teal-500/50 bg-teal-500/10 shadow-sm"
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
                                ? "border-teal-500/50 bg-teal-500/15 text-teal-600 dark:text-teal-300"
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

        {/* Right: editor + results */}
        <div className="min-w-0 space-y-4">
          {mode === "missions" && mission && (
            <div className="rounded-2xl border border-teal-500/30 bg-teal-500/[0.05] p-5">
              <div className="flex items-center gap-2">
                <Target aria-hidden className="size-4 text-teal-500" />
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
                  <KeyRound aria-hidden className={cn("size-3.5", showSolution && "text-teal-500")} />
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
                      <pre className="overflow-x-auto font-mono text-[12px] leading-5">{highlightSql(mission.solution)}</pre>
                      <Button
                        variant="outline"
                        size="sm"
                        className="mt-2.5 h-7 gap-1.5 rounded-lg text-[11px]"
                        onClick={() => setSql(mission.solution)}
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
              <Terminal aria-hidden className="size-4 text-teal-500" />
              <h2 className="text-sm font-semibold">Query</h2>
              <div className="ml-auto flex items-center gap-1.5">
                <Button
                  variant="ghost"
                  size="icon"
                  className="size-8 text-muted-foreground hover:text-foreground"
                  onClick={() => void copySql()}
                  aria-label="Copy query"
                  title="Copy query"
                >
                  <Copy aria-hidden className="size-3.5" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="size-8 text-muted-foreground hover:text-foreground"
                  onClick={() => {
                    setSql("");
                    setResult(null);
                    setError(null);
                    setMissionFeedback(null);
                  }}
                  aria-label="Clear editor"
                  title="Clear editor"
                >
                  <Eraser aria-hidden className="size-3.5" />
                </Button>
                <Button
                  size="sm"
                  className="h-8 gap-2 rounded-lg shadow-sm transition-all hover:shadow-md active:scale-[0.98]"
                  onClick={runQuery}
                >
                  <Play aria-hidden className="size-3.5" />
                  Run
                  <kbd className="ml-1 hidden rounded border border-foreground/20 bg-foreground/5 px-1.5 py-0.5 font-mono text-[9px] font-medium sm:inline-block">
                    ⌘↵
                  </kbd>
                </Button>
              </div>
            </div>
            <SqlEditor value={sql} onChange={setSql} onRun={runQuery} />
            {mode === "free" && (
              <div className="mt-3 flex flex-wrap gap-1.5">
                {SQL_PRESETS.map((p) => (
                  <button
                    key={p.label}
                    onClick={() => setSql(p.query)}
                    title={p.query.split("\n").join(" ")}
                    className="inline-flex items-center gap-1.5 rounded-full border bg-muted/40 px-3 py-1.5 text-[11px] font-medium text-muted-foreground transition-all hover:border-teal-500/40 hover:bg-teal-500/10 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    <Sparkles aria-hidden className="size-3 text-teal-500/70" />
                    {p.label}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Result / error */}
          {error && <ErrorPanel error={error} sql={sql} />}
          {result && !error && <ResultsTable result={result} ms={ms} />}

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
                <h2 className="text-sm font-semibold">Recent queries</h2>
                <button
                  className="ml-auto text-[11px] font-medium text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  onClick={() => setHistory([])}
                >
                  Clear
                </button>
              </div>
              <ul className="mt-3 space-y-1">
                {history.map((h) => (
                  <li key={h.id}>
                    <button
                      onClick={() => setSql(h.sql)}
                      title={h.sql}
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
                      <span className="truncate">{h.sql.replace(/\s+/g, " ").trim()}</span>
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
