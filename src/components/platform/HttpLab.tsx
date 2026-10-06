"use client";

// HTTP Request/Response Lab — the second playable simulator.
// Sends REAL requests to DevPath's own first-party API (same-origin), so every
// status code, header and JSON payload the learner studies is genuine.
// Two modes: free play (request builder + response viewer + exchange timeline)
// and guided missions (six objectives covering methods, query params and the
// most important status-code families).

import * as React from "react";
import Image from "next/image";
import Link from "next/link";
import { AnimatePresence, motion } from "framer-motion";
import {
  ArrowLeft,
  Braces,
  Check,
  ChevronDown,
  ChevronRight,
  Copy,
  Globe,
  Lightbulb,
  Play,
  Plus,
  RotateCcw,
  Send,
  Target,
  Trash2,
  Trophy,
  X,
  Zap,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { useLibrary, useLibraryHydrated } from "@/lib/library-store";
import { trackEvent } from "./platform-data";
import type { CategoryView, ResourceItemView } from "@/lib/platform";

// ---------------------------------------------------------------------------
// Types & constants
// ---------------------------------------------------------------------------

type Method = "GET" | "POST" | "PATCH" | "DELETE";

interface HeaderRow {
  id: number;
  key: string;
  value: string;
  enabled: boolean;
}

interface Exchange {
  id: number;
  method: Method;
  url: string;
  pathname: string;
  query: URLSearchParams;
  requestHeaders: Record<string, string>;
  requestBody?: string;
  status: number;
  statusText: string;
  responseHeaders: [string, string][];
  bodyText: string;
  ms: number;
  size: number;
  at: number;
}

const METHOD_STYLES: Record<Method, string> = {
  GET: "border-emerald-500/30 bg-emerald-500/15 text-emerald-700 dark:text-emerald-400",
  POST: "border-amber-500/30 bg-amber-500/15 text-amber-700 dark:text-amber-400",
  PATCH: "border-orange-500/30 bg-orange-500/15 text-orange-700 dark:text-orange-400",
  DELETE: "border-rose-500/30 bg-rose-500/15 text-rose-700 dark:text-rose-400",
};

const STATUS_TEXT: Record<number, string> = {
  200: "OK",
  201: "Created",
  204: "No Content",
  400: "Bad Request",
  401: "Unauthorized",
  403: "Forbidden",
  404: "Not Found",
  405: "Method Not Allowed",
  429: "Too Many Requests",
  500: "Internal Server Error",
};

const STATUS_TEACH: Record<number, string> = {
  200: "OK — the request succeeded and the body carries exactly what you asked for.",
  201: "Created — a write that resulted in a brand-new resource.",
  204: "No Content — success, but the server deliberately sent back an empty body.",
  400: "Bad Request — the server refused your payload. Here it failed schema validation.",
  401: "Unauthorized — missing or invalid credentials. This endpoint expects an admin key.",
  403: "Forbidden — the server knows who you are and still says no.",
  404: "Not Found — nothing lives at this path. Check your URL segment by segment.",
  405: "Method Not Allowed — the path exists but not with this verb.",
  429: "Too Many Requests — you tripped the rate limiter (90 events per minute here).",
  500: "Internal Server Error — the backend failed. It's not you, it's the server.",
};

function statusStyle(status: number) {
  if (status === 0)
    return {
      chip: "border-rose-500/40 bg-rose-500/15 text-rose-600 dark:text-rose-300",
      label: "Network error",
      bar: "bg-rose-500",
    };
  if (status >= 500)
    return {
      chip: "border-rose-500/40 bg-rose-500/15 text-rose-600 dark:text-rose-300",
      label: "Server error",
      bar: "bg-rose-500",
    };
  if (status >= 400)
    return {
      chip: "border-rose-500/40 bg-rose-500/15 text-rose-600 dark:text-rose-300",
      label: "Client error",
      bar: "bg-rose-500",
    };
  if (status >= 300)
    return {
      chip: "border-amber-500/40 bg-amber-500/15 text-amber-600 dark:text-amber-300",
      label: "Redirect",
      bar: "bg-amber-500",
    };
  return {
    chip: "border-emerald-500/40 bg-emerald-500/15 text-emerald-600 dark:text-emerald-300",
    label: "Success",
    bar: "bg-emerald-500",
  };
}

const DEFAULT_HEADERS: () => HeaderRow[] = () => [
  { id: 1, key: "Content-Type", value: "application/json", enabled: true },
];

interface Mission {
  id: string;
  title: string;
  concept: string;
  brief: string;
  hint: string;
  preset: { method: Method; url: string; body?: string };
  verify: (ex: Exchange) => boolean;
}

const MISSIONS: Mission[] = [
  {
    id: "first-contact",
    title: "First contact",
    concept: "GET · 200",
    brief:
      "Every API conversation starts the same way: ask for a resource and check what comes back. Fetch the category registry and meet your first 200.",
    hint: "Method GET, path /api/categories — then hit Send.",
    preset: { method: "GET", url: "/api/categories" },
    verify: (ex) =>
      ex.method === "GET" && ex.pathname === "/api/categories" && ex.status === 200,
  },
  {
    id: "query-params",
    title: "Filter with query params",
    concept: "?q=…",
    brief:
      "The query string is how GET requests carry arguments. Append a search term to the resources endpoint and watch the result set shrink.",
    hint: "GET /api/resources?q=docker — everything after the ? is a key=value pair.",
    preset: { method: "GET", url: "/api/resources" },
    verify: (ex) =>
      ex.method === "GET" &&
      ex.pathname === "/api/resources" &&
      ex.status === 200 &&
      ex.query.has("q"),
  },
  {
    id: "shape-the-answer",
    title: "Ask for less",
    concept: "sort · limit",
    brief:
      "Well-behaved APIs let you shape the response: sort it and cap its size. Request the five most popular resources in one round-trip.",
    hint: "GET /api/resources?sort=popular&limit=5 — chain params with &.",
    preset: { method: "GET", url: "/api/resources?limit=5" },
    verify: (ex) =>
      ex.method === "GET" &&
      ex.pathname === "/api/resources" &&
      ex.status === 200 &&
      ex.query.get("sort") === "popular" &&
      ex.query.get("limit") === "5",
  },
  {
    id: "bad-request",
    title: "Trigger a 400",
    concept: "POST · 400",
    brief:
      "Servers validate before they trust. POST a payload the analytics endpoint will refuse, and study the 400 that comes back.",
    hint: "POST /api/analytics with the body {\"type\":\"nope\"} — the schema demands a known type.",
    preset: { method: "POST", url: "/api/analytics", body: "{}" },
    verify: (ex) =>
      ex.method === "POST" && ex.pathname === "/api/analytics" && ex.status === 400,
  },
  {
    id: "unauthorized",
    title: "Knock without a key",
    concept: "GET · 401",
    brief:
      "Protected endpoints answer differently when you lack credentials. Request the analytics summary without an admin key and collect your 401.",
    hint: "GET /api/analytics — no key attached. The lab never sends admin credentials for you.",
    preset: { method: "GET", url: "/api/analytics" },
    verify: (ex) =>
      ex.method === "GET" && ex.pathname === "/api/analytics" && ex.status === 401,
  },
  {
    id: "not-found",
    title: "Find a ghost",
    concept: "404",
    brief:
      "Ask for a path that doesn't exist — any method, any invented segment — and meet the most famous status code on the web.",
    hint: "GET /api/ghost-town — any unknown path returns 404.",
    preset: { method: "GET", url: "/api/ghost-town" },
    verify: (ex) => ex.status === 404,
  },
];

const PRESETS: { method: Method; url: string; label: string; body?: string }[] = [
  { method: "GET", url: "/api/categories", label: "All categories" },
  { method: "GET", url: "/api/resources?q=docker", label: "Search: docker" },
  { method: "GET", url: "/api/resources?sort=popular&limit=5", label: "Top 5 popular" },
  { method: "GET", url: "/api/resources?category=roadmaps&level=Intermediate", label: "Filter roadmaps" },
  {
    method: "POST",
    url: "/api/analytics",
    label: "Log an event",
    body: '{"type":"item_view","slug":"http-request-response-lab","label":"From the lab"}',
  },
  { method: "POST", url: "/api/analytics", label: "Invalid → 400", body: '{"type":"nope"}' },
  { method: "GET", url: "/api/analytics", label: "Admin-only → 401" },
  { method: "GET", url: "/api/ghost-town", label: "Missing → 404" },
];

function formatSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  return `${(bytes / 1024).toFixed(1)} KB`;
}

