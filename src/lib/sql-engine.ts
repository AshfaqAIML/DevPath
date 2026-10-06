// ---------------------------------------------------------------------------
// sql-engine.ts — a self-contained, dependency-free SQL SELECT engine.
//
// Powers the SQL Query Sandbox simulator. It tokenizes, parses and executes a
// practical teaching subset of SQL entirely in the browser (no server, no
// WASM download):
//
//   SELECT [DISTINCT] items FROM table [AS alias]
//          [ [INNER | LEFT [OUTER]] JOIN table [AS alias] ON expr ]*
//          [ WHERE expr ]
//          [ GROUP BY expr, … ] [ HAVING expr ]
//          [ ORDER BY expr | n | alias [ASC | DESC], … ]
//          [ LIMIT n [OFFSET m] ]
//
// Expressions: AND/OR/NOT, comparisons (=, !=, <>, <, >, <=, >=), IS [NOT]
// NULL, [NOT] LIKE, [NOT] IN (…), [NOT] BETWEEN, + - * / arithmetic, string
// and number literals, qualified column refs (t.col), aggregates COUNT(*),
// COUNT(col), SUM, AVG, MIN, MAX, parentheses and -- comments.
//
// Errors are teaching moments: every failure carries a friendly message, the
// character position and (where possible) a did-you-mean suggestion.
// ---------------------------------------------------------------------------

export type SqlValue = string | number | null;

export type SqlColumnType = "INTEGER" | "TEXT" | "REAL";

export interface SqlColumn {
  name: string;
  type: SqlColumnType;
}

export interface SqlTable {
  name: string;
  columns: SqlColumn[];
  rows: SqlValue[][];
}

export interface SqlDatabase {
  tables: SqlTable[];
}

export interface SqlResultSet {
  columns: string[];
  rows: SqlValue[][];
}

/** Distinguished error with a character position + teaching hint. */
export class SqlError extends Error {
  hint?: string;
  pos?: number;

  constructor(message: string, opts?: { hint?: string; pos?: number }) {
    super(message);
    this.name = "SqlError";
    this.hint = opts?.hint;
    this.pos = opts?.pos;
  }
}

// ------------------------------------------------------------------ tokenizer

type TokType = "kw" | "ident" | "num" | "str" | "op" | "eof";

interface Tok {
  t: TokType;
  v: string;
  pos: number;
  end: number;
}

const KEYWORDS = new Set([
  "SELECT", "DISTINCT", "AS", "FROM", "WHERE", "AND", "OR", "NOT", "NULL",
  "IS", "LIKE", "IN", "BETWEEN", "JOIN", "INNER", "LEFT", "OUTER", "ON",
  "GROUP", "BY", "HAVING", "ORDER", "ASC", "DESC", "LIMIT", "OFFSET",
  "TRUE", "FALSE", "COUNT", "SUM", "AVG", "MIN", "MAX",
]);

const OPERATORS = ["<=", ">=", "<>", "!=", "=", "<", ">", "(", ")", ",", ".", "*", ";", "+", "-", "/"];

function tokenize(sql: string): Tok[] {
  const toks: Tok[] = [];
  let i = 0;
  const n = sql.length;
  while (i < n) {
    const ch = sql[i];
    if (ch === " " || ch === "\t" || ch === "\n" || ch === "\r") {
      i++;
      continue;
    }
    // -- line comment
    if (ch === "-" && sql[i + 1] === "-") {
      while (i < n && sql[i] !== "\n") i++;
      continue;
    }
    const start = i;
    // string literal (single quotes, '' escapes a quote)
    if (ch === "'") {
      i++;
      let value = "";
      let closed = false;
      while (i < n) {
        if (sql[i] === "'") {
          if (sql[i + 1] === "'") {
            value += "'";
            i += 2;
          } else {
            i++;
            closed = true;
            break;
          }
        } else {
          value += sql[i];
          i++;
        }
      }
      if (!closed) {
        throw new SqlError("Unterminated string literal — the closing ' is missing.", {
          hint: "In SQL every string is wrapped in single quotes: WHERE role = 'frontend'",
          pos: start,
        });
      }
      toks.push({ t: "str", v: value, pos: start, end: i });
      continue;
    }
    // quoted identifier ("name" or `name`)
    if (ch === '"' || ch === "`") {
      const quote = ch;
      i++;
      let value = "";
      while (i < n && sql[i] !== quote) {
        value += sql[i];
        i++;
      }
      if (i >= n) {
        throw new SqlError(`Unterminated quoted identifier — the closing ${quote} is missing.`, { pos: start });
      }
      i++;
      toks.push({ t: "ident", v: value, pos: start, end: i });
      continue;
    }
    // number
    if (/[0-9]/.test(ch)) {
      let value = "";
      while (i < n && /[0-9.]/.test(sql[i])) {
        value += sql[i];
        i++;
      }
      toks.push({ t: "num", v: value, pos: start, end: i });
      continue;
    }
    // identifier / keyword (keywords normalized to upper case; identifiers
    // keep their original spelling for output labels)
    if (/[A-Za-z_]/.test(ch)) {
      let value = "";
      while (i < n && /[A-Za-z0-9_]/.test(sql[i])) {
        value += sql[i];
        i++;
      }
      const upper = value.toUpperCase();
      const isKeyword = KEYWORDS.has(upper);
      toks.push({
        t: isKeyword ? "kw" : "ident",
        v: isKeyword ? upper : value,
        pos: start,
        end: i,
      });
      continue;
    }
    // operators / punctuation
    const two = sql.slice(i, i + 2);
    const foundTwo = OPERATORS.find((o) => o.length === 2 && o === two);
    if (foundTwo) {
      toks.push({ t: "op", v: foundTwo, pos: i, end: i + 2 });
      i += 2;
      continue;
    }
    const foundOne = OPERATORS.find((o) => o.length === 1 && o === ch);
    if (foundOne) {
      toks.push({ t: "op", v: foundOne, pos: i, end: i + 1 });
      i++;
      continue;
    }
    throw new SqlError(`Unexpected character '${ch}'.`, {
      hint: "SQL is picky about symbols — double-check quotes, commas and operators.",
      pos: i,
    });
  }
  toks.push({ t: "eof", v: "", pos: n, end: n });
  return toks;
}

