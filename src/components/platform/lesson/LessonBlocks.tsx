"use client";

// Lesson content block renderer.
// Every lesson body is stored as structured JSON blocks (see
// src/lib/course-types.ts) and rendered here through REUSABLE components —
// Callout, CodeBlock, Diagram, KeyTakeaways, InterviewQuestion, table, list.
// Content never lives inside JSX: this renderer maps data → components.
import * as React from "react";
import Link from "next/link";
import { Braces, Check, ChevronDown, Copy, Database, HelpCircle, Info, Lightbulb, Play, TriangleAlert } from "lucide-react";
import type { ContentBlock } from "@/lib/course-types";

// ---------------------------------------------------------------------------
// Inline markdown-lite: **bold**, `code`, *italic*

export function renderInline(text: string, keyPrefix = "i"): React.ReactNode[] {
  const nodes: React.ReactNode[] = [];
  // token order matters: code first so ** inside `..` stays literal
  const pattern = /(`[^`]+`)|(\*\*[^*]+\*\*)|(\*[^*]+\*)/g;
  let last = 0;
  let match: RegExpExecArray | null;
  let n = 0;
  while ((match = pattern.exec(text)) !== null) {
    if (match.index > last) nodes.push(text.slice(last, match.index));
    const token = match[0];
    const key = `${keyPrefix}-${n++}`;
    if (token.startsWith("`")) {
      nodes.push(
        <code
          key={key}
          className="rounded-sm border border-border bg-muted px-1.5 py-0.5 font-mono text-[0.85em] font-medium text-foreground"
        >
          {token.slice(1, -1)}
        </code>
      );
    } else if (token.startsWith("**")) {
      nodes.push(
        <strong key={key} className="font-semibold text-foreground">
          {token.slice(2, -2)}
        </strong>
      );
    } else {
      nodes.push(
        <em key={key} className="italic">
          {token.slice(1, -1)}
        </em>
      );
    }
    last = match.index + token.length;
  }
  if (last < text.length) nodes.push(text.slice(last));
  return nodes;
}

// ---------------------------------------------------------------------------
// Minimal safe syntax highlighting (React nodes, no innerHTML) —
// comments, strings, numbers, keywords, types, punctuation per language.

const KEYWORDS: Record<string, string[]> = {
  ts: [
    "const", "let", "var", "function", "return", "if", "else", "for", "while",
    "switch", "case", "default", "break", "continue", "new", "class", "extends",
    "implements", "interface", "type", "enum", "import", "from", "export",
    "as", "of", "in", "typeof", "instanceof", "keyof", "never", "unknown",
    "any", "string", "number", "boolean", "object", "symbol", "bigint", "void",
    "readonly", "public", "private", "protected", "static", "async", "await",
    "this", "super", "try", "catch", "finally", "throw", "yield", "declare",
    "satisfies", "infer", "is", "abstract", "get", "set", "true", "false", "null", "undefined",
  ],
  js: ["const", "let", "var", "function", "return", "if", "else", "for", "while", "class", "extends", "new", "import", "export", "from", "as", "of", "in", "typeof", "instanceof", "async", "await", "this", "try", "catch", "finally", "throw", "true", "false", "null", "undefined"],
  bash: ["if", "then", "else", "fi", "for", "do", "done", "while", "case", "esac", "function", "echo", "export", "cd", "mkdir", "npm", "npx", "bun", "git", "curl"],
  json: ["true", "false", "null"],
  sql: ["SELECT", "FROM", "WHERE", "JOIN", "LEFT", "RIGHT", "INNER", "OUTER", "ON", "GROUP", "BY", "ORDER", "HAVING", "LIMIT", "OFFSET", "AS", "AND", "OR", "NOT", "NULL", "IS", "IN", "LIKE", "BETWEEN", "DISTINCT", "INSERT", "INTO", "VALUES", "UPDATE", "SET", "DELETE", "CREATE", "TABLE", "INDEX", "PRIMARY", "KEY", "FOREIGN", "REFERENCES", "UNION", "ALL", "EXISTS", "CASE", "WHEN", "THEN", "END", "COUNT", "SUM", "AVG", "MIN", "MAX"],
  css: [],
};

interface Tok { text: string; cls: string }