// ---------------------------------------------------------------------------
// JSON syntax highlighting (safe: React nodes, no innerHTML)
// ---------------------------------------------------------------------------

const TOKEN_RE =
  /("(?:[^"\\]|\\.)*")(\s*:)?|(-?\b\d+(?:\.\d+)?(?:[eE][+-]?\d+)?\b)|\b(true|false|null)\b|([{}[\],])/g;

function tokenizeJsonLine(line: string): React.ReactNode[] {
  const nodes: React.ReactNode[] = [];
  let last = 0;
  let k = 0;
  let m: RegExpExecArray | null;
  TOKEN_RE.lastIndex = 0;
  while ((m = TOKEN_RE.exec(line))) {
    if (m.index > last) nodes.push(<span key={k++}>{line.slice(last, m.index)}</span>);
    if (m[1] !== undefined) {
      if (m[2] !== undefined) {
        nodes.push(
          <span key={k++} className="text-teal-600 dark:text-teal-400">
            {m[1]}
          </span>,
          <span key={k++} className="text-muted-foreground">
            {m[2]}
          </span>
        );
      } else {
        nodes.push(
          <span key={k++} className="text-emerald-600 dark:text-emerald-300">
            {m[1]}
          </span>
        );
      }
    } else if (m[3] !== undefined) {
      nodes.push(
        <span key={k++} className="text-amber-600 dark:text-amber-400">
          {m[3]}
        </span>
      );
    } else if (m[4] !== undefined) {
      nodes.push(
        <span key={k++} className="font-semibold italic text-rose-600 dark:text-rose-400">
          {m[4]}
        </span>
      );
    } else {
      nodes.push(
        <span key={k++} className="text-muted-foreground">
          {m[5]}
        </span>
      );
    }
    last = TOKEN_RE.lastIndex;
  }
  if (last < line.length) nodes.push(<span key={k++}>{line.slice(last)}</span>);
  return nodes;
}