// ------------------------------------------------------------------ AST types

type Expr =
  | { k: "lit"; v: SqlValue; text: string }
  | { k: "col"; table?: string; name: string; text: string }
  | { k: "agg"; fn: "COUNT" | "SUM" | "AVG" | "MIN" | "MAX"; arg: Expr | null; text: string }
  | { k: "bin"; op: string; l: Expr; r: Expr; text: string }
  | { k: "un"; op: "NOT" | "NEG" | "POS"; e: Expr; text: string }
  | { k: "in"; e: Expr; list: Expr[]; neg: boolean; text: string }
  | { k: "isnull"; e: Expr; neg: boolean; text: string }
  | { k: "like"; e: Expr; pat: Expr; neg: boolean; text: string }
  | { k: "between"; e: Expr; lo: Expr; hi: Expr; neg: boolean; text: string }
  | { k: "star"; table?: string; text: string };

interface SelectItem {
  expr: Expr;
  alias?: string;
  text: string;
}

interface TableRef {
  name: string;
  alias: string;
}

interface JoinClause {
  kind: "INNER" | "LEFT";
  table: TableRef;
  on: Expr;
}

interface OrderItem {
  expr: Expr | { k: "pos"; n: number };
  desc: boolean;
}

interface SelectQuery {
  distinct: boolean;
  items: SelectItem[];
  from: TableRef;
  joins: JoinClause[];
  where?: Expr;
  groupBy: Expr[];
  having?: Expr;
  orderBy: OrderItem[];
  limit?: number;
  offset?: number;
}

// --------------------------------------------------------------------- parser

class Parser {
  private toks: Tok[];
  private idx = 0;
  private sql: string;

  constructor(sql: string, toks: Tok[]) {
    this.sql = sql;
    this.toks = toks;
  }

  private peek(): Tok {
    return this.toks[this.idx];
  }

  private next(): Tok {
    const t = this.toks[this.idx];
    if (t.t !== "eof") this.idx++;
    return t;
  }

  private isKw(word: string): boolean {
    const t = this.peek();
    return t.t === "kw" && t.v === word;
  }

  private isOp(op: string): boolean {
    const t = this.peek();
    return t.t === "op" && t.v === op;
  }

  private eatKw(word: string): Tok {
    if (!this.isKw(word)) {
      const t = this.peek();
      throw new SqlError(`Expected ${word} but found ${t.t === "eof" ? "the end of the query" : `'${t.v}'`}.`, {
        pos: t.pos,
      });
    }
    return this.next();
  }

  private eatOp(op: string): Tok {
    if (!this.isOp(op)) {
      const t = this.peek();
      throw new SqlError(`Expected '${op}' but found ${t.t === "eof" ? "the end of the query" : `'${t.v}'`}.`, {
        pos: t.pos,
      });
    }
    return this.next();
  }

  /** Text span of the tokens between two parser positions. */
  private textBetween(startTokIdx: number): string {
    const start = this.toks[startTokIdx]?.pos ?? 0;
    const end = this.toks[Math.max(0, this.idx - 1)]?.end ?? start;
    return this.sql.slice(start, end).trim();
  }