export function tokenizeLine(line: string, lang: string): Tok[] {
  const toks: Tok[] = [];
  const kw = KEYWORDS[lang] ?? KEYWORDS.ts;
  const kwSet = new Set(kw.map((k) => k.toLowerCase()));
  const isSql = lang === "sql";
  const commentToken = "--";

  let rest = line;
  let buffer = "";

  const flush = () => {
    if (!buffer) return;
    // split the buffer into words/punctuation
    const pattern = /([A-Za-z_$][A-Za-z0-9_$]*)|(\d+(?:\.\d+)?)|(\s+)|([^\sA-Za-z0-9_$]+)/g;
    let m: RegExpExecArray | null;
    while ((m = pattern.exec(buffer)) !== null) {
      const t = m[0];
      if (m[1]) {
        const lower = t.toLowerCase();
        if (kwSet.has(lower)) toks.push({ text: t, cls: "text-rose-600 dark:text-rose-400" });
        else if (/^[A-Z]/.test(t)) toks.push({ text: t, cls: "text-amber-600 dark:text-amber-300" });
        else toks.push({ text: t, cls: "" });
      } else if (m[2]) toks.push({ text: t, cls: "text-orange-600 dark:text-orange-400" });
      else if (m[4]) toks.push({ text: t, cls: "text-zinc-500 dark:text-zinc-400" });
      else toks.push({ text: t, cls: "" });
    }
    buffer = "";
  };

  let i = 0;
  while (i < rest.length) {
    const ch = rest[i];
    // comments (// for code languages, -- for sql)
    if (!isSql && rest.startsWith("//", i)) {
      flush();
      toks.push({ text: rest.slice(i), cls: "text-zinc-500 dark:text-zinc-500 italic" });
      return toks;
    }
    if (rest.startsWith(commentToken, i) && (isSql || lang === "bash" || lang === "yaml")) {
      flush();
      toks.push({ text: rest.slice(i), cls: "text-zinc-500 dark:text-zinc-500 italic" });
      return toks;
    }
    // # comments for bash/yaml
    if ((lang === "bash" || lang === "yaml") && ch === "#") {
      flush();
      toks.push({ text: rest.slice(i), cls: "text-zinc-500 dark:text-zinc-500 italic" });
      return toks;
    }
    // strings
    if (ch === '"' || ch === "'" || ch === "`") {
      const end = rest.indexOf(ch, i + 1);
      const seg = end === -1 ? rest.slice(i) : rest.slice(i, end + 1);
      flush();
      toks.push({ text: seg, cls: "text-emerald-600 dark:text-emerald-400" });
      if (end === -1) return toks;
      rest = rest.slice(end + 1);
      i = 0;
      continue;
    }
    buffer += ch;
    i++;
  }
  flush();
  return toks;
}

// ---------------------------------------------------------------------------
// CodeBlock — language chip, line numbers, optional highlighted lines, copy

export function CodeBlock({ code, lang, caption, highlight }: {
  code: string; lang: string; caption?: string; highlight?: number[];
}) {
  const [copied, setCopied] = React.useState(false);
  const hl = new Set(highlight ?? []);
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 1600);
    } catch { /* clipboard unavailable */ }
  };
  return (
    <figure className="group/code my-5 overflow-hidden rounded-xl border border-border bg-zinc-950 dark:bg-black/60">
      <div className="flex items-center justify-between border-b border-zinc-800 px-4 py-2">
        <div className="flex items-center gap-2">
          <span className="flex gap-1.5" aria-hidden="true">
            <span className="h-2.5 w-2.5 rounded-full bg-rose-500/70" />
            <span className="h-2.5 w-2.5 rounded-full bg-amber-500/70" />
            <span className="h-2.5 w-2.5 rounded-full bg-emerald-500/70" />
          </span>
          <span className="ml-2 font-mono text-[11px] font-medium uppercase tracking-wider text-zinc-500">
            {lang}
          </span>
        </div>
        <button
          type="button"
          onClick={copy}
          className="rounded-md px-2 py-1 text-[11px] font-medium text-zinc-500 transition-colors hover:bg-zinc-800 hover:text-zinc-200 focus-visible:outline focus-visible:outline-2 focus-visible:outline-teal-500"
          aria-label="Copy code to clipboard"
        >
          {copied ? "Copied ✓" : "Copy"}
        </button>
      </div>
      <div className="overflow-x-auto p-4 text-[13px] leading-relaxed">
        <pre className="font-mono text-zinc-100">
          <code>
            {code.split("\n").map((line, idx) => {
              const lineNo = idx + 1;
              const isHl = hl.has(lineNo);
              return (
                <span
                  key={idx}
                  className={`block border-l-2 pl-3 ${
                    isHl
                      ? "border-teal-400 bg-teal-500/10 -ml-3 pl-3.5 pr-2"
                      : "border-transparent"
                  }`}
                >
                  <span className="mr-4 inline-block w-6 select-none text-right text-zinc-600" aria-hidden="true">
                    {lineNo}
                  </span>
                  {tokenizeLine(line, lang).map((t, j) => (
                    <span key={j} className={t.cls}>{t.text}</span>
                  ))}
                  {line === "" ? " " : null}
                </span>
              );
            })}
          </code>
        </pre>
      </div>
      {caption ? (
        <figcaption className="border-t border-zinc-800 px-4 py-2 text-xs text-zinc-500">
          {renderInline(caption, "cap")}
        </figcaption>
      ) : null}
    </figure>
  );
}

