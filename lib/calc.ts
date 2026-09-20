// One shared calculation module per PRD §6.7 / ARCHITECTURE §4.
// Pure functions of {expenses, today}. Calendar-based only:
// never `new Date("YYYY-MM-DD")` (UTC-shift bug). No floats.

export type Period = "Day" | "Week" | "Month" | "Year";
export type Classification = "personal" | "work";

export type Expense = {
  id: string;
  amount: number; // integer rupiah 1..9999999999
  date: string; // YYYY-MM-DD, date-only
  category: string;
  classification: Classification;
  merchant: string;
  note: string;
  createdAt: string; // ISO instant
  updatedAt: string; // ISO instant
};

export type Range = { start: string; end: string; label: string };

const DAY_MS = 86_400_000;

function parts(value: string): [number, number, number] | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!m) return null;
  return [Number(m[1]), Number(m[2]), Number(m[3])];
}

// Calendar constructor: date-only string -> UTC midnight. No epoch parsing.
export function toUTC(value: string): Date | null {
  const p = parts(value);
  if (!p) return null;
  const [y, mo, d] = p;
  if (mo < 1 || mo > 12 || d < 1 || d > 31 || y < 1000) return null;
  const dt = new Date(Date.UTC(y, mo - 1, d));
  if (dt.getUTCFullYear() !== y || dt.getUTCMonth() !== mo - 1 || dt.getUTCDate() !== d) return null;
  return dt;
}

export function toDateOnly(dt: Date): string {
  return dt.toISOString().slice(0, 10);
}

export function addDays(value: string, n: number): string {
  const dt = toUTC(value);
  if (!dt) return value;
  dt.setUTCDate(dt.getUTCDate() + n);
  return toDateOnly(dt);
}

export function diffDays(a: string, b: string): number {
  const da = toUTC(a);
  const db = toUTC(b);
  if (!da || !db) return 0;
  return Math.round((db.getTime() - da.getTime()) / DAY_MS);
}

export function todayJakarta(now = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Jakarta",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(now);
}

const monthLabel = (start: string): string => {
  const dt = toUTC(start);
  if (!dt) return start;
  return dt.toLocaleDateString("en-GB", { month: "long", year: "numeric", timeZone: "UTC" });
};

// Fixed English abbreviations: runtime ICU renders September short as "Sept".
const MON = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

// Visible-text only. Storage, filters, URLs, forms, CSV keep ISO (YYYY-MM-DD).
export function formatDate(value: string): string {
  const dt = toUTC(value);
  if (!dt) return value;
  return `${dt.getUTCDate()} ${MON[dt.getUTCMonth()]} ${dt.getUTCFullYear()}`;
}

export function formatDateRange(start: string, end: string): string {
  const ds = toUTC(start);
  const de = toUTC(end);
  if (!ds || !de) return `${start} – ${end}`;
  const sy = ds.getUTCFullYear();
  const ey = de.getUTCFullYear();
  const sm = MON[ds.getUTCMonth()];
  const em = MON[de.getUTCMonth()];
  if (start === end) return formatDate(start);
  if (sy === ey && ds.getUTCMonth() === de.getUTCMonth()) return `${ds.getUTCDate()}–${de.getUTCDate()} ${em} ${ey}`;
  if (sy === ey) return `${ds.getUTCDate()} ${sm} – ${de.getUTCDate()} ${em} ${ey}`;
  return `${ds.getUTCDate()} ${sm} ${sy} – ${de.getUTCDate()} ${em} ${ey}`;
}

