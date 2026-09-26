"use client";

import { useMemo, useRef, useState } from "react";
import { Button } from "./ui/button";
import { Dialog, DialogDescription, DialogTitle } from "./ui/dialog";
import { Input, Textarea } from "./ui/input";
import { suggestMerchants, todayJakarta, validateDraft, type Classification, type Expense, type MerchantSuggestion } from "@/lib/calc";

export type Draft = Omit<Expense, "id" | "createdAt" | "updatedAt">;

type Props = {
  open: boolean;
  editing?: Expense | null;
  defaultCategory: string;
  defaultClassification: Classification;
  categories: string[];
  recentCategories: string[];
  expenses?: Expense[];
  submitError?: string;
  onSave: (draft: Draft, editingId?: string) => void | Promise<void>;
  onClose: () => void;
};

export function EntryForm({ open, editing, defaultCategory, defaultClassification, categories, recentCategories, expenses = [], submitError = "", onSave, onClose }: Props) {
  const today = todayJakarta();
  const [initial] = useState(() => ({
    amount: editing ? String(editing.amount) : "",
    date: editing?.date ?? today,
    category: editing?.category ?? defaultCategory,
    classification: editing?.classification ?? defaultClassification,
    merchant: editing?.merchant ?? "",
    note: editing?.note ?? "",
  }));
  const [draft, setDraft] = useState<Record<string, string>>(initial);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const lastTap = useRef(0);
  const amountRef = useRef<HTMLInputElement>(null);
  const dirty = JSON.stringify(draft) !== JSON.stringify(initial);

  // Merchant memory: suggestions only fill fields on explicit select (click or
  // Enter on a highlighted option). Typing never overwrites category/classification.
  const [suggestOpen, setSuggestOpen] = useState(false);
  const [activeIdx, setActiveIdx] = useState(0);
  const suggestions = useMemo(() => suggestMerchants(expenses, draft.merchant), [expenses, draft.merchant]);
  const showSuggest = suggestOpen && draft.merchant.trim() !== "" && suggestions.length > 0;

  function selectSuggestion(s: MerchantSuggestion) {
    setDraft((p) => ({ ...p, merchant: s.merchant, category: s.category, classification: s.classification }));
    setErrors((p) => ({ ...p, merchant: "", category: "", classification: "" }));
    setSuggestOpen(false);
  }

  if (!open) return null;

  function change(name: string, value: string) {
    setDraft((p) => ({ ...p, [name]: value }));
    setErrors((p) => ({ ...p, [name]: "" }));
  }

  function close() {
    if (dirty && !window.confirm("Discard this draft?")) return;
    onClose();
  }

  async function save(e?: React.FormEvent) {
    e?.preventDefault();
    if (saving) return;
    const now = Date.now();
    if (now - lastTap.current < 300) return; // double-tap coalesce, PRD §5.7
    const errs = validateDraft(draft, todayJakarta());
    setErrors(errs);
    if (Object.keys(errs).length > 0) {
      requestAnimationFrame(() =>
        document.querySelector<HTMLElement>("[aria-invalid='true']")?.focus(),
      );
      return;
    }
    lastTap.current = now;
    setSaving(true);
    try {
      await onSave(
        {
          amount: Number(draft.amount),
          date: draft.date,
          category: draft.category.trim(),
          classification: draft.classification as Classification,
          merchant: draft.merchant.trim(),
          note: draft.note.trim(),
        },
        editing?.id,
      );
    } catch {
      // Parent keeps the hook error in submitError; stay open for retry.
      setSaving(false);
    }
  }

  const ordered = [...recentCategories.filter((c) => categories.includes(c)), ...categories.filter((c) => !recentCategories.includes(c))];

  return (
    <Dialog open={open} onClose={close} labelledBy="entry-title">
      <DialogTitle id="entry-title">{editing ? "Edit expense" : "Record an expense"}</DialogTitle>
      <DialogDescription>Tab moves forward. ⌘/Ctrl+Enter saves. Esc closes.</DialogDescription>
      <form
        noValidate
        onSubmit={save}
        onKeyDown={(e) => {
          if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
            e.preventDefault();
            save();
          } else if (e.key === "Escape") {
            e.preventDefault();
            close();
          }
        }}
        className="mt-4 flex flex-col gap-4"
      >
        <div>
          <label htmlFor="ef-amount" className="mb-1 block text-xs font-medium">
            Amount · IDR
          </label>
          <Input
            ref={amountRef}
            id="ef-amount"
            name="amount"
            inputMode="numeric"
            autoComplete="off"
            placeholder="50000"
            // autoFocus would break strict-mode double render? plain ref focus:
            // eslint-disable-next-line jsx-a11y/no-autofocus
            autoFocus
            value={draft.amount}
            aria-invalid={!!errors.amount}
            onChange={(e) => {
              if (/^\d{0,10}$/.test(e.target.value)) change("amount", e.target.value);
              else setErrors((p) => ({ ...p, amount: "Use digits only, no separators or decimals." }));
            }}
          />
          {errors.amount && <p role="alert" className="mt-1 text-xs text-[var(--destructive)]">{errors.amount}</p>}
        </div>

        <div>
          <label htmlFor="ef-date" className="mb-1 block text-xs font-medium">
            Expense date
          </label>
          <Input
            id="ef-date"
            name="date"
            type="date"
            value={draft.date}
            aria-invalid={!!errors.date}
            onChange={(e) => change("date", e.target.value)}
          />
          {errors.date && <p role="alert" className="mt-1 text-xs text-[var(--destructive)]">{errors.date}</p>}
        </div>

        <div>
          <label htmlFor="ef-category" className="mb-1 block text-xs font-medium">
            Category
          </label>
          <Input
            id="ef-category"
            name="category"
            list="ef-categories"
            autoComplete="off"
            value={draft.category}
            aria-invalid={!!errors.category}
            onChange={(e) => change("category", e.target.value)}
          />
          <datalist id="ef-categories">
            {ordered.map((c) => (
              <option key={c} value={c} />
            ))}
          </datalist>
          {errors.category && <p role="alert" className="mt-1 text-xs text-[var(--destructive)]">{errors.category}</p>}
        </div>

        <div>
          <span id="ef-class-label" className="mb-1 block text-xs font-medium">
            Classification
          </span>
          <div role="group" aria-labelledby="ef-class-label" className="flex gap-2">
            {(["personal", "work"] as Classification[]).map((c) => (
              <Button
                key={c}
                type="button"
                variant={draft.classification === c ? "default" : "outline"}
                aria-pressed={draft.classification === c}
                onClick={() => change("classification", c)}
              >
                {c === "personal" ? "Personal" : "Work"}
              </Button>
            ))}
          </div>
          {errors.classification && <p role="alert" className="mt-1 text-xs text-[var(--destructive)]">{errors.classification}</p>}
        </div>

        <div>
          <label htmlFor="ef-merchant" className="mb-1 block text-xs font-medium">
            Merchant <span className="text-[var(--muted-foreground)]">(optional)</span>
          </label>
          <Input
            id="ef-merchant"
            value={draft.merchant}
            maxLength={61}
            autoComplete="off"
            role="combobox"
            aria-autocomplete="list"
            aria-expanded={showSuggest}
            aria-controls="ef-merchant-list"
            aria-activedescendant={showSuggest ? `ef-merchant-opt-${activeIdx}` : undefined}
            onChange={(e) => {
              change("merchant", e.target.value);
              setSuggestOpen(true);
              setActiveIdx(0);
            }}
            onFocus={() => {
              setSuggestOpen(true);
              setActiveIdx(0);
            }}
            onBlur={() => setSuggestOpen(false)}
            onKeyDown={(e) => {
              if (!showSuggest) return;
              if (e.key === "ArrowDown" || e.key === "ArrowUp") {
                e.preventDefault();
                setActiveIdx((i) => (e.key === "ArrowDown" ? (i + 1) % suggestions.length : (i - 1 + suggestions.length) % suggestions.length));
              } else if (e.key === "Enter" && !e.metaKey && !e.ctrlKey) {
                e.preventDefault();
                selectSuggestion(suggestions[activeIdx]);
              } else if (e.key === "Escape") {
                e.preventDefault();
                e.stopPropagation();
                setSuggestOpen(false);
              }
            }}
            aria-invalid={!!errors.merchant}
          />
          {showSuggest && (
            <ul id="ef-merchant-list" role="listbox" aria-label="Merchant suggestions" className="mt-1 overflow-hidden rounded-[var(--radius)] border border-[var(--border)] bg-[var(--card)]">
              {suggestions.map((s, i) => (
                <li key={s.merchant.toLowerCase()} id={`ef-merchant-opt-${i}`} role="option" aria-selected={i === activeIdx}>
                  <button
                    type="button"
                    tabIndex={-1}
                    onMouseDown={(e) => {
                      e.preventDefault();
                      selectSuggestion(s);
                    }}
                    onMouseMove={() => setActiveIdx(i)}
                    className={`flex w-full items-center justify-between gap-2 px-3 py-2 text-left text-sm ${i === activeIdx ? "bg-[var(--muted)]" : ""}`}
                  >
                    <span className="truncate">{s.merchant}</span>
                    <span className="shrink-0 text-xs text-[var(--muted-foreground)]">
                      {s.category} · {s.classification === "work" ? "Work" : "Personal"}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
          {errors.merchant && <p role="alert" className="mt-1 text-xs text-[var(--destructive)]">{errors.merchant}</p>}
        </div>

        <details>
          <summary className="cursor-pointer text-sm underline-offset-4 hover:underline">Add note (optional)</summary>
          <div className="mt-3">
            <div>
              <label htmlFor="ef-note" className="mb-1 block text-xs font-medium">
                Note <span className="text-[var(--muted-foreground)]">(optional)</span>
              </label>
              <Textarea id="ef-note" value={draft.note} maxLength={201} onChange={(e) => change("note", e.target.value)} aria-invalid={!!errors.note} />
              {errors.note && <p role="alert" className="mt-1 text-xs text-[var(--destructive)]">{errors.note}</p>}
            </div>
          </div>
        </details>

        <div className="flex items-center justify-between gap-3">
          <Button type="submit" disabled={saving}>
            {saving ? "Saving…" : editing ? "Save changes" : "Save expense"}
          </Button>
          <Button type="button" variant="ghost" onClick={close}>
            Cancel
          </Button>
        </div>
        {submitError && (
          <p role="alert" className="text-xs text-[var(--destructive)]">
            {submitError}
          </p>
        )}
        <p className="text-xs text-[var(--muted-foreground)]">
          <kbd className="mono">Tab</kbd> next · <kbd className="mono">⌘/Ctrl+Enter</kbd> save · <kbd className="mono">N</kbd> new ·{" "}
          <kbd className="mono">Esc</kbd> close
        </p>
      </form>
    </Dialog>
  );
}
