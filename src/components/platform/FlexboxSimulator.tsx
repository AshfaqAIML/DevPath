"use client";

// FlexboxSimulator — a real, playable sandbox for the Simulators category.
// Two modes: Explore (free play with every axis control + live CSS output)
// and Challenges (match a target layout; progress persists in My Library).
import * as React from "react";
import Link from "next/link";
import Image from "next/image";
import { AnimatePresence, motion } from "framer-motion";
import {
  ArrowLeft,
  Check,
  CheckCircle2,
  ChevronRight,
  Copy,
  Lightbulb,
  Pause,
  Play,
  RotateCcw,
  Target,
  Trophy,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { useLibrary, useLibraryHydrated } from "@/lib/library-store";
import type { CategoryView, ResourceItemView } from "@/lib/platform";
import { trackEvent } from "./platform-data";

// ---------------------------------------------------------------------------
// Simulator state model
// ---------------------------------------------------------------------------

type FlexDirection = "row" | "row-reverse" | "column" | "column-reverse";
type JustifyContent = "flex-start" | "center" | "flex-end" | "space-between" | "space-around" | "space-evenly";
type AlignItems = "stretch" | "flex-start" | "center" | "flex-end" | "baseline";
type FlexWrap = "nowrap" | "wrap" | "wrap-reverse";
type AlignContent = "stretch" | "flex-start" | "center" | "flex-end" | "space-between";

interface FlexState {
  direction: FlexDirection;
  justify: JustifyContent;
  align: AlignItems;
  wrap: FlexWrap;
  alignContent: AlignContent;
  gap: number;
}

const DEFAULT_STATE: FlexState = {
  direction: "row",
  justify: "flex-start",
  align: "stretch",
  wrap: "nowrap",
  alignContent: "stretch",
  gap: 0,
};

const DIRECTIONS: { value: FlexDirection; label: string }[] = [
  { value: "row", label: "row" },
  { value: "row-reverse", label: "row-rev" },
  { value: "column", label: "column" },
  { value: "column-reverse", label: "col-rev" },
];

const JUSTIFIES: JustifyContent[] = ["flex-start", "center", "flex-end", "space-between", "space-around", "space-evenly"];
const ALIGNS: AlignItems[] = ["stretch", "flex-start", "center", "flex-end", "baseline"];
const WRAPS: FlexWrap[] = ["nowrap", "wrap", "wrap-reverse"];
const ALIGN_CONTENTS: AlignContent[] = ["stretch", "flex-start", "center", "flex-end", "space-between"];

// Box sizes vary so align / stretch behavior is actually visible.
const BOX_SIZES = [
  "h-16 w-16 sm:h-[4.5rem] sm:w-[4.5rem]",
  "h-12 w-20 sm:h-14 sm:w-24",
  "h-[4.5rem] w-14 sm:h-20 sm:w-16",
  "h-14 w-14 sm:h-16 sm:w-16",
  "h-12 w-24 sm:h-14 sm:w-28",
  "h-16 w-12 sm:h-[4.5rem] sm:w-14",
];

const BOX_COLORS = [
  "bg-teal-500/85 text-teal-50 border-teal-300/40",
  "bg-cyan-500/75 text-cyan-50 border-cyan-300/40",
  "bg-emerald-500/75 text-emerald-50 border-emerald-300/40",
  "bg-sky-500/70 text-sky-50 border-sky-300/40",
  "bg-violet-500/65 text-violet-50 border-violet-300/40",
  "bg-fuchsia-500/60 text-fuchsia-50 border-fuchsia-300/40",
];

// ---------------------------------------------------------------------------
// Challenges — a partial FlexState to match; only listed keys are validated.
// ---------------------------------------------------------------------------

interface Challenge {
  id: string;
  title: string;
  brief: string;
  hint: string;
  target: Partial<FlexState>;
  items: number;
}

const CHALLENGES: Challenge[] = [
  {
    id: "center",
    title: "Dead center",
    brief: "Center the box on both axes — the classic flexbox party trick.",
    hint: "justify-content handles the main axis, align-items the cross axis.",
    target: { justify: "center", align: "center" },
    items: 1,
  },
  {
    id: "end",
    title: "Push to the end",
    brief: "Shove every item to the far end of the main axis.",
    hint: "flex-end is where the main axis terminates.",
    target: { justify: "flex-end" },
    items: 3,
  },
  {
    id: "navbar",
    title: "Build a navbar",
    brief: "Space the items evenly with pushing to the edges first — logo left, menu right.",
    hint: "space-between pins the first and last items to the edges.",
    target: { justify: "space-between" },
    items: 3,
  },
  {
    id: "column",
    title: "Stack it vertically",
    brief: "Lay the items out top-to-bottom like a settings menu.",
    hint: "The main axis doesn't have to be horizontal.",
    target: { direction: "column" },
    items: 3,
  },
  {
    id: "reverse",
    title: "Reverse the flow",
    brief: "Keep the row horizontal but make item 1 land on the right.",
    hint: "row-reverse flips the main axis direction.",
    target: { direction: "row-reverse" },
    items: 3,
  },
  {
    id: "wrap",
    title: "Let it wrap",
    brief: "Items shouldn't shrink — let them flow onto a second line with breathing room.",
    hint: "flex-wrap: wrap plus a gap of at least 8px.",
    target: { wrap: "wrap", gap: 12 },
    items: 5,
  },
];

// ---------------------------------------------------------------------------
// Stage renderer (shared by "yours" and challenge targets)
// ---------------------------------------------------------------------------

function FlexStage({
  state,
  items,
  compact = false,
  challenge = false,
}: {
  state: FlexState;
  items: number;
  compact?: boolean;
  challenge?: boolean;
}) {
  return (
    <div
      className={cn(
        "relative flex overflow-hidden rounded-xl border-2 border-dashed border-teal-500/30 bg-[radial-gradient(circle,var(--border)_1px,transparent_1px)] [background-size:16px_16px]",
        compact ? "min-h-36" : "min-h-44 sm:min-h-56"
      )}
      style={{
        flexDirection: state.direction,
        justifyContent: state.justify,
        alignItems: state.align,
        flexWrap: state.wrap,
        alignContent: state.alignContent,
        gap: `${state.gap}px`,
        padding: "12px",
      }}
      aria-label={challenge ? "Challenge target layout" : "Your live flexbox layout"}
    >
      {Array.from({ length: items }).map((_, i) => (
        <div
          key={i}
          className={cn(
            "flex items-center justify-center rounded-lg border font-mono text-sm font-bold tabular-nums shadow-sm transition-all duration-300 ease-out",
            compact ? "size-8 text-[11px]" : BOX_SIZES[i % BOX_SIZES.length],
            challenge
              ? "border-teal-400/40 bg-teal-500/15 text-teal-600 dark:text-teal-300"
              : BOX_COLORS[i % BOX_COLORS.length]
          )}
        >
          {i + 1}
        </div>
      ))}
    </div>
  );
}

// ---------------------------------------------------------------------------
// CSS code generation
// ---------------------------------------------------------------------------

function cssLines(state: FlexState): { prop: string; value: string; changed: boolean }[] {
  return [
    { prop: "display", value: "flex", changed: false },
    { prop: "flex-direction", value: state.direction, changed: state.direction !== DEFAULT_STATE.direction },
    { prop: "justify-content", value: state.justify, changed: state.justify !== DEFAULT_STATE.justify },
    { prop: "align-items", value: state.align, changed: state.align !== DEFAULT_STATE.align },
    { prop: "flex-wrap", value: state.wrap, changed: state.wrap !== DEFAULT_STATE.wrap },
    ...(state.wrap !== "nowrap"
      ? [{ prop: "align-content", value: state.alignContent, changed: state.alignContent !== DEFAULT_STATE.alignContent }]
      : []),
    { prop: "gap", value: `${state.gap}px`, changed: state.gap !== DEFAULT_STATE.gap },
  ];
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

interface FlexboxSimulatorProps {
  item: ResourceItemView;
  category: CategoryView;
}

export function FlexboxSimulator({ item, category }: FlexboxSimulatorProps) {
  const { toast } = useToast();
  const hydrated = useLibraryHydrated();
  // Select the stable record reference; derive the array outside the selector
  // so useSyncExternalStore never sees a fresh [] per call.
  const simProgressMap = useLibrary((s) => s.simProgress);
  const completeChallenge = useLibrary((s) => s.completeChallenge);

  const [mode, setMode] = React.useState<"explore" | "challenges">("explore");
  const [state, setState] = React.useState<FlexState>(DEFAULT_STATE);
  const [items, setItems] = React.useState(4);
  const [activeChallenge, setActiveChallenge] = React.useState(0);
  const [showHint, setShowHint] = React.useState(false);
  const [justChecked, setJustChecked] = React.useState<"pass" | "fail" | null>(null);

  const challenge = CHALLENGES[activeChallenge];
  const solvedIds = hydrated ? simProgressMap[item.slug] ?? [] : [];
  const solvedCount = solvedIds.length;

  // Track the view once on mount
  React.useEffect(() => {
    trackEvent("simulator_view", item.slug, item.title);
  }, [item.slug, item.title]);

  const set = <K extends keyof FlexState>(key: K, value: FlexState[K]) =>
    setState((s) => ({ ...s, [key]: value }));

  const reset = () => {
    setState(DEFAULT_STATE);
    setItems(mode === "challenges" ? challenge.items : 4);
    setJustChecked(null);
    setShowHint(false);
  };

  const selectChallenge = (index: number) => {
    setActiveChallenge(index);
    setState(DEFAULT_STATE);
    setItems(CHALLENGES[index].items);
    setShowHint(false);
    setJustChecked(null);
  };

  const check = () => {
    const target = challenge.target;
    const pass = Object.entries(target).every(
      ([key, value]) => state[key as keyof FlexState] === value
    );
    setJustChecked(pass ? "pass" : "fail");
    if (pass) {
      completeChallenge(item.slug, challenge.id);
      trackEvent("challenge_complete", item.slug, challenge.id);
      const isLast = solvedIds.length + 1 >= CHALLENGES.length && !solvedIds.includes(challenge.id);
      toast({
        title: isLast ? "All challenges cleared 🏆" : `Challenge solved: ${challenge.title}`,
        description: isLast
          ? "You flexed every muscle the box model has. Try free-play mode or another roadmap."
          : "On to the next one — the layouts only get more interesting.",
      });
      if (activeChallenge < CHALLENGES.length - 1) {
        window.setTimeout(() => selectChallenge(activeChallenge + 1), 900);
      }
    } else {
      const wrong = Object.entries(target)
        .filter(([key, value]) => state[key as keyof FlexState] !== value)
        .map(([key]) => key)
        .join(", ");
      toast({
        title: "Not quite — keep flexing",
        description: `Still mismatched: ${wrong}. Reveal the hint if you're stuck.`,
        variant: "destructive",
      });
    }
  };

  const css = cssLines(state);
  const cssText = `.container {\n${css.map((l) => `  ${l.prop}: ${l.value};`).join("\n")}\n}`;

  const copyCss = async () => {
    try {
      await navigator.clipboard.writeText(cssText);
      toast({ title: "CSS copied", description: "The exact layout you built is on your clipboard." });
    } catch {
      toast({ title: "Copy failed", description: "Your browser blocked clipboard access.", variant: "destructive" });
    }
  };

  const labelCls = "text-[11px] font-semibold uppercase tracking-wider text-muted-foreground";

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
              <Badge variant="outline" className="gap-1.5 border-teal-500/40 bg-teal-500/15 text-teal-600 font-medium dark:text-teal-300">
                <Play aria-hidden className="size-3" />
                Interactive
              </Badge>
              {item.level && <Badge variant="outline" className="font-normal">{item.level}</Badge>}
            </div>
            <p className="max-w-2xl text-sm leading-relaxed text-muted-foreground">{item.description}</p>
          </div>
          {hydrated && (
            <div className="flex shrink-0 items-center gap-2 rounded-xl border bg-card/60 px-4 py-2.5 backdrop-blur">
              <Trophy aria-hidden className={cn("size-4", solvedCount === CHALLENGES.length ? "fill-amber-500 text-amber-500" : "text-muted-foreground")} />
              <div className="text-xs">
                <span className="block font-semibold tabular-nums">
                  {solvedCount}/{CHALLENGES.length} challenges
                </span>
                <span className="text-muted-foreground">{solvedCount === CHALLENGES.length ? "All clear!" : "keep going"}</span>
              </div>
            </div>
          )}
        </div>
      </motion.header>

      {/* Mode switch */}
      <div
        role="tablist"
        aria-label="Simulator mode"
        className="flex w-full max-w-md gap-1 rounded-xl border bg-muted/50 p-1"
      >
        {(["explore", "challenges"] as const).map((m) => (
          <button
            key={m}
            role="tab"
            aria-selected={mode === m}
            onClick={() => {
              setMode(m);
              if (m === "challenges") selectChallenge(Math.min(activeChallenge, CHALLENGES.length - 1));
              else reset();
            }}
            className={cn(
              "relative flex-1 rounded-lg px-4 py-2 text-sm font-medium transition-all",
              mode === m
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            {m === "explore" ? (
              <span className="inline-flex items-center gap-2">
                <Play aria-hidden className="size-3.5" /> Free play
              </span>
            ) : (
              <span className="inline-flex items-center gap-2">
                <Target aria-hidden className="size-3.5" /> Challenges
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

      {mode === "explore" ? (
        <div className="grid gap-6 lg:grid-cols-[300px_1fr]">
          {/* Controls */}
          <motion.section
            initial={{ opacity: 0, x: -12 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.35, delay: 0.05 }}
            aria-label="Flexbox controls"
            className="space-y-5 rounded-2xl border bg-card p-5"
          >
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold">Controls</h2>
              <Button variant="ghost" size="sm" onClick={reset} className="h-7 gap-1.5 rounded-lg px-2 text-xs text-muted-foreground">
                <RotateCcw aria-hidden className="size-3" />
                Reset
              </Button>
            </div>

            <div className="space-y-2">
              <p className={labelCls}>flex-direction</p>
              <ToggleGroup
                type="single"
                value={state.direction}
                onValueChange={(v) => v && set("direction", v as FlexDirection)}
                variant="outline"
                aria-label="flex-direction"
                className="grid grid-cols-2 gap-1.5"
              >
                {DIRECTIONS.map((d) => (
                  <ToggleGroupItem
                    key={d.value}
                    value={d.value}
                    size="sm"
                    className="h-8 rounded-lg font-mono text-[11px] data-[state=on]:bg-teal-500/15 data-[state=on]:text-teal-700 dark:data-[state=on]:text-teal-300"
                  >
                    {d.label}
                  </ToggleGroupItem>
                ))}
              </ToggleGroup>
            </div>

            <div className="space-y-2">
              <p className={labelCls}>justify-content</p>
              <ToggleGroup
                type="single"
                value={state.justify}
                onValueChange={(v) => v && set("justify", v as JustifyContent)}
                variant="outline"
                aria-label="justify-content"
                className="grid grid-cols-3 gap-1.5"
              >
                {JUSTIFIES.map((j) => (
                  <ToggleGroupItem
                    key={j}
                    value={j}
                    size="sm"
                    className="h-8 rounded-lg font-mono text-[10px] data-[state=on]:bg-teal-500/15 data-[state=on]:text-teal-700 dark:data-[state=on]:text-teal-300"
                  >
                    {j}
                  </ToggleGroupItem>
                ))}
              </ToggleGroup>
            </div>

            <div className="space-y-2">
              <p className={labelCls}>align-items</p>
              <ToggleGroup
                type="single"
                value={state.align}
                onValueChange={(v) => v && set("align", v as AlignItems)}
                variant="outline"
                aria-label="align-items"
                className="grid grid-cols-3 gap-1.5"
              >
                {ALIGNS.map((a) => (
                  <ToggleGroupItem
                    key={a}
                    value={a}
                    size="sm"
                    className="h-8 rounded-lg font-mono text-[10px] data-[state=on]:bg-teal-500/15 data-[state=on]:text-teal-700 dark:data-[state=on]:text-teal-300"
                  >
                    {a}
                  </ToggleGroupItem>
                ))}
              </ToggleGroup>
            </div>

            <div className="space-y-2">
              <p className={labelCls}>flex-wrap</p>
              <ToggleGroup
                type="single"
                value={state.wrap}
                onValueChange={(v) => v && set("wrap", v as FlexWrap)}
                variant="outline"
                aria-label="flex-wrap"
                className="grid grid-cols-3 gap-1.5"
              >
                {WRAPS.map((w) => (
                  <ToggleGroupItem
                    key={w}
                    value={w}
                    size="sm"
                    className="h-8 rounded-lg font-mono text-[10px] data-[state=on]:bg-teal-500/15 data-[state=on]:text-teal-700 dark:data-[state=on]:text-teal-300"
                  >
                    {w}
                  </ToggleGroupItem>
                ))}
              </ToggleGroup>
            </div>

            {state.wrap !== "nowrap" && (
              <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} className="space-y-2 overflow-hidden">
                <p className={labelCls}>align-content</p>
                <ToggleGroup
                  type="single"
                  value={state.alignContent}
                  onValueChange={(v) => v && set("alignContent", v as AlignContent)}
                  variant="outline"
                  aria-label="align-content"
                  className="grid grid-cols-3 gap-1.5"
                >
                  {ALIGN_CONTENTS.map((ac) => (
                    <ToggleGroupItem
                      key={ac}
                      value={ac}
                      size="sm"
                      className="h-8 rounded-lg font-mono text-[10px] data-[state=on]:bg-teal-500/15 data-[state=on]:text-teal-700 dark:data-[state=on]:text-teal-300"
                    >
                      {ac}
                    </ToggleGroupItem>
                  ))}
                </ToggleGroup>
              </motion.div>
            )}

            <div className="space-y-2.5">
              <div className="flex items-center justify-between">
                <p className={labelCls}>gap</p>
                <span className="rounded bg-muted px-1.5 font-mono text-[11px] tabular-nums text-muted-foreground">
                  {state.gap}px
                </span>
              </div>
              <Slider
                value={[state.gap]}
                onValueChange={([v]) => set("gap", v)}
                min={0}
                max={48}
                step={2}
                aria-label="gap in pixels"
              />
            </div>

            <div className="space-y-2.5">
              <div className="flex items-center justify-between">
                <p className={labelCls}>items</p>
                <span className="rounded bg-muted px-1.5 font-mono text-[11px] tabular-nums text-muted-foreground">{items}</span>
              </div>
              <Slider
                value={[items]}
                onValueChange={([v]) => setItems(v)}
                min={1}
                max={6}
                step={1}
                aria-label="number of items"
              />
            </div>
          </motion.section>

          {/* Stage + CSS */}
          <div className="min-w-0 space-y-6">
            <motion.section
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.35, delay: 0.1 }}
              aria-label="Live preview"
              className="rounded-2xl border bg-card p-5"
            >
              <div className="mb-4 flex items-center gap-2">
                <span aria-hidden className="relative flex size-2">
                  <span className="absolute inline-flex size-full animate-ping rounded-full bg-teal-400 opacity-60" />
                  <span className="relative inline-flex size-2 rounded-full bg-teal-500" />
                </span>
                <h2 className="text-sm font-semibold">Live preview</h2>
                <span className="ml-auto font-mono text-[10px] text-muted-foreground">.container</span>
              </div>
              <FlexStage state={state} items={items} />
            </motion.section>

            <motion.section
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.35, delay: 0.15 }}
              aria-label="Generated CSS"
              className="overflow-hidden rounded-2xl border bg-card"
            >
              <div className="flex items-center gap-2 border-b bg-muted/50 px-5 py-3">
                <h2 className="text-sm font-semibold">Generated CSS</h2>
                <span className="font-mono text-[10px] text-muted-foreground">flexbox.css</span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={copyCss}
                  className="ml-auto h-7 gap-1.5 rounded-lg px-2.5 text-xs"
                >
                  <Copy aria-hidden className="size-3" />
                  Copy
                </Button>
              </div>
              <pre className="overflow-x-auto p-5 font-mono text-[13px] leading-relaxed">
                <code>
                  <span className="text-muted-foreground">.container {"{"}</span>
                  {"\n"}
                  {css.map((l) => (
                    <span key={l.prop} className="block">
                      {"  "}
                      <span className={l.changed ? "font-semibold text-teal-600 dark:text-teal-400" : "text-foreground"}>
                        {l.prop}
                      </span>
                      <span className="text-muted-foreground">: </span>
                      <span className={l.changed ? "font-semibold text-teal-600 dark:text-teal-400" : "text-foreground"}>
                        {l.value}
                      </span>
                      <span className="text-muted-foreground">;</span>
                      {l.changed && (
                        <span className="ml-2 select-none rounded bg-teal-500/15 px-1 text-[9px] font-bold uppercase tracking-wide text-teal-600 dark:text-teal-400">
                          changed
                        </span>
                      )}
                    </span>
                  ))}
                  <span className="text-muted-foreground">{"}"}</span>
                </code>
              </pre>
            </motion.section>
          </div>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Challenge picker */}
          <div role="tablist" aria-label="Challenges" className="flex gap-2 overflow-x-auto pb-1">
            {CHALLENGES.map((c, i) => {
              const solved = solvedIds.includes(c.id);
              const active = i === activeChallenge;
              return (
                <button
                  key={c.id}
                  role="tab"
                  aria-selected={active}
                  onClick={() => selectChallenge(i)}
                  className={cn(
                    "flex shrink-0 items-center gap-2 rounded-xl border px-3.5 py-2 text-sm font-medium transition-all",
                    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                    active
                      ? "border-teal-500/50 bg-teal-500/10 text-teal-700 dark:text-teal-300"
                      : "bg-card text-muted-foreground hover:border-foreground/25 hover:text-foreground",
                    solved && !active && "border-emerald-500/30 text-emerald-600 dark:text-emerald-400"
                  )}
                >
                  <span className="tabular-nums">{i + 1}</span>
                  <span className="hidden sm:inline">{c.title}</span>
                  {solved && <Check aria-hidden className="size-3.5" />}
                </button>
              );
            })}
          </div>

          <div className="grid gap-6 lg:grid-cols-[300px_1fr]">
            {/* Challenge brief */}
            <motion.section
              key={challenge.id}
              initial={{ opacity: 0, x: -12 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.3 }}
              aria-label="Challenge details"
              className="space-y-4 rounded-2xl border bg-card p-5"
            >
              <div className="flex items-center justify-between gap-2">
                <Badge variant="outline" className="border-teal-500/40 bg-teal-500/10 text-teal-600 font-medium dark:text-teal-300">
                  Challenge {activeChallenge + 1} of {CHALLENGES.length}
                </Badge>
                {solvedIds.includes(challenge.id) && (
                  <span className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-600 dark:text-emerald-400">
                    <CheckCircle2 aria-hidden className="size-3.5" />
                    Solved
                  </span>
                )}
              </div>
              <div>
                <h2 className="text-base font-bold">{challenge.title}</h2>
                <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">{challenge.brief}</p>
              </div>

              <AnimatePresence initial={false}>
                {showHint && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    className="overflow-hidden"
                  >
                    <p className="flex gap-2 rounded-xl border border-amber-500/30 bg-amber-500/10 p-3 text-xs leading-relaxed text-amber-700 dark:text-amber-300">
                      <Lightbulb aria-hidden className="mt-0.5 size-3.5 shrink-0" />
                      {challenge.hint}
                    </p>
                  </motion.div>
                )}
              </AnimatePresence>

              <div className="flex flex-wrap gap-2">
                <Button onClick={check} className="flex-1 gap-2" disabled={justChecked === "pass"}>
                  {justChecked === "pass" ? (
                    <>
                      <CheckCircle2 aria-hidden className="size-4" />
                      Solved
                    </>
                  ) : (
                    <>
                      <Check aria-hidden className="size-4" />
                      Check layout
                    </>
                  )}
                </Button>
                <Button
                  variant="outline"
                  onClick={() => setShowHint((v) => !v)}
                  aria-expanded={showHint}
                  className="gap-2"
                >
                  <Lightbulb aria-hidden className="size-4" />
                  {showHint ? "Hide" : "Hint"}
                </Button>
              </div>

              <p className="text-[11px] leading-relaxed text-muted-foreground">
                Use the controls on the stage to match the target. Only the properties this
                challenge tests are checked.
              </p>
            </motion.section>

            {/* Target vs yours */}
            <div className="min-w-0 space-y-6">
              <div className="grid gap-4 sm:grid-cols-2">
                <motion.section
                  key={`target-${challenge.id}`}
                  initial={{ opacity: 0, scale: 0.97 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ duration: 0.3 }}
                  aria-label="Target layout"
                  className="space-y-3 rounded-2xl border border-teal-500/30 bg-teal-500/[0.04] p-4"
                >
                  <div className="flex items-center gap-2">
                    <Target aria-hidden className="size-4 text-teal-600 dark:text-teal-400" />
                    <h3 className="text-sm font-semibold">Target</h3>
                    <Badge variant="outline" className="ml-auto border-teal-500/40 bg-teal-500/10 px-1.5 font-mono text-[10px] font-normal text-teal-600 dark:text-teal-300">
                      goal
                    </Badge>
                  </div>
                  <FlexStage
                    state={{ ...DEFAULT_STATE, ...challenge.target }}
                    items={challenge.items}
                    compact
                    challenge
                  />
                </motion.section>

                <motion.section
                  key={`yours-${challenge.id}`}
                  initial={{ opacity: 0, scale: 0.97 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ duration: 0.3, delay: 0.05 }}
                  aria-label="Your layout"
                  className={cn(
                    "space-y-3 rounded-2xl border p-4 transition-colors duration-500",
                    justChecked === "pass"
                      ? "border-emerald-500/50 bg-emerald-500/[0.06]"
                      : justChecked === "fail"
                        ? "border-rose-500/50 bg-rose-500/[0.04]"
                        : "border-border bg-card"
                  )}
                >
                  <div className="flex items-center gap-2">
                    <Play aria-hidden className="size-4 text-muted-foreground" />
                    <h3 className="text-sm font-semibold">Yours</h3>
                    <AnimatePresence>
                      {justChecked && (
                        <motion.span
                          initial={{ opacity: 0, scale: 0.8 }}
                          animate={{ opacity: 1, scale: 1 }}
                          exit={{ opacity: 0, scale: 0.8 }}
                          className={cn(
                            "ml-auto inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide",
                            justChecked === "pass"
                              ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400"
                              : "bg-rose-500/15 text-rose-600 dark:text-rose-400"
                          )}
                        >
                          {justChecked === "pass" ? (
                            <>
                              <CheckCircle2 aria-hidden className="size-3" /> match
                            </>
                          ) : (
                            <>
                              <RotateCcw aria-hidden className="size-3" /> mismatch
                          </>
                          )}
                        </motion.span>
                      )}
                    </AnimatePresence>
                  </div>

                  {/* Challenge controls reuse the stage */}
                  <div className="space-y-3">
                    <FlexStage state={state} items={challenge.items} compact />
                    <div className="flex flex-wrap gap-1.5">
                      {(["direction", "justify", "align", "wrap"] as const).map((key) => (
                        <ToggleGroup
                          key={key}
                          type="single"
                          value={state[key] as string}
                          onValueChange={(v) => v && set(key, v as never)}
                          variant="outline"
                          aria-label={key}
                          className="flex-wrap"
                        >
                          {(key === "direction"
                            ? DIRECTIONS.map((d) => d.value)
                            : key === "justify"
                              ? JUSTIFIES
                              : key === "align"
                                ? ALIGNS
                                : WRAPS
                          ).map((v) => (
                            <ToggleGroupItem
                              key={v}
                              value={v}
                              size="sm"
                              className="h-7 rounded-md px-2 font-mono text-[10px] data-[state=on]:bg-teal-500/15 data-[state=on]:text-teal-700 dark:data-[state=on]:text-teal-300"
                            >
                              {v}
                            </ToggleGroupItem>
                          ))}
                        </ToggleGroup>
                      ))}
                      <div className="flex min-w-40 flex-1 items-center gap-2 rounded-lg border px-2.5">
                        <span className="font-mono text-[10px] text-muted-foreground">gap</span>
                        <Slider
                          value={[state.gap]}
                          onValueChange={([v]) => set("gap", v)}
                          min={0}
                          max={48}
                          step={2}
                          aria-label="gap in pixels"
                          className="flex-1"
                        />
                        <span className="font-mono text-[10px] tabular-nums text-muted-foreground">{state.gap}px</span>
                      </div>
                    </div>
                  </div>
                </motion.section>
              </div>

              {/* Live CSS for the challenge attempt */}
              <section aria-label="Generated CSS" className="overflow-hidden rounded-2xl border bg-card">
                <div className="flex items-center gap-2 border-b bg-muted/50 px-5 py-2.5">
                  <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Your CSS</h2>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={copyCss}
                    className="ml-auto h-6 gap-1.5 rounded-md px-2 text-[11px] text-muted-foreground"
                  >
                    <Copy aria-hidden className="size-3" />
                    Copy
                  </Button>
                </div>
                <pre className="overflow-x-auto p-4 font-mono text-xs leading-relaxed">
                  <code>
                    {css.map((l) => {
                      const required = l.prop in challenge.target || l.prop === "display";
                      const matches =
                        l.prop in challenge.target
                          ? String(challenge.target[l.prop as keyof FlexState]) === l.value
                          : true;
                      return (
                        <span key={l.prop} className={cn("block", required ? (matches ? "text-emerald-600 dark:text-emerald-400" : "text-rose-500") : "opacity-50")}>
                          {`  ${l.prop}: ${l.value};`}
                        </span>
                      );
                    })}
                  </code>
                </pre>
              </section>
            </div>
          </div>
        </div>
      )}

      {/* Footer tip band */}
      <div className="flex flex-col items-start gap-3 rounded-2xl border border-dashed bg-muted/30 p-5 sm:flex-row sm:items-center">
        <div className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-teal-500/15 text-teal-600 dark:text-teal-400">
          <Pause aria-hidden className="size-4" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold">Learning by breaking things</p>
          <p className="text-xs leading-relaxed text-muted-foreground">
            Every control maps 1:1 to a real CSS property — what you build here is exactly what ships.
            Pair this simulator with the CSS Flexbox Deep Dive course for the full picture.
          </p>
        </div>
        <Button asChild variant="outline" size="sm" className="shrink-0 gap-2 rounded-lg">
          <Link href={`/?category=${category.slug}`}>Back to {category.title}</Link>
        </Button>
      </div>
    </div>
  );
}