  parseQuery(): SelectQuery {
    // Read-only sandbox: only SELECT runs.
    const first = this.peek();
    if (first.t === "kw" && ["INSERT", "UPDATE", "DELETE", "CREATE", "DROP", "ALTER"].includes(first.v)) {
      throw new SqlError(`${first.v} isn't available in this sandbox.`, {
        hint: "The SQL Query Sandbox is read-only — practice with SELECT queries.",
        pos: first.pos,
      });
    }
    this.eatKw("SELECT");

    const distinct = this.isKw("DISTINCT") ? (this.next(), true) : false;

    // select list
    const items: SelectItem[] = [];
    for (;;) {
      const startIdx = this.idx;
      const expr = this.parseSelectItemExpr();
      const text = this.textBetween(startIdx);
      let alias: string | undefined;
      if (this.isKw("AS")) {
        this.next();
        alias = this.expectIdent("an alias after AS");
      } else if (this.peek().t === "ident") {
        alias = this.next().v;
      }
      items.push({ expr, alias, text });
      if (this.isOp(",")) {
        this.next();
        continue;
      }
      break;
    }

    this.eatKw("FROM");
    const from = this.parseTableRef();

    // joins
    const joins: JoinClause[] = [];
    for (;;) {
      let kind: "INNER" | "LEFT" | null = null;
      if (this.isKw("INNER")) {
        this.next();
        kind = "INNER";
      } else if (this.isKw("LEFT")) {
        this.next();
        kind = "LEFT";
        if (this.isKw("OUTER")) this.next();
      } else if (this.isKw("JOIN")) {
        kind = "INNER";
      }
      if (!kind) break;
      this.eatKw("JOIN");
      const table = this.parseTableRef();
      this.eatKw("ON");
      const on = this.parseExpr();
      joins.push({ kind, table, on });
    }

    let where: Expr | undefined;
    if (this.isKw("WHERE")) {
      this.next();
      where = this.parseExpr();
    }

    const groupBy: Expr[] = [];
    if (this.isKw("GROUP")) {
      this.next();
      this.eatKw("BY");
      groupBy.push(this.parseExpr());
      while (this.isOp(",")) {
        this.next();
        groupBy.push(this.parseExpr());
      }
    }

    let having: Expr | undefined;
    if (this.isKw("HAVING")) {
      this.next();
      having = this.parseExpr();
    }

    const orderBy: OrderItem[] = [];
    if (this.isKw("ORDER")) {
      this.next();
      this.eatKw("BY");
      for (;;) {
        const t = this.peek();
        if (t.t === "num") {
          this.next();
          orderBy.push({ expr: { k: "pos", n: Number(t.v) }, desc: false });
        } else {
          orderBy.push({ expr: this.parseExpr(), desc: false });
        }
        if (this.isKw("DESC")) {
          this.next();
          orderBy[orderBy.length - 1].desc = true;
        } else if (this.isKw("ASC")) {
          this.next();
        }
        if (this.isOp(",")) {
          this.next();
          continue;
        }
        break;
      }
    }

    let limit: number | undefined;
    let offset: number | undefined;
    if (this.isKw("LIMIT")) {
      this.next();
      limit = this.expectNumber("LIMIT");
      if (this.isKw("OFFSET")) {
        this.next();
        offset = this.expectNumber("OFFSET");
      }
    }

    if (this.isOp(";")) {
      this.next();
      if (this.peek().t !== "eof") {
        throw new SqlError("One query at a time, please.", {
          hint: "Run each statement separately — the sandbox executes a single SELECT.",
          pos: this.peek().pos,
        });
      }
    }

    const eof = this.peek();
    if (eof.t !== "eof") {
      throw new SqlError(`Unexpected '${eof.v}' — the query looks complete before this point.`, {
        hint: "Check for a missing comma, an extra keyword, or an unfinished expression.",
        pos: eof.pos,
      });
    }

    return { distinct, items, from, joins, where, groupBy, having, orderBy, limit, offset };
  }

  private expectIdent(what: string): string {
    const t = this.peek();
    if (t.t === "ident") {
      this.next();
      return t.v;
    }
    throw new SqlError(`Expected ${what} but found ${t.t === "eof" ? "the end of the query" : `'${t.v}'`}.`, {
      pos: t.pos,
    });
  }

  private expectNumber(what: string): number {
    const t = this.peek();
    if (t.t === "num") {
      this.next();
      return Number(t.v);
    }
    throw new SqlError(`${what} needs a whole number, found ${t.t === "eof" ? "the end of the query" : `'${t.v}'`}.`, {
      pos: t.pos,
    });
  }

  private parseTableRef(): TableRef {
    const name = this.expectIdent("a table name");
    let alias: string | undefined;
    if (this.isKw("AS")) {
      this.next();
      alias = this.expectIdent("a table alias after AS");
    } else if (this.peek().t === "ident") {
      alias = this.next().v;
    }
    return { name, alias: alias ?? name };
  }

  /** Select item: *, t.*, or a general expression. */
  private parseSelectItemExpr(): Expr {
    if (this.isOp("*")) {
      this.next();
      return { k: "star", text: "*" };
    }
    if (
      this.peek().t === "ident" &&
      this.toks[this.idx + 1]?.t === "op" &&
      this.toks[this.idx + 1]?.v === "." &&
      this.toks[this.idx + 2]?.t === "op" &&
      this.toks[this.idx + 2]?.v === "*"
    ) {
      const table = this.next().v;
      this.next(); // .
      this.next(); // *
      return { k: "star", table, text: `${table}.*` };
    }
    return this.parseExpr();
  }

  // expression precedence: OR < AND < NOT < comparison < additive < mult < unary

  private parseExpr(): Expr {
    return this.parseOr();
  }