function JsonBody({ text }: { text: string }) {
  let pretty: string | null = null;
  try {
    pretty = JSON.stringify(JSON.parse(text), null, 2);
  } catch {
    pretty = null;
  }
  if (pretty === null) {
    return (
      <pre className="whitespace-pre-wrap break-all font-mono text-xs leading-relaxed text-muted-foreground">
        {text.slice(0, 4000) || "(empty body)"}
      </pre>
    );
  }
  const lines = pretty.split("\n");
  return (
    <pre className="font-mono text-xs leading-relaxed">
      {lines.map((line, i) => (
        <div key={i} className="flex hover:bg-muted/40">
          <span
            aria-hidden
            className="w-10 shrink-0 select-none pr-4 text-right text-[10px] leading-5 text-muted-foreground/40"
          >
            {i + 1}
          </span>
          <code className="min-w-0 whitespace-pre leading-5">{tokenizeJsonLine(line)}</code>
        </div>
      ))}
    </pre>
  );
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

interface HttpLabProps {
  item: ResourceItemView;
  category: CategoryView;
}

let headerId = 100;

export function HttpLab({ item, category }: HttpLabProps) {
  const { toast } = useToast();
  const hydrated = useLibraryHydrated();
  // Select the stable record reference; derive the array outside the selector.
  const simProgressMap = useLibrary((s) => s.simProgress);
  const completeChallenge = useLibrary((s) => s.completeChallenge);

  const [mode, setMode] = React.useState<"free" | "missions">("free");
  const [method, setMethod] = React.useState<Method>("GET");
  const [url, setUrl] = React.useState("/api/categories");
  const [bodyText, setBodyText] = React.useState("");
  const [headerRows, setHeaderRows] = React.useState<HeaderRow[]>(DEFAULT_HEADERS);
  const [headersOpen, setHeadersOpen] = React.useState(false);
  const [resHeadersOpen, setResHeadersOpen] = React.useState(false);
  const [sending, setSending] = React.useState(false);
  const [exchanges, setExchanges] = React.useState<Exchange[]>([]);
  const [selectedId, setSelectedId] = React.useState<number | null>(null);
  const [activeMission, setActiveMission] = React.useState(0);
  const [showHint, setShowHint] = React.useState(false);

  const exIdRef = React.useRef(0);
  const mission = MISSIONS[activeMission];
  const solvedIds = hydrated ? simProgressMap[item.slug] ?? [] : [];
  const solvedCount = solvedIds.length;

  // Track the view once on mount
  React.useEffect(() => {
    trackEvent("simulator_view", item.slug, item.title);
  }, [item.slug, item.title]);

  const selected =
    exchanges.find((e) => e.id === selectedId) ?? exchanges[0] ?? null;
  const bodyJsonValid = React.useMemo(() => {
    if (!bodyText.trim()) return true;
    try {
      JSON.parse(bodyText);
      return true;
    } catch {
      return false;
    }
  }, [bodyText]);

  // ------------------------------------------------------------------ actions

  const applyPreset = (p: { method: Method; url: string; body?: string }) => {
    setMethod(p.method);
    setUrl(p.url);
    setBodyText(p.body ?? "");
    setHeaderRows(DEFAULT_HEADERS());
    setShowHint(false);
  };

  const selectMission = (index: number) => {
    setActiveMission(index);
    applyPreset(MISSIONS[index].preset);
  };

  const send = async () => {
    const trimmed = url.trim();
    if (!trimmed.startsWith("/") || trimmed.startsWith("//")) {
      toast({
        title: "Same-origin only",
        description: "This lab talks to DevPath's own API — start your path with a single /.",
        variant: "destructive",
      });
      return;
    }
    if (sending) return;
    const hasBody = method === "POST" || method === "PATCH";
    if (hasBody && bodyText.trim() && !bodyJsonValid) {
      toast({
        title: "Body isn't valid JSON",
        description: "Fix the highlighted syntax or clear the body before sending.",
        variant: "destructive",
      });
      return;
    }
    setSending(true);
    const headers: Record<string, string> = {};
    for (const h of headerRows) {
      if (h.enabled && h.key.trim()) headers[h.key.trim()] = h.value.trim();
    }
    const body = hasBody && bodyText.trim() ? bodyText : undefined;
    const t0 = performance.now();
    const commit = (partial: Omit<Exchange, "id" | "at">) => {
      const ex: Exchange = { ...partial, id: ++exIdRef.current, at: Date.now() };
      setExchanges((prev) => [ex, ...prev].slice(0, 30));
      setSelectedId(ex.id);
      // Mission auto-check: solved by the exchange that just landed
      if (mode === "missions") {
        const m = MISSIONS[activeMission];
        if (m && !solvedIds.includes(m.id) && m.verify(ex)) {
          completeChallenge(item.slug, m.id);
          trackEvent("challenge_complete", item.slug, m.id);
          const isLast =
            solvedIds.length + 1 >= MISSIONS.length && activeMission === MISSIONS.length - 1;
          toast({
            title: isLast ? "All missions cleared" : `Mission solved: ${m.title}`,
            description: isLast
              ? "Methods, params and every major status family — you've handled them all for real."
              : m.concept + " — locked in. On to the next one.",
          });
          if (activeMission < MISSIONS.length - 1) {
            window.setTimeout(() => selectMission(activeMission + 1), 900);
          }
        }
      }
    };
    try {
      const res = await fetch(trimmed, { method, headers, body });
      const text = await res.text();
      const ms = Math.round(performance.now() - t0);
      const resHeaders: [string, string][] = [];
      res.headers.forEach((v, k) => resHeaders.push([k, v]));
      const parsed = new URL(trimmed, window.location.origin);
      commit({
        method,
        url: trimmed,
        pathname: parsed.pathname,
        query: parsed.searchParams,
        requestHeaders: headers,
        requestBody: body,
        status: res.status,
        statusText: res.statusText || STATUS_TEXT[res.status] || "",
        responseHeaders: resHeaders,
        bodyText: text,
        ms,
        size: new Blob([text]).size,
      });
    } catch {
      const parsed = new URL(trimmed, window.location.origin);
      commit({
        method,
        url: trimmed,
        pathname: parsed.pathname,
        query: parsed.searchParams,
        requestHeaders: headers,
        requestBody: body,
        status: 0,
        statusText: "Network error",
        responseHeaders: [],
        bodyText: "The request never reached a server — network or CORS failure.",
        ms: Math.round(performance.now() - t0),
        size: 0,
      });
    } finally {
      setSending(false);
    }
  };

  const copyBody = async () => {
    if (!selected) return;
    try {
      await navigator.clipboard.writeText(selected.bodyText);
      toast({ title: "Response copied", description: "The raw body is on your clipboard." });
    } catch {
      toast({ title: "Copy failed", description: "Your browser blocked clipboard access.", variant: "destructive" });
    }
  };

  const labelCls = "text-[11px] font-semibold uppercase tracking-wider text-muted-foreground";

  // -------------------------------------------------------------------- view

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
              <Trophy aria-hidden className={cn("size-4", solvedCount === MISSIONS.length ? "fill-amber-500 text-amber-500" : "text-muted-foreground")} />
              <div className="text-xs">
                <span className="block font-semibold tabular-nums">
                  {solvedCount}/{MISSIONS.length} missions
                </span>
                <span className="text-muted-foreground">{solvedCount === MISSIONS.length ? "All clear!" : "keep going"}</span>
              </div>
            </div>
          )}
        </div>
      </motion.header>

      {/* Mode switch */}
      <div
        role="tablist"
        aria-label="Lab mode"
        className="flex w-full max-w-md gap-1 rounded-xl border bg-muted/50 p-1"
      >
        {(["free", "missions"] as const).map((m) => (
          <button
            key={m}
            role="tab"
            aria-selected={mode === m}
            onClick={() => {
              setMode(m);
              if (m === "missions") selectMission(Math.min(activeMission, MISSIONS.length - 1));
            }}
            className={cn(
              "relative flex-1 rounded-lg px-4 py-2 text-sm font-medium transition-all",
              mode === m
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            {m === "free" ? (
              <span className="inline-flex items-center gap-2">
                <Globe aria-hidden className="size-3.5" /> Free play
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

      {mode === "free" ? (
        <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,400px)_minmax(0,1fr)]">
          <RequestBuilder
            {...{
              method, setMethod, url, setUrl, bodyText, setBodyText, bodyJsonValid,
              headerRows, setHeaderRows, headersOpen, setHeadersOpen,
              sending, send, labelCls, showPresets: true,
            }}
          />
          <div className="space-y-6">
            <ResponseViewer exchange={selected} labelCls={labelCls} resHeadersOpen={resHeadersOpen} setResHeadersOpen={setResHeadersOpen} onCopy={copyBody} />
            <ExchangeTimeline
              exchanges={exchanges}
              selectedId={selected?.id ?? null}
              onSelect={setSelectedId}
              onClear={() => {
                setExchanges([]);
                setSelectedId(null);
              }}
            />
          </div>
        </div>
      ) : (
        <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,340px)_minmax(0,1fr)]">
          {/* Missions sidebar */}
          <div className="space-y-4">
            <div className="rounded-2xl border bg-card p-4">
              <div className="flex items-center justify-between">
                <h2 className="text-sm font-semibold">Guided missions</h2>
                <span className="text-xs tabular-nums text-muted-foreground">
                  {solvedCount}/{MISSIONS.length} solved
                </span>
              </div>
              <ol className="mt-3 space-y-1.5">
                {MISSIONS.map((m, i) => {
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
                                ? "border-teal-500/50 bg-teal-500/15 text-teal-600 dark:text-teal-400"
                                : "border-border bg-muted text-muted-foreground"
                          )}
                        >
                          {solved ? <Check className="size-3.5" /> : i + 1}
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className={cn("block truncate text-sm font-medium", solved && "line-through decoration-muted-foreground/50")}>
                            {m.title}
                          </span>
                          <span className="block truncate font-mono text-[10px] text-muted-foreground">{m.concept}</span>
                        </span>
                      </button>
                    </li>
                  );
                })}
              </ol>
            </div>

            {/* Active mission brief */}
            <div className="rounded-2xl border bg-card p-4">
              <div className="flex items-center gap-2">
                <span aria-hidden className="rounded bg-teal-500/15 px-1.5 py-0.5 font-mono text-[10px] font-semibold text-teal-600 dark:text-teal-400">
                  {mission.concept}
                </span>
                <h3 className="text-sm font-semibold">{mission.title}</h3>
              </div>
              <p className="mt-2 text-xs leading-relaxed text-muted-foreground">{mission.brief}</p>
              <AnimatePresence initial={false}>
                {showHint ? (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    transition={{ duration: 0.2 }}
                    className="overflow-hidden"
                  >
                    <div className="mt-3 flex gap-2.5 rounded-xl border border-amber-500/25 bg-amber-500/10 p-3">
                      <Lightbulb aria-hidden className="mt-0.5 size-4 shrink-0 text-amber-500" />
                      <p className="font-mono text-[11px] leading-relaxed text-amber-700 dark:text-amber-300">
                        {mission.hint}
                      </p>
                    </div>
                  </motion.div>
                ) : null}
              </AnimatePresence>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowHint((v) => !v)}
                className="mt-3 h-7 gap-1.5 text-xs"
              >
                <Lightbulb aria-hidden className="size-3.5" />
                {showHint ? "Hide hint" : "Reveal hint"}
              </Button>
              <p className="mt-3 border-t pt-2.5 text-[11px] leading-relaxed text-muted-foreground">
                Missions are checked automatically against the exchange that lands — no submit
                button, just send the right request.
              </p>
            </div>
          </div>

          <div className="space-y-6">
            <RequestBuilder
              {...{
                method, setMethod, url, setUrl, bodyText, setBodyText, bodyJsonValid,
                headerRows, setHeaderRows, headersOpen, setHeadersOpen,
                sending, send, labelCls, showPresets: false,
              }}
            />
            <ResponseViewer exchange={selected} labelCls={labelCls} resHeadersOpen={resHeadersOpen} setResHeadersOpen={setResHeadersOpen} onCopy={copyBody} />
          </div>
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Request builder
// ---------------------------------------------------------------------------

interface RequestBuilderProps {
  method: Method;
  setMethod: (m: Method) => void;
  url: string;
  setUrl: (u: string) => void;
  bodyText: string;
  setBodyText: (b: string) => void;
  bodyJsonValid: boolean;
  headerRows: HeaderRow[];
  setHeaderRows: React.Dispatch<React.SetStateAction<HeaderRow[]>>;
  headersOpen: boolean;
  setHeadersOpen: (v: boolean) => void;
  sending: boolean;
  send: () => void;
  labelCls: string;
  showPresets: boolean;
}

function RequestBuilder({
  method, setMethod, url, setUrl, bodyText, setBodyText, bodyJsonValid,
  headerRows, setHeaderRows, headersOpen, setHeadersOpen,
  sending, send, labelCls, showPresets,
}: RequestBuilderProps) {
  const hasBody = method === "POST" || method === "PATCH";
  const enabledHeaderCount = headerRows.filter((h) => h.enabled && h.key.trim()).length;

  return (
    <div className="rounded-2xl border bg-card p-4 sm:p-5">
      <div className="flex items-center justify-between">
        <h2 className="flex items-center gap-2 text-sm font-semibold">
          <Send aria-hidden className="size-4 text-teal-500" />
          Request
        </h2>
        <span className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
          same-origin · real API
        </span>
      </div>

      {/* Method segmented control */}
      <div role="radiogroup" aria-label="HTTP method" className="mt-4 grid grid-cols-4 gap-1.5">
        {(["GET", "POST", "PATCH", "DELETE"] as const).map((m) => (
          <button
            key={m}
            role="radio"
            aria-checked={method === m}
            onClick={() => setMethod(m)}
            className={cn(
              "rounded-lg border px-2 py-1.5 font-mono text-xs font-bold tracking-wide transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
              method === m
                ? cn(METHOD_STYLES[m], "shadow-sm")
                : "border-border bg-muted/40 text-muted-foreground hover:bg-muted hover:text-foreground"
            )}
          >
            {m}
          </button>
        ))}
      </div>

      {/* URL + send */}
      <div className="mt-3 flex gap-2">
        <label htmlFor="lab-url" className="sr-only">
          Request path
        </label>
        <input
          id="lab-url"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") send();
          }}
          spellCheck={false}
          autoComplete="off"
          placeholder="/api/categories"
          className="min-w-0 flex-1 rounded-lg border bg-background px-3 py-2 font-mono text-xs shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        />
        <Button
          size="sm"
          onClick={send}
          disabled={sending}
          className="h-9 gap-1.5 bg-teal-600 text-xs font-semibold text-white hover:bg-teal-700"
        >
          {sending ? (
            <>
              <Zap aria-hidden className="size-3.5 animate-pulse" />
              Sending
            </>
          ) : (
            <>
              <Send aria-hidden className="size-3.5" />
              Send
            </>
          )}
        </Button>
      </div>

      {/* Endpoint library */}
      {showPresets && (
        <div className="mt-4">
          <p className={labelCls}>Endpoint library</p>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {PRESETS.map((p) => (
              <button
                key={p.label}
                onClick={() => {
                  setMethod(p.method);
                  setUrl(p.url);
                  setBodyText(p.body ?? "");
                }}
                className="group inline-flex items-center gap-1.5 rounded-full border bg-background px-2.5 py-1 text-[11px] text-muted-foreground transition-all hover:border-teal-500/40 hover:bg-teal-500/10 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <span
                  aria-hidden
                  className={cn(
                    "rounded px-1 py-px font-mono text-[9px] font-bold",
                    METHOD_STYLES[p.method].split(" ").slice(1).join(" ")
                  )}
                >
                  {p.method}
                </span>
                {p.label}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Headers editor */}
      <div className="mt-5 border-t pt-4">
        <button
          onClick={() => setHeadersOpen(!headersOpen)}
          aria-expanded={headersOpen}
          className="flex w-full items-center justify-between rounded text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <span className={cn(labelCls, "flex items-center gap-2")}>
            <Braces aria-hidden className="size-3.5" />
            Headers
            <span className="rounded-full bg-muted px-1.5 text-[10px] tabular-nums">
              {enabledHeaderCount}
            </span>
          </span>
          <ChevronDown aria-hidden className={cn("size-4 transition-transform", headersOpen && "rotate-180")} />
        </button>
        <AnimatePresence initial={false}>
          {headersOpen && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.2 }}
              className="overflow-hidden"
            >
              <div className="mt-3 space-y-2">
                {headerRows.map((h) => (
                  <div key={h.id} className="flex items-center gap-1.5">
                    <button
                      onClick={() =>
                        setHeaderRows((rows) =>
                          rows.map((r) => (r.id === h.id ? { ...r, enabled: !r.enabled } : r))
                        )
                      }
                      aria-label={h.enabled ? `Disable header ${h.key || "untitled"}` : `Enable header ${h.key || "untitled"}`}
                      aria-pressed={h.enabled}
                      className={cn(
                        "flex size-6 shrink-0 items-center justify-center rounded border transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                        h.enabled
                          ? "border-teal-500/50 bg-teal-500/15 text-teal-600 dark:text-teal-400"
                          : "border-border bg-muted text-transparent"
                      )}
                    >
                      <Check aria-hidden className="size-3.5" />
                    </button>
                    <input
                      value={h.key}
                      onChange={(e) =>
                        setHeaderRows((rows) =>
                          rows.map((r) => (r.id === h.id ? { ...r, key: e.target.value } : r))
                        )
                      }
                      placeholder="Header-Name"
                      aria-label="Header name"
                      spellCheck={false}
                      className={cn(
                        "w-[38%] rounded border bg-background px-2 py-1 font-mono text-[11px] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                        h.enabled ? "" : "opacity-50"
                      )}
                    />
                    <input
                      value={h.value}
                      onChange={(e) =>
                        setHeaderRows((rows) =>
                          rows.map((r) => (r.id === h.id ? { ...r, value: e.target.value } : r))
                        )
                      }
                      placeholder="value"
                      aria-label="Header value"
                      spellCheck={false}
                      className={cn(
                        "min-w-0 flex-1 rounded border bg-background px-2 py-1 font-mono text-[11px] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                        h.enabled ? "" : "opacity-50"
                      )}
                    />
                    <button
                      onClick={() => setHeaderRows((rows) => rows.filter((r) => r.id !== h.id))}
                      aria-label={`Remove header ${h.key || "untitled"}`}
                      className="flex size-6 shrink-0 items-center justify-center rounded text-muted-foreground transition-colors hover:bg-rose-500/10 hover:text-rose-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    >
                      <X aria-hidden className="size-3.5" />
                    </button>
                  </div>
                ))}
                <button
                  onClick={() =>
                    setHeaderRows((rows) => [
                      ...rows,
                      { id: ++headerId, key: "", value: "", enabled: true },
                    ])
                  }
                  className="inline-flex items-center gap-1 rounded text-[11px] font-medium text-muted-foreground transition-colors hover:text-teal-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring dark:hover:text-teal-400"
                >
                  <Plus aria-hidden className="size-3.5" />
                  Add header
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Body (POST/PATCH only) */}
      <AnimatePresence initial={false}>
        {hasBody && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="mt-4 border-t pt-4">
              <div className="flex items-center justify-between">
                <p className={labelCls}>Body (JSON)</p>
                <div className="flex items-center gap-2">
                  <span
                    className={cn(
                      "inline-flex items-center gap-1 text-[10px] font-medium",
                      bodyJsonValid
                        ? "text-emerald-600 dark:text-emerald-400"
                        : "text-rose-600 dark:text-rose-400"
                    )}
                  >
                    {bodyJsonValid ? (
                      <>
                        <Check aria-hidden className="size-3" /> valid
                      </>
                    ) : (
                      <>
                        <X aria-hidden className="size-3" /> invalid JSON
                      </>
                    )}
                  </span>
                  <button
                    onClick={() => {
                      try {
                        setBodyText(JSON.stringify(JSON.parse(bodyText), null, 2));
                      } catch {
                        /* leave as-is when unparsable */
                      }
                    }}
                    className="inline-flex items-center gap-1 rounded text-[10px] font-medium text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    <Braces aria-hidden className="size-3" />
                    Format
                  </button>
                </div>
              </div>
              <label htmlFor="lab-body" className="sr-only">
                JSON request body
              </label>
              <textarea
                id="lab-body"
                value={bodyText}
                onChange={(e) => setBodyText(e.target.value)}
                rows={4}
                spellCheck={false}
                placeholder={'{\n  "type": "item_view",\n  "slug": "css-flexbox-simulator"\n}'}
                className={cn(
                  "mt-2 w-full rounded-lg border bg-background px-3 py-2 font-mono text-xs shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                  !bodyJsonValid && "border-rose-500/50"
                )}
              />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Response viewer
// ---------------------------------------------------------------------------

interface ResponseViewerProps {
  exchange: Exchange | null;
  labelCls: string;
  resHeadersOpen: boolean;
  setResHeadersOpen: (v: boolean) => void;
  onCopy: () => void;
}

function ResponseViewer({ exchange, labelCls, resHeadersOpen, setResHeadersOpen, onCopy }: ResponseViewerProps) {
  if (!exchange) {
    return (
      <div className="relative overflow-hidden rounded-2xl border bg-card p-8">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 opacity-50 [background-image:radial-gradient(circle,var(--border)_1px,transparent_1px)] [background-size:18px_18px] [mask-image:radial-gradient(ellipse_70%_80%_at_50%_40%,black,transparent)]"
        />
        <div className="relative flex flex-col items-center gap-3 py-10 text-center">
          <span aria-hidden className="flex size-12 items-center justify-center rounded-2xl border bg-muted/50">
            <Zap className="size-5 text-muted-foreground" />
          </span>
          <div>
            <p className="text-sm font-semibold">No response yet</p>
            <p className="mx-auto mt-1 max-w-sm text-xs leading-relaxed text-muted-foreground">
              Build a request on the left and hit Send — the status line, headers and highlighted
              body of the real response land here.
            </p>
          </div>
        </div>
      </div>
    );
  }

  const s = statusStyle(exchange.status);
  const teach =
    STATUS_TEACH[exchange.status] ??
    (exchange.status === 0
      ? "The request never left the building — check the path and your connection."
      : `A ${Math.floor(exchange.status / 100)}xx response.`);

  return (
    <div className="overflow-hidden rounded-2xl border bg-card">
      {/* Status line */}
      <div className="relative border-b bg-muted/30 p-4 sm:px-5">
        <div
          aria-hidden
          className={cn("absolute inset-x-0 top-0 h-0.5", s.bar)}
        />
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
          <div aria-live="polite" className="flex items-baseline gap-2.5">
            <span className={cn("font-mono text-2xl font-extrabold tabular-nums tracking-tight", s.chip.split(" ").find((c) => c.startsWith("text-")))}>
              {exchange.status === 0 ? "—" : exchange.status}
            </span>
            <span className="text-sm font-semibold text-muted-foreground">{exchange.statusText}</span>
          </div>
          <span className={cn("rounded-full border px-2.5 py-0.5 text-[11px] font-semibold", s.chip)}>
            {s.label}
          </span>
          <span className="ml-auto flex items-center gap-3 font-mono text-[11px] text-muted-foreground">
            <span className="tabular-nums">{exchange.ms} ms</span>
            <span className="tabular-nums">{formatSize(exchange.size)}</span>
          </span>
        </div>
        {/* Request echo */}
        <div className="mt-2.5 flex items-center gap-2">
          <span
            aria-hidden
            className={cn("rounded border px-1.5 py-px font-mono text-[10px] font-bold", METHOD_STYLES[exchange.method])}
          >
            {exchange.method}
          </span>
          <code className="min-w-0 truncate font-mono text-[11px] text-muted-foreground">
            {exchange.url}
          </code>
        </div>
      </div>

      {/* Teaching line — left-accent callout */}
      <div className="border-b border-l-2 border-l-teal-500/50 bg-teal-500/[0.04] py-2.5 pl-3.5 pr-4 sm:pl-4 sm:pr-5">
        <p className="text-xs leading-relaxed text-muted-foreground">
          <span className="font-semibold text-teal-600 dark:text-teal-400">What this means: </span>
          {teach}
        </p>
      </div>

      {/* Response headers */}
      <div className="border-b">
        <button
          onClick={() => setResHeadersOpen(!resHeadersOpen)}
          aria-expanded={resHeadersOpen}
          className="flex w-full items-center justify-between px-4 py-2.5 text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring sm:px-5"
        >
          <span className={cn(labelCls, "flex items-center gap-2")}>
            <Braces aria-hidden className="size-3.5" />
            Response headers
            <span className="rounded-full bg-muted px-1.5 text-[10px] tabular-nums">
              {exchange.responseHeaders.length}
            </span>
          </span>
          <ChevronDown aria-hidden className={cn("size-4 transition-transform", resHeadersOpen && "rotate-180")} />
        </button>
        <AnimatePresence initial={false}>
          {resHeadersOpen && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.2 }}
              className="overflow-hidden"
            >
              <dl className="max-h-44 space-y-1 overflow-y-auto px-4 pb-3 sm:px-5">
                {exchange.responseHeaders.map(([k, v]) => (
                  <div key={k} className="flex gap-3 font-mono text-[11px] leading-relaxed">
                    <dt className="w-40 shrink-0 truncate text-teal-600 dark:text-teal-400">{k}</dt>
                    <dd className="min-w-0 break-all text-muted-foreground">{v}</dd>
                  </div>
                ))}
              </dl>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Body */}
      <div className="p-4 sm:p-5">
        <div className="flex items-center justify-between">
          <p className={labelCls}>Body</p>
          <Button
            variant="ghost"
            size="sm"
            onClick={onCopy}
            className="h-7 gap-1.5 px-2 text-xs text-muted-foreground"
          >
            <Copy aria-hidden className="size-3.5" />
            Copy
          </Button>
        </div>
        <div className="mt-2 max-h-96 overflow-auto rounded-xl border bg-muted/20 p-3">
          <JsonBody text={exchange.bodyText} />
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Exchange timeline
// ---------------------------------------------------------------------------

interface ExchangeTimelineProps {
  exchanges: Exchange[];
  selectedId: number | null;
  onSelect: (id: number) => void;
  onClear: () => void;
}

function ExchangeTimeline({ exchanges, selectedId, onSelect, onClear }: ExchangeTimelineProps) {
  return (
    <div className="rounded-2xl border bg-card p-4 sm:p-5">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold">Exchange timeline</h2>
        {exchanges.length > 0 && (
          <Button
            variant="ghost"
            size="sm"
            onClick={onClear}
            className="h-7 gap-1.5 px-2 text-xs text-muted-foreground hover:text-rose-600 dark:hover:text-rose-400"
          >
            <Trash2 aria-hidden className="size-3.5" />
            Clear
          </Button>
        )}
      </div>
      {exchanges.length === 0 ? (
        <p className="py-6 text-center text-xs text-muted-foreground">
          Your request history will appear here — every exchange is kept for study.
        </p>
      ) : (
        <ol className="mt-3 max-h-72 space-y-1.5 overflow-y-auto pr-1">
          {exchanges.map((ex, i) => {
            const s = statusStyle(ex.status);
            const selected = ex.id === selectedId;
            return (
              <li key={ex.id}>
                <button
                  onClick={() => onSelect(ex.id)}
                  aria-current={selected ? "true" : undefined}
                  className={cn(
                    "flex w-full items-center gap-2.5 rounded-xl border px-3 py-2 text-left transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                    selected
                      ? "border-teal-500/50 bg-teal-500/10"
                      : "border-transparent bg-muted/30 hover:border-border hover:bg-muted/60"
                  )}
                >
                  <span className="w-6 shrink-0 text-center font-mono text-[10px] tabular-nums text-muted-foreground/60">
                    #{exchanges.length - i}
                  </span>
                  <span
                    aria-hidden
                    className={cn("shrink-0 rounded border px-1.5 py-px font-mono text-[10px] font-bold", METHOD_STYLES[ex.method])}
                  >
                    {ex.method}
                  </span>
                  <code className="min-w-0 flex-1 truncate font-mono text-[11px] text-muted-foreground">
                    {ex.pathname}
                    {ex.query.toString() && (
                      <span className="text-muted-foreground/50">?{ex.query.toString()}</span>
                    )}
                  </code>
                  <span className={cn("shrink-0 rounded-full border px-1.5 py-px font-mono text-[10px] font-bold tabular-nums", s.chip)}>
                    {ex.status === 0 ? "ERR" : ex.status}
                  </span>
                  <span className="w-12 shrink-0 text-right font-mono text-[10px] tabular-nums text-muted-foreground/60">
                    {ex.ms}ms
                  </span>
                </button>
              </li>
            );
          })}
        </ol>
      )}
    </div>
  );
}
