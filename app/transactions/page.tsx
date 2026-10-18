"use client";

import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { CTASection } from "@/components/ui/hero-dithering-card";
import { Input, Select } from "@/components/ui/input";
import { EntryForm, type Draft } from "@/components/entry-form";
import { DataTools } from "@/components/data-tools";
import { UndoToast } from "@/components/undo-toast";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { QuickAdd } from "@/components/quick-add";
import { cn } from "@/components/ui/cn";
import { formatDate, formatDateRange, money, total, type Classification, type Expense } from "@/lib/calc";
import { downloadCSV, type CsvImportRow } from "@/lib/csv";
import { allCategories, loadPrefs } from "@/lib/storage";
import { useExpenses } from "@/components/expense-provider";
import { Skeleton, SkeletonRows } from "@/components/ui/skeleton";

function TransactionsPage() {
  const { expenses, loading, error, synced, add, update, remove, restore, addMany, refresh } = useExpenses();
  const [q, setQ] = useState("");
  const [category, setCategory] = useState("all");
  const [classification, setClassification] = useState<"all" | Classification>("all");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [editing, setEditing] = useState<Expense | null>(null);
  const [deleted, setDeleted] = useState<Expense | null>(null);
  const [pendingDelete, setPendingDelete] = useState<Expense | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState("");
  // Id of the row just added, so only that row plays the rise animation once.
  const [newId, setNewId] = useState<string | null>(null);
  const [entryOpen, setEntryOpen] = useState(false);
  const [prefsTick, setPrefsTick] = useState(0);

  // Signal deep-links reproduce exact filter state (PRD §8.2.2).
  // Read once on mount via location (static-export safe, no Suspense).
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("category")) setCategory(params.get("category")!);
    if (params.get("classification") === "personal" || params.get("classification") === "work")
      setClassification(params.get("classification") as Classification);
    if (params.get("from")) setFrom(params.get("from")!);
    if (params.get("to")) setTo(params.get("to")!);
  }, []);

  const categories = useMemo(() => allCategories(expenses), [expenses]);
  const prefs = useMemo(() => loadPrefs(), [prefsTick, expenses]);

  // Let the rise animation finish, then forget the id so filters and re-renders
  // never replay it.
  useEffect(() => {
    if (!newId) return;
    const t = setTimeout(() => setNewId(null), 200);
    return () => clearTimeout(t);
  }, [newId]);
  const recentCategories = useMemo(() => {
    const counts = new Map<string, number>();
    for (const e of expenses) counts.set(e.category, (counts.get(e.category) ?? 0) + 1);
    return [...counts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 3).map(([c]) => c);
  }, [expenses]);

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return expenses
      .filter((e) => (category === "all" ? true : e.category === category))
      .filter((e) => (classification === "all" ? true : e.classification === classification))
      .filter((e) => (from ? e.date >= from : true))
      .filter((e) => (to ? e.date <= to : true))
      .filter((e) =>
        needle ? `${e.merchant} ${e.note}`.toLowerCase().includes(needle) : true,
      )
      .sort((a, b) => b.date.localeCompare(a.date) || b.createdAt.localeCompare(a.createdAt));
  }, [expenses, q, category, classification, from, to]);

  const sum = total(filtered);
  const rangeLabel =
    from && to ? formatDateRange(from, to) : from ? `${formatDate(from)} — …` : to ? `… — ${formatDate(to)}` : "all dates";

  function clear() {
    setQ("");
    setCategory("all");
    setClassification("all");
    setFrom("");
    setTo("");
  }

  async function saveDraft(draft: Draft, editingId?: string) {
    // Throws on synced-write failure: EntryForm stays open and shows error.
    if (editingId) await update(editingId, draft);
    else {
      const row = await add(draft);
      setNewId(row.id);
    }
    setPrefsTick((n) => n + 1);
    setEditing(null);
    setEntryOpen(false);
  }

  async function askDelete(r: Expense) {
    setDeleteError("");
    setPendingDelete(r);
  }

  async function confirmDelete() {
    if (!pendingDelete) return;
    setDeleting(true);
    setDeleteError("");
    try {
      await remove(pendingDelete.id);
      setDeleted(pendingDelete);
      setPendingDelete(null);
    } catch (err) {
      // The row is kept and the message stays inside the dialog for a retry.
      setDeleteError(err instanceof Error ? err.message : "Could not delete that expense.");
    } finally {
      setDeleting(false);
    }
  }

  async function undoDelete() {
    if (!deleted) return;
    try {
      await restore(deleted);
      setDeleted(null);
    } catch {
      // Hook error banner below shows the retryable message.
    }
  }

  async function importRows(rows: CsvImportRow[]) {
    await addMany(rows);
    setPrefsTick((n) => n + 1);
  }

  return (
    <div className="flex flex-col gap-4">
      <CTASection
        compact
        eyebrow="Transactions"
        title="Keep every expense easy to find."
        description="Search, filter, edit, and export your expense records."
        actionLabel=""
        actionHref=""
      />

      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-[var(--muted-foreground)]">
          {synced ? "Synced across your devices." : "Stored on this device."}
        </p>
        <Button onClick={() => { setEditing(null); setEntryOpen(true); }}>
          + Record expense
        </Button>
      </div>
      {error && (
        <p role="alert" className="text-sm text-[var(--destructive)]">
          {error}
        </p>
      )}

      <div className="flex flex-col gap-2 rounded-[var(--radius)] border border-[var(--border)] bg-[var(--card)] p-3">
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          <label className="block text-xs">
            Search merchant / note
            <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="warung, print…" aria-label="Search merchant or note" />
          </label>
          <label className="block text-xs">
            Category
            <Select value={category} onChange={(e) => setCategory(e.target.value)} aria-label="Filter by category">
              <option value="all">All categories</option>
              {categories.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </Select>
          </label>
          <label className="block text-xs">
            Classification
            <Select
              value={classification}
              onChange={(e) => setClassification(e.target.value as "all" | Classification)}
              aria-label="Filter by classification"
            >
              <option value="all">Personal + Work</option>
              <option value="personal">Personal</option>
              <option value="work">Work</option>
            </Select>
          </label>
          <div className="flex gap-2">
            <label className="block min-w-0 flex-1 text-xs">
              From
              <Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} aria-label="From date" />
            </label>
            <label className="block min-w-0 flex-1 text-xs">
              To
              <Input type="date" value={to} onChange={(e) => setTo(e.target.value)} aria-label="To date" />
            </label>
          </div>
        </div>
        <div className="flex flex-col gap-2">
          <div className="flex flex-wrap gap-2">
            <Button variant="ghost" size="sm" onClick={clear}>
              Clear filters
            </Button>
            <Button variant="outline" size="sm" onClick={() => downloadCSV(filtered)}>
              Export filtered (CSV)
            </Button>
          </div>
          <DataTools onRestored={() => { void refresh(); }} onImported={(rows) => importRows(rows)} />
        </div>
      </div>

      <p aria-live="polite" className="text-sm">
        {loading ? (
          <Skeleton className="inline-block h-4 w-56 align-middle" />
        ) : (
          <><span className="mono">{money(sum)}</span> recorded across <span className="mono">{filtered.length}</span> expenses · {rangeLabel}</>
        )}
      </p>

      <QuickAdd
        onSave={saveDraft}
        defaultCategory={prefs.lastCategory}
        defaultClassification={prefs.lastClassification}
        categories={categories}
        recentCategories={recentCategories}
      />

      {loading ? (
        <SkeletonRows rows={5} />
      ) : filtered.length === 0 ? (
        expenses.length === 0 ? (
          <div className="rounded-[var(--radius)] border border-[var(--border)] p-4">
            <p className="text-sm">No expenses yet.</p>
            <p className="mt-2">
              <Button onClick={() => { setEditing(null); setEntryOpen(true); }}>Record your first expense</Button>
            </p>
          </div>
        ) : (
          <p className="text-sm text-[var(--muted-foreground)]">
            0 expenses match this filter. <Button variant="link" onClick={clear}>Clear filters</Button>
          </p>
        )
      ) : (
        <ul>
          {filtered.map((r) => (
            <li key={r.id} className={cn("flex items-start justify-between gap-3 border-b border-[var(--border)] py-2 transition-colors hover:bg-[var(--muted)]", r.id === newId && "surface-in")}>
              <div className="min-w-0">
                <p className="truncate text-sm">{r.merchant || r.category}</p>
                <p className="text-xs text-[var(--muted-foreground)]">
                  <span className="mono" title={r.date}>{formatDate(r.date)}</span> · {r.category} · {r.classification}
                  {r.note ? ` · ${r.note}` : ""}
                </p>
              </div>
              <div className="flex shrink-0 items-center gap-2">
                <span className="mono text-sm">{money(r.amount)}</span>
                <Button variant="ghost" size="sm" aria-label={`Edit ${formatDate(r.date)} ${money(r.amount)}`} onClick={() => setEditing(r)}>
                  Edit
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  aria-label={`Delete ${formatDate(r.date)} ${money(r.amount)}`}
                  onClick={() => askDelete(r)}
                >
                  Del
                </Button>
              </div>
            </li>
          ))}
        </ul>
      )}

      {entryOpen && (
        <EntryForm
          key="new"
          open={entryOpen}
          editing={null}
          defaultCategory={prefs.lastCategory}
          defaultClassification={prefs.lastClassification}
          categories={categories}
          recentCategories={recentCategories}
          expenses={expenses}
          submitError={error}
          onSave={saveDraft}
          onClose={() => setEntryOpen(false)}
        />
      )}

      <ConfirmDialog
        open={pendingDelete !== null}
        title="Delete this expense?"
        description={
          pendingDelete
            ? `${money(pendingDelete.amount)} · ${formatDate(pendingDelete.date)}${pendingDelete.merchant ? ` · ${pendingDelete.merchant}` : ""}. This cannot be undone.`
            : undefined
        }
        busy={deleting}
        error={deleteError}
        onConfirm={confirmDelete}
        onClose={() => {
          setPendingDelete(null);
          setDeleteError("");
        }}
      />

      {deleted && (
        <UndoToast
          key={deleted.id}
          label={`Deleted ${money(deleted.amount)} · ${formatDate(deleted.date)}`}
          onUndo={undoDelete}
          onDone={() => setDeleted(null)}
        />
      )}

      {editing && (
        <EntryForm
          key={editing.id}
          open
          editing={editing}
          defaultCategory={editing.category}
          defaultClassification={editing.classification}
          categories={categories}
          recentCategories={[]}
          expenses={expenses}
          submitError={error}
          onSave={saveDraft}
          onClose={() => setEditing(null)}
        />
      )}
    </div>
  );
}

export default TransactionsPage;