  private parseOr(): Expr {
    const startIdx = this.idx;
    let left = this.parseAnd();
    while (this.isKw("OR")) {
      this.next();
      const right = this.parseAnd();
      left = { k: "bin", op: "OR", l: left, r: right, text: this.textBetween(startIdx) };
    }
    return left;
  }

  private parseAnd(): Expr {
    const startIdx = this.idx;
    let left = this.parseNot();
    while (this.isKw("AND")) {
      this.next();
      const right = this.parseNot();
      left = { k: "bin", op: "AND", l: left, r: right, text: this.textBetween(startIdx) };
    }
    return left;
  }

  private parseNot(): Expr {
    if (this.isKw("NOT")) {
      const startIdx = this.idx;
      this.next();
      const e = this.parseNot();
      return { k: "un", op: "NOT", e, text: this.textBetween(startIdx) };
    }
    return this.parseComparison();
  }

  private parseComparison(): Expr {
    const startIdx = this.idx;
    const left = this.parseAdditive();

    // IS [NOT] NULL
    if (this.isKw("IS")) {
      this.next();
      let neg = false;
      if (this.isKw("NOT")) {
        this.next();
        neg = true;
      }
      this.eatKw("NULL");
      return { k: "isnull", e: left, neg, text: this.textBetween(startIdx) };
    }

    // [NOT] LIKE / IN / BETWEEN
    let neg = false;
    if (this.isKw("NOT") && this.toks[this.idx + 1]?.t === "kw" &&
        ["LIKE", "IN", "BETWEEN"].includes(this.toks[this.idx + 1]?.v ?? "")) {
      this.next();
      neg = true;
    }
    if (this.isKw("LIKE")) {
      this.next();
      const pat = this.parseAdditive();
      return { k: "like", e: left, pat, neg, text: this.textBetween(startIdx) };
    }
    if (this.isKw("IN")) {
      this.next();
      this.eatOp("(");
      const list: Expr[] = [];
      for (;;) {
        list.push(this.parseAdditive());
        if (this.isOp(",")) {
          this.next();
          continue;
        }
        break;
      }
      this.eatOp(")");
      return { k: "in", e: left, list, neg, text: this.textBetween(startIdx) };
    }
    if (this.isKw("BETWEEN")) {
      this.next();
      const lo = this.parseAdditive();
      this.eatKw("AND");
      const hi = this.parseAdditive();
      return { k: "between", e: left, lo, hi, neg, text: this.textBetween(startIdx) };
    }

    // comparison operators
    const t = this.peek();
    if (t.t === "op" && ["=", "!=", "<>", "<", ">", "<=", ">="].includes(t.v)) {
      this.next();
      const right = this.parseAdditive();
      return { k: "bin", op: t.v, l: left, r: right, text: this.textBetween(startIdx) };
    }
    return left;
  }

  private parseAdditive(): Expr {
    const startIdx = this.idx;
    let left = this.parseMultiplicative();
    for (;;) {
      if (this.isOp("+") || this.isOp("-")) {
        const op = this.next().v;
        const right = this.parseMultiplicative();
        left = { k: "bin", op, l: left, r: right, text: this.textBetween(startIdx) };
      } else {
        return left;
      }
    }
  }

  private parseMultiplicative(): Expr {
    const startIdx = this.idx;
    let left = this.parseUnary();
    for (;;) {
      if (this.isOp("*") || this.isOp("/")) {
        const op = this.next().v;
        const right = this.parseUnary();
        left = { k: "bin", op, l: left, r: right, text: this.textBetween(startIdx) };
      } else {
        return left;
      }
    }
  }

  private parseUnary(): Expr {
    if (this.isOp("-")) {
      const startIdx = this.idx;
      this.next();
      const e = this.parseUnary();
      return { k: "un", op: "NEG", e, text: this.textBetween(startIdx) };
    }
    if (this.isOp("+")) {
      const startIdx = this.idx;
      this.next();
      const e = this.parseUnary();
      return { k: "un", op: "POS", e, text: this.textBetween(startIdx) };
    }
    return this.parsePrimary();
  }