export function periodRange(anchor: string, period: Period): Range {
  const base = toUTC(anchor);
  if (!base) return { start: anchor, end: anchor, label: anchor };
  const start = new Date(base.getTime());
  const end = new Date(base.getTime());
  if (period === "Week") {
    start.setUTCDate(start.getUTCDate() - ((start.getUTCDay() + 6) % 7)); // Monday back
    end.setTime(start.getTime());
    end.setUTCDate(end.getUTCDate() + 6);
  } else if (period === "Month") {
    start.setUTCDate(1);
    end.setUTCMonth(end.getUTCMonth() + 1, 0); // last day of month
  } else if (period === "Year") {
    start.setUTCMonth(0, 1);
    end.setUTCMonth(11, 31);
  }
  const s = toDateOnly(start);
  const e = toDateOnly(end);
  const label =
    period === "Day" ? formatDate(anchor) : period === "Month" ? monthLabel(s) : period === "Year" ? String(start.getUTCFullYear()) : formatDateRange(s, e);
  return { start: s, end: e, label };
}

export function movePeriod(anchor: string, period: Period, step: number): string {
  const range = periodRange(anchor, period);
  const dt = toUTC(range.start);
  if (!dt) return anchor;
  if (period === "Year") dt.setUTCFullYear(dt.getUTCFullYear() + step);
  else if (period === "Month") dt.setUTCMonth(dt.getUTCMonth() + step);
  else dt.setUTCDate(dt.getUTCDate() + step * (period === "Week" ? 7 : 1));
  return toDateOnly(dt);
}

export function previousRange(range: Range, period: Period): Range {
  return periodRange(movePeriod(range.start, period, -1), period);
}

export const total = (rows: Expense[]): number => rows.reduce((sum, r) => sum + r.amount, 0);

// Whole-rupiah daily average over an inclusive ISO range. Pure display helper.
export function averagePerDay(amount: number, start: string, end: string): number {
  const days = diffDays(start, end) + 1;
  if (!(days > 0)) return 0;
  return Math.round(amount / days);
}

export function inRange(rows: Expense[], start: string, end: string): Expense[] {
  return rows
    .filter((r) => r.date >= start && r.date <= end)
    .sort((a, b) => b.date.localeCompare(a.date) || b.createdAt.localeCompare(a.createdAt));
}

export function categoryTotals(rows: Expense[]): { category: string; count: number; total: number }[] {
  const map = new Map<string, { count: number; total: number }>();
  for (const r of rows) {
    const e = map.get(r.category) ?? { count: 0, total: 0 };
    e.count += 1;
    e.total += r.amount;
    map.set(r.category, e);
  }
  return [...map.entries()]
    .map(([category, v]) => ({ category, ...v }))
    .sort((a, b) => b.total - a.total || a.category.localeCompare(b.category));
}

export type Comparison = {
  kind: "completed" | "current" | "future";
  curStart: string;
  curEnd: string; // elapsed end for current (<= today)
  prevStart: string;
  prevEnd: string; // elapsed end for current, full end for completed
  curTotal: number;
  prevTotal: number;
  prevHasData: boolean;
  elapsedDays: number;
  change: number;
  percent: number | null;
};

// PRD §6.3–6.4 + §5.2: current totals exclude dates after today.
export function comparePeriod(expenses: Expense[], range: Range, period: Period, today: string): Comparison {
  if (range.start > today) {
    return {
      kind: "future", curStart: range.start, curEnd: range.end,
      prevStart: range.start, prevEnd: range.end,
      curTotal: 0, prevTotal: 0, prevHasData: false, elapsedDays: 0, change: 0, percent: null,
    };
  }
  if (range.end < today) {
    const prev = previousRange(range, period);
    const curTotal = total(inRange(expenses, range.start, range.end));
    const prevRows = inRange(expenses, prev.start, prev.end);
    const prevTotal = total(prevRows);
    const change = curTotal - prevTotal;
    return {
      kind: "completed", curStart: range.start, curEnd: range.end,
      prevStart: prev.start, prevEnd: prev.end,
      curTotal, prevTotal, prevHasData: prevRows.length > 0,
      elapsedDays: diffDays(range.start, range.end) + 1,
      change, percent: prevTotal > 0 ? (change / prevTotal) * 100 : null,
    };
  }
  const k = diffDays(range.start, today <= range.end ? today : range.end) + 1;
  const curEnd = today <= range.end ? today : range.end;
  const prev = previousRange(range, period);
  const prevEnd = addDays(prev.start, Math.max(k - 1, 0));
  const curTotal = total(inRange(expenses, range.start, curEnd));
  const prevRows = inRange(expenses, prev.start, prevEnd);
  const prevTotal = total(prevRows);
  const change = curTotal - prevTotal;
  return {
    kind: "current", curStart: range.start, curEnd,
    prevStart: prev.start, prevEnd,
    curTotal, prevTotal, prevHasData: prevRows.length > 0,
    elapsedDays: Math.max(k, 0),
    change, percent: prevTotal > 0 ? (change / prevTotal) * 100 : null,
  };
}

