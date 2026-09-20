"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { CTASection } from "@/components/ui/hero-dithering-card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { EntryForm, type Draft } from "@/components/entry-form";
import { DataTools } from "@/components/data-tools";
import { ProfileControl } from "@/components/profile-control";
import { UndoToast } from "@/components/undo-toast";
import {
  averagePerDay,
  buildSignals,
  categoryTotals,
  comparePeriod,
  formatDate,
  formatDateRange,
  inRange,
  money,
  movePeriod,
  periodRange,
  todayJakarta,
  total,
  type Expense,
  type Period,
} from "@/lib/calc";
import { downloadCSV, type CsvImportRow } from "@/lib/csv";
import { allCategories, useExpenses, usePrefsTick } from "@/lib/storage";

const PERIODS: Period[] = ["Day", "Week", "Month", "Year"];

function signalHref(s: { filter: { category?: string; classification?: string; start: string; end: string } }): string {
  const q = new URLSearchParams();
  if (s.filter.category) q.set("category", s.filter.category);
  if (s.filter.classification) q.set("classification", s.filter.classification);
  q.set("from", s.filter.start);
  q.set("to", s.filter.end);
  return `/transactions?${q.toString()}`;
}

export default function OverviewPage() {
  const { expenses, loading, add, update, remove, restore, addMany, refresh } = useExpenses();
  const [today, setToday] = useState(() => todayJakarta());
  const [period, setPeriod] = useState<Period>("Month");
  const [anchor, setAnchor] = useState(() => todayJakarta());
  const [entryOpen, setEntryOpen] = useState(false);
  const [editing, setEditing] = useState<Expense | null>(null);
  const [deleted, setDeleted] = useState<Expense | null>(null);
  const [prefsTick, setPrefsTick] = useState(0);
  const recordRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    setToday(todayJakarta());
  }, []);

  const prefs = usePrefsTick([prefsTick, expenses]);
  const categories = useMemo(() => allCategories(expenses), [expenses]);
  const recentCategories = useMemo(() => {
    const counts = new Map<string, number>();
    for (const e of expenses) counts.set(e.category, (counts.get(e.category) ?? 0) + 1);
    return [...counts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 3).map(([c]) => c);
  }, [expenses]);

  // N opens entry from anywhere except typing.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const key = typeof e.key === "string" ? e.key.toLowerCase() : "";
      const t = e.target instanceof HTMLElement ? e.target : null;
      if (
        key === "n" &&
        !e.ctrlKey && !e.metaKey && !e.altKey && !e.repeat &&
        !entryOpen &&
        !t?.closest("input, textarea, select, [contenteditable='true']")
      ) {
        e.preventDefault();
        setEditing(null);
        setEntryOpen(true);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [entryOpen]);

  const range = periodRange(anchor, period);
  const cmp = comparePeriod(expenses, range, period, today);
  const rows = inRange(expenses, cmp.curStart, cmp.curEnd);
  const amount = total(rows);
  const groups = categoryTotals(rows);
  const personal = total(rows.filter((e) => e.classification === "personal"));
  const signals = buildSignals(expenses, range, period, today);
  const recent = inRange(expenses, "0000-00-00", "9999-99-99").slice(0, 10);
  const topCategory = groups[0] ?? null;
  const largest = [...rows].sort(
    (a, b) => b.amount - a.amount || b.date.localeCompare(a.date) || b.createdAt.localeCompare(a.createdAt),
  )[0] ?? null;

  function openNew() {
    setEditing(null);
    setEntryOpen(true);
  }

  function saveDraft(draft: Draft, editingId?: string) {
    if (editingId) update(editingId, draft);
    else {
      const row = add(draft);
      // Jump to the saved date so the new row + total are visible.
      setAnchor(row.date);
    }
    setPrefsTick((n) => n + 1);
    setEntryOpen(false);
    setEditing(null);
    requestAnimationFrame(() => recordRef.current?.focus());
  }

  function askDelete(e: Expense) {
    if (window.confirm(`Delete ${money(e.amount)} · ${formatDate(e.date)}? This cannot be undone.`)) {
      remove(e.id);
      setDeleted(e);
    }
  }

  function undoDelete() {
    if (deleted) restore(deleted);
    setDeleted(null);
  }

  function importRows(rows: CsvImportRow[]) {
    addMany(rows);
    setPrefsTick((n) => n + 1);
  }

  return (
    <div className="flex flex-col gap-6">
      <CTASection
        compact
        heading="p"
        eyebrow="Overview"
        title="See where your spending moved."
        description="Compare periods, review the signals, and record expenses from one local dashboard."
        actionLabel=""
        actionHref=""
      />
      <div className="flex flex-wrap items-center justify-between gap-3">
        <ProfileControl name={prefs.profileName ?? ""} onChanged={() => setPrefsTick((n) => n + 1)} />
      </div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-[var(--muted-foreground)]">Recorded spending only — never a bank balance.</p>
        <Button ref={recordRef} onClick={openNew} aria-keyshortcuts="n">
          + Record <kbd className="mono text-xs">N</kbd>
        </Button>
      </div>

      <section aria-label="Selected period" className="sticky top-0 bg-[var(--background)] py-2">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2" role="group" aria-label="Period">
            <span aria-hidden="true" className="marker hidden sm:inline">[PERIOD]</span>
            {PERIODS.map((p) => (
              <Button key={p} variant={period === p ? "default" : "outline"} size="sm" aria-pressed={period === p} onClick={() => setPeriod(p)}>
                {p}
              </Button>
            ))}
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" aria-label="Previous period" onClick={() => setAnchor(movePeriod(anchor, period, -1))}>
              ‹ Prev
            </Button>
            <Button variant="ghost" size="sm" onClick={() => setAnchor(todayJakarta())}>
              Today
            </Button>
            <Button variant="outline" size="sm" aria-label="Next period" onClick={() => setAnchor(movePeriod(anchor, period, 1))}>
              Next ›
            </Button>
          </div>
        </div>
        <h1 className="mt-3 text-xl font-semibold">{range.label}</h1>
        <p className="mono mt-1 text-xs text-[var(--muted-foreground)]">
          {formatDateRange(cmp.curStart, cmp.curEnd)} · Asia/Jakarta
        </p>
      </section>

      <section aria-labelledby="total-heading" className="rounded-[var(--radius)] border border-[var(--border)] bg-[var(--card)] p-4">
        <h2 id="total-heading" className="text-sm text-[var(--muted-foreground)]">Recorded total</h2>
        <p className="mono my-2 text-[28px] font-semibold" aria-live="polite">
          {loading ? "…" : money(amount)}
        </p>
        <p aria-live="polite" className="text-sm">
          {cmp.kind === "future" ? (
            "Future period — no comparison yet."
          ) : !cmp.prevHasData ? (
            "Not enough history to compare yet."
          ) : (
            <>
              <strong>
                {cmp.change >= 0 ? "+" : "−"}
                {money(Math.abs(cmp.change))}
                {cmp.percent !== null ? ` (${cmp.change >= 0 ? "+" : ""}${cmp.percent.toFixed(1)}%)` : ""}
              </strong>{" "}
              vs {formatDateRange(cmp.prevStart, cmp.prevEnd)}
              {cmp.kind === "current" && <span className="text-[var(--muted-foreground)]"> · today incomplete</span>}
            </>
          )}
        </p>
      </section>

      {rows.length > 0 && topCategory && largest && (
        <section aria-labelledby="quickread-heading" className="rounded-[var(--radius)] border border-[var(--border)] bg-[var(--card)] p-4">
          <h2 id="quickread-heading" className="text-sm text-[var(--muted-foreground)]">Quick read</h2>
          <dl className="mt-2 flex flex-col gap-2 text-sm">
            <div className="flex items-baseline justify-between gap-3">
              <dt>Average per day</dt>
              <dd className="mono">{money(averagePerDay(amount, cmp.curStart, cmp.curEnd))}</dd>
            </div>
            <div className="flex items-baseline justify-between gap-3">
              <dt>Top category</dt>
              <dd className="text-right"><span className="mono">{money(topCategory.total)}</span> · {topCategory.category}</dd>
            </div>
            <div className="flex items-baseline justify-between gap-3">
              <dt>Largest expense</dt>
              <dd className="text-right"><span className="mono">{money(largest.amount)}</span> · {largest.merchant || largest.category}</dd>
            </div>
          </dl>
        </section>
      )}

      {signals.length > 0 && (
        <section aria-labelledby="signals-heading" className="flex flex-col gap-2">
          <h2 id="signals-heading" className="text-base font-semibold">
            <span aria-hidden="true" className="marker">[CHANGE] </span>What changed
          </h2>
          {signals.map((s) => (
            <a
              key={s.id}
              href={signalHref(s)}
              aria-label={s.text}
              className="block rounded-[var(--radius)] border border-[var(--border)] bg-[var(--card)] p-3 hover:bg-[var(--muted)]"
            >
              <span className="text-xs text-[var(--muted-foreground)]">{s.title}</span>
              <span className="block text-sm">{s.text}</span>
            </a>
          ))}
        </section>
      )}

      <section aria-labelledby="cat-heading">
        <div className="mb-2 flex items-center justify-between">
          <h2 id="cat-heading" className="text-base font-semibold">By category</h2>
          <span className="mono text-xs text-[var(--muted-foreground)]">{rows.length} records</span>
        </div>
        {groups.length === 0 ? (
          <p className="text-sm text-[var(--muted-foreground)]">No recorded expenses in this period.</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Category</TableHead>
                <TableHead className="text-right">Count</TableHead>
                <TableHead className="text-right">Recorded</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {groups.map((g) => (
                <TableRow key={g.category}>
                  <TableCell>{g.category}</TableCell>
                  <TableCell className="mono text-right">{g.count}</TableCell>
                  <TableCell className="mono text-right">{money(g.total)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
        <p className="mt-2 text-xs text-[var(--muted-foreground)]">
          Personal <span className="mono">{money(personal)}</span> · Work <span className="mono">{money(amount - personal)}</span>
        </p>
      </section>

      <section aria-labelledby="recent-heading">
        <div className="mb-2 flex items-center justify-between">
          <h2 id="recent-heading" className="text-base font-semibold">
            <span aria-hidden="true" className="marker">[RECORDS] </span>Recent transactions
          </h2>
          <a href="/transactions" className="text-sm underline-offset-4 hover:underline">
            View all
          </a>
        </div>
        {recent.length === 0 ? (
          <div className="rounded-[var(--radius)] border border-[var(--border)] p-4">
            <p className="text-sm">No expenses yet.</p>
            <p className="mt-2">
              <Button onClick={openNew}>Record first expense</Button>
            </p>
          </div>
        ) : (
          <ul>
            {recent.map((r) => (
              <li key={r.id} className="flex items-start justify-between gap-3 border-b border-[var(--border)] py-2">
                <div className="min-w-0">
                  <p className="truncate text-sm">{r.merchant || r.category}</p>
                  <p className="text-xs text-[var(--muted-foreground)]">
                    <span className="mono" title={r.date}>{formatDate(r.date)}</span> · {r.category} · {r.classification}
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <span className="mono text-sm">{money(r.amount)}</span>
                  <Button variant="ghost" size="sm" aria-label={`Edit ${r.merchant || r.category} ${formatDate(r.date)}`} onClick={() => { setEditing(r); setEntryOpen(true); }}>
                    Edit
                  </Button>
                  <Button variant="ghost" size="sm" aria-label={`Delete ${r.merchant || r.category} ${formatDate(r.date)}`} onClick={() => askDelete(r)}>
                    Del
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      <div className="flex flex-col gap-2">
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" onClick={() => downloadCSV(expenses)}>
            Export all (CSV)
          </Button>
        </div>
        <DataTools
          onRestored={() => {
            refresh();
            setPrefsTick((n) => n + 1);
          }}
          onImported={(rows) => importRows(rows)}
        />
      </div>

      <div className="fixed inset-x-0 bottom-0 border-t border-[var(--border)] bg-[var(--background)] p-3 sm:hidden">
        <Button className="w-full" onClick={openNew}>
          + Record expense
        </Button>
      </div>

      {deleted && (
        <UndoToast
          key={deleted.id}
          label={`Deleted ${money(deleted.amount)} · ${formatDate(deleted.date)}`}
          onUndo={undoDelete}
          onDone={() => setDeleted(null)}
        />
      )}

      {entryOpen && (
        <EntryForm
          key={editing?.id ?? "new"}
          open={entryOpen}
          editing={editing}
          defaultCategory={editing?.category ?? prefs.lastCategory}
          defaultClassification={editing?.classification ?? prefs.lastClassification}
          categories={categories}
          recentCategories={recentCategories}
          expenses={expenses}
          onSave={saveDraft}
          onClose={() => {
            setEntryOpen(false);
            setEditing(null);
          }}
        />
      )}
    </div>
  );
}