  private parsePrimary(): Expr {
    const startIdx = this.idx;
    const t = this.peek();

    if (t.t === "num") {
      this.next();
      const num = Number(t.v);
      if (!Number.isFinite(num)) throw new SqlError(`'${t.v}' isn't a valid number.`, { pos: t.pos });
      return { k: "lit", v: num, text: this.textBetween(startIdx) };
    }
    if (t.t === "str") {
      this.next();
      return { k: "lit", v: t.v, text: this.textBetween(startIdx) };
    }
    if (t.t === "kw" && t.v === "NULL") {
      this.next();
      return { k: "lit", v: null, text: this.textBetween(startIdx) };
    }
    if (t.t === "kw" && (t.v === "TRUE" || t.v === "FALSE")) {
      this.next();
      return { k: "lit", v: t.v === "TRUE" ? 1 : 0, text: this.textBetween(startIdx) };
    }

    // aggregates
    if (t.t === "kw" && ["COUNT", "SUM", "AVG", "MIN", "MAX"].includes(t.v)) {
      const fn = t.v as "COUNT" | "SUM" | "AVG" | "MIN" | "MAX";
      this.next();
      this.eatOp("(");
      let arg: Expr | null = null;
      if (this.isOp("*")) {
        this.next();
        arg = null;
      } else {
        arg = this.parseExpr();
      }
      this.eatOp(")");
      return { k: "agg", fn, arg, text: this.textBetween(startIdx) };
    }

    // ( expression )
    if (t.t === "op" && t.v === "(") {
      this.next();
      const e = this.parseExpr();
      this.eatOp(")");
      return e;
    }

    // column ref: name or table.name
    if (t.t === "ident") {
      this.next();
      if (this.isOp(".") && this.toks[this.idx + 1]?.t === "ident") {
        this.next(); // .
        const col = this.next();
        return { k: "col", table: t.v, name: col.v, text: this.textBetween(startIdx) };
      }
      return { k: "col", name: t.v, text: this.textBetween(startIdx) };
    }

    throw new SqlError(
      `Expected a column, number, string or expression but found ${t.t === "eof" ? "the end of the query" : `'${t.v}'`}.`,
      { pos: t.pos }
    );
  }
}

// ------------------------------------------------------------------- executor

interface Source {
  alias: string;
  table: SqlTable;
  offset: number;
}

interface EvalCtx {
  sources: Source[];
  /** The current combined row (undefined only in aggregate-only contexts). */
  row?: SqlValue[];
  /** Rows of the current group — aggregates iterate these. */
  groupRows?: SqlValue[][];
}

function findTable(db: SqlDatabase, name: string): SqlTable {
  const t = db.tables.find((t) => t.name.toLowerCase() === name.toLowerCase());
  if (!t) {
    const available = db.tables.map((t) => t.name).join(", ");
    const guess = didYouMean(
      name,
      db.tables.map((t) => t.name)
    );
    throw new SqlError(`Table '${name}' doesn't exist in this database.`, {
      hint: guess
        ? `Did you mean '${guess}'? Available tables: ${available}`
        : `Available tables: ${available}`,
    });
  }
  return t;
}

function resolveColumn(ctx: EvalCtx, table: string | undefined, name: string): { index: number; label: string } {
  const candidates: { index: number; label: string }[] = [];
  for (const src of ctx.sources) {
    if (table && src.alias.toLowerCase() !== table.toLowerCase()) continue;
    const colIdx = src.table.columns.findIndex((c) => c.name.toLowerCase() === name.toLowerCase());
    if (colIdx >= 0) {
      candidates.push({ index: src.offset + colIdx, label: src.table.columns[colIdx].name });
    }
  }
  if (candidates.length === 0) {
    const all = ctx.sources
      .map((s) => `${s.alias}: ${s.table.columns.map((c) => c.name).join(", ")}`)
      .join(" | ");
    const names = ctx.sources.flatMap((s) => s.table.columns.map((c) => c.name));
    const guess = didYouMean(name, names);
    throw new SqlError(`Unknown column '${table ? `${table}.${name}` : name}'.`, {
      hint: guess ? `Did you mean '${guess}'? ${all}` : all,
    });
  }
  if (candidates.length > 1 && !table) {
    throw new SqlError(`Ambiguous column '${name}' — it exists in more than one table.`, {
      hint: "Qualify it with the table name or alias, e.g. developers.${name}",
    });
  }
  return candidates[0];
}

/** Levenshtein-based "did you mean" for identifiers (case-insensitive). */
function didYouMean(input: string, options: string[]): string | undefined {
  const target = input.toLowerCase();
  let best: { name: string; d: number } | undefined;
  for (const opt of options) {
    const o = opt.toLowerCase();
    if (o === target) continue;
    const d = levenshtein(target, o);
    if (!best || d < best.d) best = { name: opt, d };
  }
  if (best && best.d <= Math.max(2, Math.floor(target.length / 3))) return best.name;
  return undefined;
}

function levenshtein(a: string, b: string): number {
  const m = a.length;
  const n = b.length;
  const dp: number[][] = Array.from({ length: m + 1 }, () => new Array<number>(n + 1).fill(0));
  for (let i = 0; i <= m; i++) dp[i][0] = i;
  for (let j = 0; j <= n; j++) dp[0][j] = j;
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      dp[i][j] = Math.min(
        dp[i - 1][j] + 1,
        dp[i][j - 1] + 1,
        dp[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1)
      );
    }
  }
  return dp[m][n];
}

/** LIKE pattern → RegExp (% = any run, _ = one char, case-insensitive). */
function likeToRegex(pattern: string): RegExp {
  let out = "";
  for (const ch of pattern) {
    if (ch === "%") out += "[\\s\\S]*";
    else if (ch === "_") out += "[\\s\\S]";
    else out += ch.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  }
  return new RegExp(`^${out}$`, "i");
}

type BoolOrNull = boolean | null;

