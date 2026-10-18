"use client";

import { useEffect, useRef, useState, type FormEvent, type ReactNode } from "react";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import type { Draft } from "./entry-form";
import { todayJakarta, validateDraft, money, type Classification } from "@/lib/calc";
import { orderCategories } from "@/lib/storage";

type QuickAddProps = {
  // The page's own draft handler: same add path the EntryForm dialog uses.
  onSave: (draft: Draft) => Promise<unknown>;
  defaultCategory: string;
  defaultClassification: Classification;
  categories: string[];
  recentCategories: string[];
};

// Repeat-entry bar for the common case: amount, category, Personal/Work, Add.
// The dialog stays the full editor for dates, merchants, and notes.
export function QuickAdd({ onSave, defaultCategory, defaultClassification, categories, recentCategories }: QuickAddProps) {
  const [amount, setAmount] = useState("");
  const [category, setCategory] = useState(defaultCategory);
  const [classification, setClassification] = useState<Classification>(defaultClassification);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const amountRef = useRef<HTMLInputElement>(null);
  const lastAdd = useRef(0);
  const picked = useRef(false);

  // A static export prerenders with the SSR prefs default, so adopt the stored
  // prefs once they arrive, unless the user already tapped a chip.
  useEffect(() => {
    if (picked.current) return;
    setCategory(defaultCategory);
    setClassification(defaultClassification);
  }, [defaultCategory, defaultClassification]);

  const ordered = orderCategories(recentCategories, categories);

  async function save(e?: FormEvent) {
    e?.preventDefault();
    if (busy) return;
    const now = Date.now();
    if (now - lastAdd.current < 300) return; // double-submit coalesce of a valid draft, PRD §5.7
    const date = todayJakarta();
    const raw = { amount: amount.trim(), date, category, classification, merchant: "", note: "" };
    const errors = validateDraft(raw, date);
    const message = errors.amount ?? errors.category ?? errors.classification ?? errors.date;
    if (message) {
      // Keep the typed amount; the input stays focused so a fix is one keystroke.
      setError(message);
      amountRef.current?.focus();
      return;
    }
    // Only a valid submit arms the guard, so fixing a rejected draft is never swallowed.
    lastAdd.current = now;
    setBusy(true);
    setError("");
    try {
      await onSave({ amount: Number(raw.amount), date, category, classification, merchant: "", note: "" });
      setAmount("");
      // Category and Personal/Work stay selected for fast repeat entry.
      requestAnimationFrame(() => amountRef.current?.focus());
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save that expense.");
      amountRef.current?.focus();
    }
    setBusy(false);
  }

  return (
    <form noValidate onSubmit={save} aria-label="Quick add expense" className="surface-in rounded-[var(--radius)] border border-[var(--border)] bg-[var(--card)] p-3">
      <div className="flex items-center gap-2">
        <label htmlFor="qa-amount" className="sr-only">
          Amount · IDR
        </label>
        <Input
          ref={amountRef}
          id="qa-amount"
          name="amount"
          inputMode="numeric"
          autoComplete="off"
          placeholder="0"
          value={amount}
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? "qa-error" : undefined}
          onChange={(e) => {
            if (/^\d{0,10}$/.test(e.target.value)) {
              setAmount(e.target.value);
              setError("");
            } else {
              setError("Use digits only, no separators or decimals.");
            }
          }}
          className="mono h-12 min-w-0 flex-1 text-[20px] sm:h-11 sm:text-[24px]"
        />
        <Button type="submit" disabled={busy}>
          {busy ? "Adding…" : "Add"}
        </Button>
      </div>

      {/* Decorative echo of the digits above: the input stays the accessible value. */}
      <p aria-hidden="true" className="mono mt-1 h-5 text-sm text-[var(--muted-foreground)]">
        {amount ? money(Number(amount)) : ""}
      </p>

      <div className="mt-3 flex items-center gap-2">
        <div role="group" aria-label="Category" className="flex min-w-0 flex-1 gap-1 overflow-x-auto pb-0.5">
          {ordered.map((c) => (
            <Chip
              key={c}
              active={c === category}
              onClick={() => {
                picked.current = true;
                setCategory(c);
              }}
            >
              {c}
            </Chip>
          ))}
        </div>
        <div role="group" aria-label="Classification" className="flex shrink-0 gap-1">
          {(["personal", "work"] as const).map((k) => (
            <Chip
              key={k}
              active={k === classification}
              onClick={() => {
                picked.current = true;
                setClassification(k);
              }}
            >
              {k === "personal" ? "Personal" : "Work"}
            </Chip>
          ))}
        </div>
      </div>

      {error && (
        <p id="qa-error" role="alert" className="mt-2 text-xs text-[var(--destructive)]">
          {error}
        </p>
      )}
    </form>
  );
}

function Chip({ active, onClick, children }: { active: boolean; onClick: () => void; children: ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={`inline-flex min-h-11 shrink-0 items-center rounded-[var(--radius)] border border-[var(--border)] px-3 text-[13px] transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[color:var(--primary)] sm:min-h-9 ${
        active ? "bg-[var(--primary)] text-[var(--primary-foreground)]" : "bg-transparent hover:bg-[var(--muted)]"
      }`}
    >
      {children}
    </button>
  );
}