export type Signal = {
  id: "cat" | "max" | "split";
  title: string;
  text: string;
  filter: { category?: string; classification?: Classification; start: string; end: string };
};

export function money(n: number): string {
  return `Rp${n.toLocaleString("id-ID")}`;
}

export type MerchantSuggestion = {
  merchant: string; // most recent spelling
  category: string; // from most recent expense with this merchant
  classification: Classification; // from most recent expense with this merchant
  uses: number;
  lastUsed: string; // YYYY-MM-DD
};

// Merchant memory: pure ranking over existing local expenses. No new storage.
// Match is case-insensitive substring; ranking is starts-with, then uses,
// then recency, then alphabetical. Never called for empty queries.
export function suggestMerchants(expenses: Expense[], query: string, limit = 5): MerchantSuggestion[] {
  const q = query.trim().toLowerCase();
  if (!q) return [];
  const groups = new Map<string, MerchantSuggestion>();
  const ordered = [...expenses].sort((a, b) => b.date.localeCompare(a.date) || b.createdAt.localeCompare(a.createdAt));
  for (const e of ordered) {
    const name = e.merchant.trim();
    if (!name) continue;
    const key = name.toLowerCase();
    const g = groups.get(key);
    if (g) {
      g.uses += 1;
      continue;
    }
    groups.set(key, { merchant: name, category: e.category, classification: e.classification, uses: 1, lastUsed: e.date });
  }
  return [...groups.values()]
    .filter((g) => g.merchant.toLowerCase().includes(q))
    .sort((a, b) => {
      const as = a.merchant.toLowerCase().startsWith(q) ? 0 : 1;
      const bs = b.merchant.toLowerCase().startsWith(q) ? 0 : 1;
      return (
        as - bs ||
        b.uses - a.uses ||
        b.lastUsed.localeCompare(a.lastUsed) ||
        a.merchant.localeCompare(b.merchant)
      );
    })
    .slice(0, Math.max(limit, 0));
}