function compareValues(op: string, a: SqlValue, b: SqlValue): BoolOrNull {
  if (a === null || b === null) return null;
  let x: SqlValue = a;
  let y: SqlValue = b;
  // numeric coercion when the shapes allow it
  if (typeof x === "number" && typeof y === "string" && y.trim() !== "" && Number.isFinite(Number(y))) {
    y = Number(y);
  } else if (typeof y === "number" && typeof x === "string" && x.trim() !== "" && Number.isFinite(Number(x))) {
    x = Number(x);
  }
  if (typeof x === "number" && typeof y === "number") {
    switch (op) {
      case "=": return x === y;
      case "!=": case "<>": return x !== y;
      case "<": return x < y;
      case ">": return x > y;
      case "<=": return x <= y;
      case ">=": return x >= y;
    }
  }
  const xs = String(x);
  const ys = String(y);
  switch (op) {
    case "=": return xs === ys;
    case "!=": case "<>": return xs !== ys;
    case "<": return xs < ys;
    case ">": return xs > ys;
    case "<=": return xs <= ys;
    case ">=": return xs >= ys;
  }
  return null;
}

function truthy(v: SqlValue): boolean {
  if (v === null) return false;
  if (typeof v === "number") return v !== 0;
  return v !== "";
}

function evaluate(expr: Expr, ctx: EvalCtx): SqlValue {
  switch (expr.k) {
    case "lit":
      return expr.v;
    case "col": {
      if (!ctx.row) {
        throw new SqlError(`Column '${expr.text}' can't be used here.`, {
          hint: "Outside aggregates, columns need a row context — add it to GROUP BY.",
        });
      }
      const { index } = resolveColumn(ctx, expr.table, expr.name);
      return ctx.row[index];
    }
    case "star":
      throw new SqlError("'*' can only appear in the select list.", {
        hint: "Use SELECT * at the start of the query, or name the columns you want.",
      });
    case "agg": {
      const rows = ctx.groupRows;
      if (!rows) {
        throw new SqlError(`Aggregate ${expr.text} appears in an invalid context.`, {
          hint: "Aggregates belong in the select list, HAVING or ORDER BY of a grouped query.",
        });
      }
      if (expr.fn === "COUNT" && !expr.arg) return rows.length;
      const vals: SqlValue[] = [];
      for (const r of rows) {
        const v = evaluate(expr.arg as Expr, { ...ctx, row: r, groupRows: undefined });
        if (v !== null) vals.push(v);
      }
      switch (expr.fn) {
        case "COUNT":
          return vals.length;
        case "SUM":
          return vals.length === 0 ? null : vals.reduce((a, v) => a + Number(v ?? 0), 0);
        case "AVG": {
          if (vals.length === 0) return null;
          const sum = vals.reduce((a, v) => a + Number(v ?? 0), 0);
          return sum / vals.length;
        }
        case "MIN":
          return vals.length === 0
            ? null
            : vals.reduce((a, v) => (compareValues("<", v, a) === true ? v : a));
        case "MAX":
          return vals.length === 0
            ? null
            : vals.reduce((a, v) => (compareValues(">", v, a) === true ? v : a));
      }
      return null;
    }
    case "un": {
      if (expr.op === "NOT") {
        const v = evaluate(expr.e, ctx);
        if (v === null) return null;
        return truthy(v) ? 0 : 1;
      }
      const v = evaluate(expr.e, ctx);
      if (v === null) return null;
      const num = Number(v);
      return expr.op === "NEG" ? -num : num;
    }
    case "bin": {
      if (expr.op === "AND") {
        const l = evaluate(expr.l, ctx);
        if (l !== null && !truthy(l)) return 0;
        const r = evaluate(expr.r, ctx);
        if (r !== null && !truthy(r)) return 0;
        if (l === null || r === null) return null;
        return 1;
      }
      if (expr.op === "OR") {
        const l = evaluate(expr.l, ctx);
        if (l !== null && truthy(l)) return 1;
        const r = evaluate(expr.r, ctx);
        if (r !== null && truthy(r)) return 1;
        if (l === null || r === null) return null;
        return 0;
      }
      const l = evaluate(expr.l, ctx);
      const r = evaluate(expr.r, ctx);
      const numOp = ["+", "-", "*", "/"].includes(expr.op);
      if (numOp) {
        if (l === null || r === null) return null;
        const a = Number(l);
        const b = Number(r);
        switch (expr.op) {
          case "+": return a + b;
          case "-": return a - b;
          case "*": return a * b;
          case "/": return b === 0 ? null : a / b;
        }
      }
      const cmp = compareValues(expr.op, l, r);
      return cmp === null ? null : cmp ? 1 : 0;
    }
    case "in": {
      const v = evaluate(expr.e, ctx);
      if (v === null) return null;
      let hit: BoolOrNull = false;
      for (const item of expr.list) {
        const lv = evaluate(item, ctx);
        const c = compareValues("=", v, lv);
        if (c === true) {
          hit = true;
          break;
        }
      }
      if (hit === false && expr.list.some((item) => evaluate(item, ctx) === null)) hit = null;
      if (expr.neg) {
        if (hit === null) return null;
        return hit ? 0 : 1;
      }
      return hit === true ? 1 : hit === null ? null : 0;
    }
    case "isnull": {
      const v = evaluate(expr.e, ctx);
      const isNull = v === null;
      const res = expr.neg ? !isNull : isNull;
      return res ? 1 : 0;
    }
    case "like": {
      const v = evaluate(expr.e, ctx);
      const p = evaluate(expr.pat, ctx);
      if (v === null || p === null) return null;
      const m = likeToRegex(String(p)).test(String(v));
      return (expr.neg ? !m : m) ? 1 : 0;
    }
    case "between": {
      const v = evaluate(expr.e, ctx);
      const lo = evaluate(expr.lo, ctx);
      const hi = evaluate(expr.hi, ctx);
      if (v === null || lo === null || hi === null) return null;
      const ge = compareValues(">=", v, lo);
      const le = compareValues("<=", v, hi);
      const inRange = ge === true && le === true;
      return (expr.neg ? !inRange : inRange) ? 1 : 0;
    }
  }
}