// ---------------------------------------------------------------------------
// Callout

const CALLOUT_STYLES = {
  info: {
    wrap: "border-teal-500/30 bg-teal-500/[0.06]",
    icon: "text-teal-600 dark:text-teal-400",
    title: "text-teal-700 dark:text-teal-300",
    Icon: Info,
  },
  tip: {
    wrap: "border-emerald-500/30 bg-emerald-500/[0.06]",
    icon: "text-emerald-600 dark:text-emerald-400",
    title: "text-emerald-700 dark:text-emerald-300",
    Icon: Lightbulb,
  },
  warn: {
    wrap: "border-amber-500/30 bg-amber-500/[0.06]",
    icon: "text-amber-600 dark:text-amber-400",
    title: "text-amber-700 dark:text-amber-300",
    Icon: TriangleAlert,
  },
  danger: {
    wrap: "border-rose-500/30 bg-rose-500/[0.06]",
    icon: "text-rose-600 dark:text-rose-400",
    title: "text-rose-700 dark:text-rose-300",
    Icon: TriangleAlert,
  },
} as const;

export function Callout({ variant, title, text }: {
  variant: "info" | "tip" | "warn" | "danger"; title?: string; text: string;
}) {
  const s = CALLOUT_STYLES[variant];
  const Icon = s.Icon;
  return (
    <aside className={`my-5 rounded-xl border ${s.wrap} p-4 sm:p-5`}>
      <div className="flex gap-3">
        <Icon className={`mt-0.5 h-5 w-5 shrink-0 ${s.icon}`} aria-hidden="true" />
        <div>
          {title ? (
            <p className={`mb-1 text-sm font-semibold ${s.title}`}>{title}</p>
          ) : null}
          <p className="text-sm leading-relaxed text-foreground/90">
            {renderInline(text, "co")}
          </p>
        </div>
      </div>
    </aside>
  );
}

// ---------------------------------------------------------------------------
// Diagram — vertical flow with arrows (Client → Gateway → Service …)

export function Diagram({ nodes, caption }: { nodes: string[]; caption?: string }) {
  return (
    <figure className="my-6 rounded-xl border border-border bg-muted/40 p-5">
      <div className="mx-auto flex max-w-xs flex-col items-center gap-0" role="img" aria-label={caption ?? "Flow diagram"}>
        {nodes.map((node, i) => (
          <React.Fragment key={i}>
            <div className="w-full rounded-lg border border-border bg-background px-4 py-2.5 text-center font-mono text-[13px] font-medium text-foreground shadow-sm">
              {node}
            </div>
            {i < nodes.length - 1 ? (
              <div className="flex flex-col items-center py-1" aria-hidden="true">
                <span className="h-3 w-px bg-gradient-to-b from-transparent via-teal-500/60 to-teal-500/60" />
                <span className="text-[10px] text-teal-500">▼</span>
              </div>
            ) : null}
          </React.Fragment>
        ))}
      </div>
      {caption ? (
        <figcaption className="mt-4 text-center text-xs text-muted-foreground">
          {renderInline(caption, "dc")}
        </figcaption>
      ) : null}
    </figure>
  );
}

// ---------------------------------------------------------------------------
// KeyTakeaways