// Deterministic signals per PRD §7. Pure function of current rows.
export function buildSignals(expenses: Expense[], range: Range, period: Period, today: string): Signal[] {
  const cmp = comparePeriod(expenses, range, period, today);
  if (cmp.kind === "future") return [];
  const cur = inRange(expenses, cmp.curStart, cmp.curEnd);
  const prev = inRange(expenses, cmp.prevStart, cmp.prevEnd);
  const out: Signal[] = [];

  // Signal 1 — largest category increase (needs prev data, >=3 elapsed days, >= Rp50rb).
  if (prev.length > 0 && cmp.elapsedDays >= 3) {
    const pt = new Map(categoryTotals(prev).map((c) => [c.category, c.total]));
    const ct = new Map(categoryTotals(cur).map((c) => [c.category, c.total]));
    let best: { cat: string; d: number; base: number } | null = null;
    for (const [cat, t] of ct) {
      const d = t - (pt.get(cat) ?? 0);
      if (d <= 0) continue;
      if (!best || d > best.d || (d === best.d && cat < best.cat)) best = { cat, d, base: pt.get(cat) ?? 0 };
    }
    // Categories only in prev can't increase; categories only in cur handled via ct loop (base 0).
    if (best && best.d >= 50_000) {
      out.push({
        id: "cat",
        title: "Category change",
        text:
          best.base === 0
            ? `New spending appeared in ${best.cat}: ${money(best.d)}.`
            : `${best.cat} spending increased ${money(best.d)} compared with the same dates in the previous ${period.toLowerCase()}.`,
        filter: { category: best.cat, start: cmp.curStart, end: cmp.curEnd },
      });
    }
  }

  // Signal 2 — largest transaction in displayed period.
  if (cur.length > 0) {
    const largest = [...cur].sort(
      (a, b) => b.amount - a.amount || b.date.localeCompare(a.date) || b.createdAt.localeCompare(a.createdAt),
    )[0];
    out.push({
      id: "max",
      title: "Largest expense",
      text: `Largest recorded expense this period: ${money(largest.amount)} · ${largest.merchant || largest.category} · ${formatDate(largest.date)}.`,
      filter: { start: largest.date, end: largest.date },
    });
  }

  // Signal 3 — personal/work shift.
  if (prev.length > 0) {
    const sum = (rows: Expense[], c: Classification) => rows.filter((r) => r.classification === c).reduce((s, r) => s + r.amount, 0);
    const dp = sum(cur, "personal") - sum(prev, "personal");
    const dw = sum(cur, "work") - sum(prev, "work");
    if (dp !== 0 || dw !== 0) {
      const pick: Classification = Math.abs(dw) >= Math.abs(dp) ? "work" : "personal";
      const fmt = (d: number, c: string) =>
        d === 0 ? "" : `${c} ${d > 0 ? "increased" : "decreased"} ${money(Math.abs(d))}`;
      const text =
        dp !== 0 && dw !== 0 && Math.abs(dp) === Math.abs(dw)
          ? `Personal and Work each ${dp > 0 ? "increased" : "changed"} ${money(Math.abs(dp))}.`
          : [fmt(dw, "Work"), fmt(dp, "Personal")].filter(Boolean).join("; ") + ".";
      out.push({
        id: "split",
        title: "Personal / Work",
        text: text.charAt(0).toUpperCase() + text.slice(1),
        filter: { classification: dp !== 0 && dw !== 0 && Math.abs(dp) === Math.abs(dw) ? undefined : pick, start: cmp.curStart, end: cmp.curEnd },
      });
    }
  }

  // §7.4 anti-duplication (simplified): if the top category is single-classification
  // and that classification is the split headline, drop the split card.
  if (out.some((s) => s.id === "cat") && out.some((s) => s.id === "split")) {
    const cat = out.find((s) => s.id === "cat")!;
    const split = out.find((s) => s.id === "split")!;
    const catRows = cur.filter((r) => r.category === cat.filter.category);
    const classes = new Set(catRows.map((r) => r.classification));
    if (classes.size === 1 && split.filter.classification && classes.has(split.filter.classification)) {
      return out.filter((s) => s.id !== "split").slice(0, 3);
    }
  }
  return out.slice(0, 3);
}

export function validateDraft(d: Record<string, string>, today: string): Record<string, string> {
  const errors: Record<string, string> = {};
  if (!/^\d{1,10}$/.test(d.amount || "") || Number(d.amount) < 1 || Number(d.amount) > 9_999_999_999)
    errors.amount = "Enter whole rupiah from 1 to 9,999,999,999.";
  const max = `${Number(today.slice(0, 4)) + 1}${today.slice(4)}`;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(d.date || "") || !toUTC(d.date) || d.date > max)
    errors.date = "Choose a valid date, at most one year ahead.";
  if (!d.category || !d.category.trim() || d.category.trim().length > 40) errors.category = "Choose a category (max 40).";
  if (d.classification !== "personal" && d.classification !== "work") errors.classification = "Choose Personal or Work.";
  if ((d.merchant || "").trim().length > 60) errors.merchant = "Use at most 60 characters.";
  if ((d.note || "").trim().length > 200) errors.note = "Use at most 200 characters.";
  return errors;
}