function containsAggregate(expr: Expr): boolean {
  if (!expr || typeof expr !== "object") return false;
  switch (expr.k) {
    case "agg":
      return true;
    case "bin":
      return containsAggregate(expr.l) || containsAggregate(expr.r);
    case "un":
      return containsAggregate(expr.e);
    case "in":
      return containsAggregate(expr.e) || expr.list.some(containsAggregate);
    case "isnull":
    case "like":
      return containsAggregate(expr.e) || (expr.k === "like" && containsAggregate(expr.pat));
    case "between":
      return (
        containsAggregate(expr.e) || containsAggregate(expr.lo) || containsAggregate(expr.hi)
      );
    default:
      return false;
  }
}

interface OutputRow {
  values: SqlValue[];
  /** Sort keys pre-evaluated per ORDER BY item. */
  sortKeys: SqlValue[];
  /** Underlying first-row context, for ORDER BY expressions resolved late. */
  rowCtx?: SqlValue[];
  groupRows?: SqlValue[][];
}

/** Query a database. Throws SqlError with teaching hints on any failure. */
export function executeSql(db: SqlDatabase, sqlRaw: string): SqlResultSet {
  const sql = sqlRaw.trim();
  if (!sql) {
    throw new SqlError("Type a query first.", {
      hint: "Try: SELECT * FROM developers",
    });
  }
  const query = new Parser(sql, tokenize(sql)).parseQuery();

  // ---- FROM (+ joins) → combined row space
  const sources: Source[] = [];
  const baseTable = findTable(db, query.from.name);
  sources.push({ alias: query.from.alias, table: baseTable, offset: 0 });
  let width = baseTable.columns.length;

  let rows: SqlValue[][] = baseTable.rows.map((r) => [...r]);

  for (const join of query.joins) {
    const jt = findTable(db, join.table.name);
    if (sources.some((s) => s.alias.toLowerCase() === join.table.alias.toLowerCase())) {
      throw new SqlError(`Table alias '${join.table.alias}' is used twice.`, {
        hint: "Give each table its own alias, like 'developers d' and 'courses c'.",
      });
    }
    const joinCtxSources = [...sources, { alias: join.table.alias, table: jt, offset: width }];
    const joined: SqlValue[][] = [];
    for (const leftRow of rows) {
      let matched = false;
      for (const rightRow of jt.rows) {
        const combined = [...leftRow, ...rightRow];
        if (truthy(evaluate(join.on, { sources: joinCtxSources, row: combined }))) {
          joined.push(combined);
          matched = true;
        }
      }
      if (!matched && join.kind === "LEFT") {
        joined.push([...leftRow, ...new Array<SqlValue>(jt.columns.length).fill(null)]);
      }
    }
    sources.push({ alias: join.table.alias, table: jt, offset: width });
    width += jt.columns.length;
    rows = joined;
  }

  const baseCtx: EvalCtx = { sources };

  // ---- WHERE
  if (query.where) {
    rows = rows.filter((r) => truthy(evaluate(query.where as Expr, { ...baseCtx, row: r })));
  }

  // ---- projection plan: star items expand to global column indexes
  type Projection =
    | { kind: "star"; indexes: number[] }
    | { kind: "expr"; expr: Expr };
  const proj: Projection[] = [];
  const labels: string[] = [];
  for (const item of query.items) {
    if (item.expr.k === "star") {
      if (query.groupBy.length > 0) {
        throw new SqlError("SELECT * can't be combined with GROUP BY.", {
          hint: "Name the columns you want — and put every non-aggregated one into GROUP BY.",
        });
      }
      let cols: { index: number; name: string }[] = [];
      if (item.expr.table) {
        const src = sources.find((s) => s.alias.toLowerCase() === item.expr.table!.toLowerCase());
        if (!src) {
          throw new SqlError(`'${item.expr.table}' isn't a table in this query.`, {
            hint: `Tables in play: ${sources.map((s) => s.alias).join(", ")}`,
          });
        }
        cols = src.table.columns.map((c, ci) => ({ index: src.offset + ci, name: c.name }));
      } else {
        for (const src of sources) {
          cols.push(
            ...src.table.columns.map((c, ci) => ({ index: src.offset + ci, name: c.name }))
          );
        }
      }
      proj.push({ kind: "star", indexes: cols.map((c) => c.index) });
      cols.forEach((c) => labels.push(c.name));
    } else {
      proj.push({ kind: "expr", expr: item.expr });
      labels.push(item.alias ?? defaultLabel(item));
    }
  }

  // ---- grouping
  const hasAggregate =
    query.items.some((i) => i.expr.k !== "star" && containsAggregate(i.expr)) ||
    (query.having ? containsAggregate(query.having) : false);
  const grouped = query.groupBy.length > 0 || hasAggregate;

  const projectRow = (r: SqlValue[]): SqlValue[] =>
    proj.flatMap((p) =>
      p.kind === "star" ? p.indexes.map((i) => r[i] ?? null) : [evaluate(p.expr, { ...baseCtx, row: r })]
    );

  const projectGroup = (groupRows: SqlValue[][]): SqlValue[] => {
    const gctx: EvalCtx = { sources, row: groupRows[0], groupRows };
    return proj.flatMap((p) =>
      p.kind === "star"
        ? p.indexes.map((i) => groupRows[0]?.[i] ?? null)
        : [evaluate(p.expr, gctx)]
    );
  };

  let outputRows: OutputRow[] = [];

  if (grouped) {
    const groups: SqlValue[][][] = [];
    if (query.groupBy.length > 0) {
      const map = new Map<string, SqlValue[][]>();
      for (const r of rows) {
        const key = query.groupBy
          .map((g) => {
            const v = evaluate(g, { ...baseCtx, row: r });
            return `${typeof v}:${String(v)}`;
          })
          .join("\u0000");
        const bucket = map.get(key);
        if (bucket) bucket.push(r);
        else map.set(key, [r]);
      }
      for (const bucket of map.values()) groups.push(bucket);
    } else {
      groups.push(rows);
    }

    for (const g of groups) {
      const gctx: EvalCtx = { sources, row: g[0], groupRows: g };
      if (query.having && !truthy(evaluate(query.having, gctx))) continue;
      outputRows.push({
        values: projectGroup(g),
        sortKeys: [],
        rowCtx: g[0],
        groupRows: g,
      });
    }
  } else {
    for (const r of rows) {
      outputRows.push({ values: projectRow(r), sortKeys: [], rowCtx: r });
    }
  }

  // ---- ORDER BY (resolve: positional number → select alias/label → expression)
  if (query.orderBy.length > 0) {
    for (const orow of outputRows) {
      for (const oi of query.orderBy) {
        let key: SqlValue;
        if (oi.expr.k === "pos") {
          const n = oi.expr.n;
          if (n < 1 || n > labels.length) {
            throw new SqlError(`ORDER BY ${n} is out of range — the query has ${labels.length} column(s).`, {
              hint: "Positional ordering counts from 1: ORDER BY 1 sorts by the first output column.",
            });
          }
          key = orow.values[n - 1];
        } else {
          const e = oi.expr;
          const asAlias = e.k === "col" && !e.table
            ? labels.findIndex((l) => l.toLowerCase() === e.name.toLowerCase())
            : -1;
          if (asAlias >= 0) {
            key = orow.values[asAlias];
          } else if (grouped) {
            key = evaluate(e, {
              sources,
              row: orow.rowCtx,
              groupRows: orow.groupRows ?? [orow.rowCtx as SqlValue[]],
            });
          } else {
            key = evaluate(e, { sources, row: orow.rowCtx });
          }
        }
        orow.sortKeys.push(key);
      }
    }
    outputRows.sort((a, b) => {
      for (let i = 0; i < query.orderBy.length; i++) {
        const desc = query.orderBy[i].desc;
        const av = a.sortKeys[i];
        const bv = b.sortKeys[i];
        // NULLs first on ASC, last on DESC (SQLite convention)
        if (av === null && bv === null) continue;
        if (av === null) return desc ? 1 : -1;
        if (bv === null) return desc ? -1 : 1;
        const c = compareValues("=", av, bv);
        if (c === true) continue;
        const lt = compareValues("<", av, bv);
        if (lt === true) return desc ? 1 : -1;
        return desc ? -1 : 1;
      }
      return 0;
    });
  }

  // ---- DISTINCT
  if (query.distinct) {
    const seen = new Set<string>();
    outputRows = outputRows.filter((r) => {
      const key = r.values.map((v) => `${typeof v}:${String(v)}`).join("\u0000");
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }

  // ---- OFFSET / LIMIT
  if (query.offset !== undefined) outputRows = outputRows.slice(query.offset);
  if (query.limit !== undefined) outputRows = outputRows.slice(0, query.limit);

  return { columns: labels, rows: outputRows.map((r) => r.values) };
}

function defaultLabel(item: SelectItem): string {
  if (item.alias) return item.alias;
  const e = item.expr;
  if (e.k === "col") return e.name;
  if (e.k === "agg") {
    if (!e.arg) return `${e.fn}(*)`;
    return `${e.fn}(${e.arg.text})`;
  }
  return item.text || "expr";
}