export function KeyTakeaways({ items, title }: { items: string[]; title?: string }) {
  return (
    <section className="my-6 rounded-xl border border-emerald-500/25 bg-gradient-to-br from-emerald-500/[0.07] via-transparent to-transparent p-5 sm:p-6" aria-label={title ?? "Key takeaways"}>
      <p className="mb-3 flex items-center gap-2 text-sm font-semibold text-emerald-700 dark:text-emerald-300">
        <Check className="h-4 w-4" aria-hidden="true" />
        {title ?? "Key takeaways"}
      </p>
      <ul className="space-y-2.5">
        {items.map((item, i) => (
          <li key={i} className="flex gap-2.5 text-sm leading-relaxed text-foreground/90">
            <Check className="mt-0.5 h-4 w-4 shrink-0 text-emerald-500/70" aria-hidden="true" />
            <span>{renderInline(item, `kt-${i}`)}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}

// ---------------------------------------------------------------------------
// InterviewQuestion — expandable Q&A

export function InterviewQuestion({ q, a }: { q: string; a: string }) {
  const [open, setOpen] = React.useState(false);
  return (
    <div className="my-4 overflow-hidden rounded-xl border border-border">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center gap-3 px-4 py-3.5 text-left transition-colors hover:bg-muted/50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-teal-500"
        aria-expanded={open}
      >
        <HelpCircle className="h-4 w-4 shrink-0 text-violet-500/80" aria-hidden="true" />
        <span className="flex-1 text-sm font-medium text-foreground">{q}</span>
        <ChevronDown
          className={`h-4 w-4 shrink-0 text-muted-foreground transition-transform ${open ? "rotate-180" : ""}`}
          aria-hidden="true"
        />
      </button>
      {open ? (
        <div className="border-t border-border bg-muted/30 px-4 py-4">
          <p className="text-sm leading-relaxed text-foreground/90">{renderInline(a, "iq")}</p>
        </div>
      ) : null}
    </div>
  );
}

// ---------------------------------------------------------------------------
// PracticeCard — a runnable snippet handed to a live sandbox. The deep-link
// pre-fills the target sandbox editor with the snippet (SQL Query Sandbox or
// JavaScript Playground, chosen by the block's `sim`).

export function practiceHref(query: string, sim?: string): string {
  const target = sim === "js-playground" ? "js-playground" : "sql-query-sandbox";
  return `/?view=simulator&sim=${target}&q=${encodeURIComponent(query)}`;
}

export function PracticeCard({ query, note, title, sim }: { query: string; note?: string; title?: string; sim?: string }) {
  const isJs = sim === "js-playground";
  const lang = isJs ? "js" : "sql";
  const [copied, setCopied] = React.useState(false);
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(query);
      setCopied(true);
      setTimeout(() => setCopied(false), 1600);
    } catch { /* clipboard unavailable */ }
  };
  return (
    <aside className="my-6 overflow-hidden rounded-xl border border-teal-500/35 bg-gradient-to-br from-teal-500/[0.08] via-transparent to-transparent">
      <div className="flex items-center gap-2.5 border-b border-teal-500/20 bg-teal-500/[0.06] px-4 py-2.5">
        {isJs ? (
          <Braces className="h-4 w-4 shrink-0 text-teal-600 dark:text-teal-400" aria-hidden="true" />
        ) : (
          <Database className="h-4 w-4 shrink-0 text-teal-600 dark:text-teal-400" aria-hidden="true" />
        )}
        <span className="text-[11px] font-semibold uppercase tracking-wider text-teal-700 dark:text-teal-300">
          {title ?? "Practice"}
        </span>
        <span className="hidden text-xs text-muted-foreground sm:inline">
          {isJs ? "run it live in the JavaScript Playground" : "run it live in the SQL Query Sandbox"}
        </span>
      </div>
      <div className="overflow-x-auto bg-zinc-950 px-4 py-3 dark:bg-black/50">
        <pre className="font-mono text-[12.5px] leading-relaxed text-zinc-100">
          {query.split("\n").map((line, li) => (
            <React.Fragment key={li}>
              {tokenizeLine(line, lang).map((t, j) => (
                <span key={j} className={t.cls}>{t.text}</span>
              ))}
              {li < query.split("\n").length - 1 ? "\n" : null}
            </React.Fragment>
          ))}
        </pre>
      </div>
      {note ? (
        <p className="border-b border-teal-500/15 px-4 py-2.5 text-xs leading-relaxed text-foreground/80">
          {renderInline(note, "pn")}
        </p>
      ) : null}
      <div className="flex flex-wrap items-center gap-2 px-4 py-3">
        <Link
          href={practiceHref(query, sim)}
          className="inline-flex items-center gap-1.5 rounded-lg bg-teal-600 px-3.5 py-2 text-xs font-semibold text-white shadow-sm transition-all hover:bg-teal-500 hover:shadow focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-500 active:scale-[0.98]"
        >
          <Play className="h-3.5 w-3.5" aria-hidden="true" />
          {isJs ? "Open in playground" : "Open in sandbox"}
        </Link>
        <button
          type="button"
          onClick={copy}
          className="inline-flex items-center gap-1.5 rounded-lg border border-border px-3 py-2 text-xs font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline focus-visible:outline-2 focus-visible:outline-teal-500"
          aria-label={isJs ? "Copy snippet to clipboard" : "Copy query to clipboard"}
        >
          {copied ? <Check className="h-3.5 w-3.5" aria-hidden="true" /> : <Copy className="h-3.5 w-3.5" aria-hidden="true" />}
          {copied ? "Copied ✓" : isJs ? "Copy snippet" : "Copy query"}
        </button>
      </div>
    </aside>
  );
}

// ---------------------------------------------------------------------------
// The block dispatcher

export function LessonBlocks({ blocks }: { blocks: ContentBlock[] }) {
  return (
    <div className="course-prose">
      {blocks.map((b, i) => {
        switch (b.t) {
          case "h":
            return (
              <h3
                key={i}
                className="mb-3 mt-8 flex items-center gap-3 text-lg font-semibold text-foreground"
              >
                <span className="h-5 w-1 rounded-full bg-teal-500/70" aria-hidden="true" />
                {renderInline(b.text, `h-${i}`)}
              </h3>
            );
          case "p":
            return (
              <p key={i} className="my-4 text-[15px] leading-[1.75] text-foreground/90">
                {renderInline(b.text, `p-${i}`)}
              </p>
            );
          case "list":
            return b.ordered ? (
              <ol key={i} className="my-4 space-y-2.5 pl-1">
                {b.items.map((item, j) => (
                  <li key={j} className="flex gap-3 text-[15px] leading-relaxed text-foreground/90">
                    <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-teal-500/15 font-mono text-[11px] font-semibold text-teal-600 dark:text-teal-400" aria-hidden="true">
                      {j + 1}
                    </span>
                    <span>{renderInline(item, `li-${i}-${j}`)}</span>
                  </li>
                ))}
              </ol>
            ) : (
              <ul key={i} className="my-4 space-y-2.5">
                {b.items.map((item, j) => (
                  <li key={j} className="flex gap-3 text-[15px] leading-relaxed text-foreground/90">
                    <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-teal-500/70" aria-hidden="true" />
                    <span>{renderInline(item, `li-${i}-${j}`)}</span>
                  </li>
                ))}
              </ul>
            );
          case "callout":
            return <Callout key={i} variant={b.variant} title={b.title} text={b.text} />;
          case "code":
            return (
              <CodeBlock
                key={i}
                code={b.code}
                lang={b.lang}
                caption={b.caption}
                highlight={b.highlight}
              />
            );
          case "table":
            return (
              <div key={i} className="my-5 overflow-x-auto rounded-xl border border-border">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border bg-muted/50">
                      {b.headers.map((h, j) => (
                        <th key={j} className="px-4 py-2.5 text-left font-semibold text-foreground">
                          {renderInline(h, `th-${i}-${j}`)}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {b.rows.map((row, j) => (
                      <tr key={j} className="border-b border-border/50 last:border-0">
                        {row.map((cell, k) => (
                          <td key={k} className="px-4 py-2.5 align-top text-foreground/85">
                            {renderInline(cell, `td-${i}-${j}-${k}`)}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            );
          case "diagram":
            return <Diagram key={i} nodes={b.nodes} caption={b.caption} />;
          case "keytakeaways":
            return <KeyTakeaways key={i} items={b.items} title={b.title} />;
          case "interview":
            return <InterviewQuestion key={i} q={b.q} a={b.a} />;
          case "practice":
            return <PracticeCard key={i} query={b.query} note={b.note} title={b.title} sim={b.sim} />;
          default:
            return null;
        }
      })}
    </div>
  );
}
