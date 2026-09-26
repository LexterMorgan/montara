"use client";

import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import type { Expense } from "@/lib/calc";
import { EXPENSE_KEY, loadExpenses, savePrefs } from "@/lib/storage";
import { useAuth } from "./auth-provider";
import {
  deleteRemoteExpense,
  insertRemoteExpense,
  listRemoteExpenses,
  replaceRemoteExpenses,
  updateRemoteExpense,
  upsertRemoteExpenses,
} from "@/lib/sync";

export type ExpenseDraft = Omit<Expense, "id" | "createdAt" | "updatedAt">;

type ExpenseContextValue = {
  expenses: Expense[];
  loading: boolean;
  error: string;
  synced: boolean;
  localImportCount: number;
  importLocal: () => Promise<void>;
  add: (draft: ExpenseDraft) => Promise<Expense>;
  update: (id: string, draft: ExpenseDraft) => Promise<void>;
  remove: (id: string) => Promise<void>;
  restore: (row: Expense) => Promise<void>;
  addMany: (drafts: ExpenseDraft[]) => Promise<Expense[]>;
  replaceAll: (rows: Expense[]) => Promise<void>;
  refresh: () => Promise<void>;
};

const ExpenseContext = createContext<ExpenseContextValue | null>(null);

export function useExpenses(): ExpenseContextValue {
  const ctx = useContext(ExpenseContext);
  if (!ctx) throw new Error("useExpenses must be used inside ExpenseProvider.");
  return ctx;
}

export function ExpenseProvider({ children }: { children: ReactNode }) {
  const { user, loading: authLoading } = useAuth();
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [localImportCount, setLocalImportCount] = useState(0);
  const synced = user !== null;
  const syncedRef = useRef(false);
  syncedRef.current = synced;
  const userIdRef = useRef<string | null>(null);
  userIdRef.current = user?.id ?? null;
  const expensesRef = useRef<Expense[]>([]);
  expensesRef.current = expenses;

  // Local mode: initial load + cross-tab updates. Synced mode ignores these.
  useEffect(() => {
    if (syncedRef.current) return;
    const onStorage = (e: StorageEvent) => {
      if (e.key === EXPENSE_KEY && !syncedRef.current) setExpenses(loadExpenses());
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  // Persist local edits. Synced expenses live in Supabase only.
  useEffect(() => {
    if (loading || syncedRef.current) return;
    try {
      localStorage.setItem(EXPENSE_KEY, JSON.stringify(expenses));
    } catch {
      window.alert("Browser storage is full. Free space, then try again — your entry is still on screen.");
    }
  }, [expenses, loading]);

  // Auth transitions: sign in loads remote, sign out returns to local.
  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      setExpenses(loadExpenses());
      setLocalImportCount(0);
      setError("");
      setLoading(false);
      return;
    }
    let active = true;
    setLoading(true);
    setError("");
    setLocalImportCount(loadExpenses().length);
    listRemoteExpenses()
      .then((rows) => {
        if (active) {
          setExpenses(rows);
          setLoading(false);
        }
      })
      .catch((err) => {
        if (active) {
          setExpenses([]);
          setError(err instanceof Error ? err.message : "Could not load synced expenses.");
          setLoading(false);
        }
      });
    return () => {
      active = false;
    };
  }, [user, authLoading]);

  const fail = useCallback((err: unknown, fallback: string): never => {
    const message = err instanceof Error ? err.message : fallback;
    setError(message);
    throw err instanceof Error ? err : new Error(message);
  }, []);

  const add = useCallback(
    async (draft: ExpenseDraft): Promise<Expense> => {
      const now = new Date().toISOString();
      const row: Expense = { ...draft, id: crypto.randomUUID(), createdAt: now, updatedAt: now };
      if (!syncedRef.current || !userIdRef.current) {
        setExpenses((prev) => [row, ...prev]);
        savePrefs({ lastCategory: draft.category, lastClassification: draft.classification });
        return row;
      }
      try {
        const saved = await insertRemoteExpense(row, userIdRef.current);
        setExpenses((prev) => [saved, ...prev]);
        savePrefs({ lastCategory: draft.category, lastClassification: draft.classification });
        setError("");
        return saved;
      } catch (err) {
        return fail(err, "Could not save that expense.");
      }
    },
    [fail],
  );

  const update = useCallback(
    async (id: string, draft: ExpenseDraft): Promise<void> => {
      if (!syncedRef.current || !userIdRef.current) {
        setExpenses((prev) => prev.map((r) => (r.id === id ? { ...r, ...draft, updatedAt: new Date().toISOString() } : r)));
        return;
      }
      const existing = expensesRef.current.find((r) => r.id === id);
      if (!existing) throw new Error("That expense is no longer available. Refresh and try again.");
      const next: Expense = { ...existing, ...draft };
      try {
        const saved = await updateRemoteExpense(next, userIdRef.current);
        setExpenses((prev) => prev.map((r) => (r.id === id ? saved : r)));
        setError("");
      } catch (err) {
        fail(err, "Could not save those changes.");
      }
    },
    [fail],
  );

  const remove = useCallback(
    async (id: string): Promise<void> => {
      if (!syncedRef.current) {
        setExpenses((prev) => prev.filter((r) => r.id !== id));
        return;
      }
      try {
        await deleteRemoteExpense(id);
        setExpenses((prev) => prev.filter((r) => r.id !== id));
        setError("");
      } catch (err) {
        fail(err, "Could not delete that expense.");
      }
    },
    [fail],
  );

  const restore = useCallback(
    async (row: Expense): Promise<void> => {
      if (!syncedRef.current || !userIdRef.current) {
        setExpenses((prev) => {
          if (prev.some((r) => r.id === row.id)) return prev;
          return [row, ...prev];
        });
        return;
      }
      try {
        const saved = await insertRemoteExpense(row, userIdRef.current);
        setExpenses((prev) => (prev.some((r) => r.id === saved.id) ? prev : [saved, ...prev]));
        setError("");
      } catch (err) {
        fail(err, "Could not restore that expense.");
      }
    },
    [fail],
  );

  const addMany = useCallback(
    async (drafts: ExpenseDraft[]): Promise<Expense[]> => {
      if (drafts.length === 0) return [];
      const now = new Date().toISOString();
      const rows: Expense[] = drafts.map((d) => ({ ...d, id: crypto.randomUUID(), createdAt: now, updatedAt: now }));
      if (!syncedRef.current || !userIdRef.current) {
        setExpenses((prev) => [...rows, ...prev]);
        const last = drafts[drafts.length - 1];
        savePrefs({ lastCategory: last.category, lastClassification: last.classification });
        return rows;
      }
      try {
        const saved = await upsertRemoteExpenses(rows, userIdRef.current);
        setExpenses((prev) => [...saved, ...prev.filter((r) => !saved.some((s) => s.id === r.id))]);
        const last = drafts[drafts.length - 1];
        savePrefs({ lastCategory: last.category, lastClassification: last.classification });
        setError("");
        return saved;
      } catch (err) {
        return fail(err, "Could not import those expenses.");
      }
    },
    [fail],
  );

  const replaceAll = useCallback(
    async (rows: Expense[]): Promise<void> => {
      if (!syncedRef.current || !userIdRef.current) {
        setExpenses(rows);
        return;
      }
      try {
        const saved = await replaceRemoteExpenses(rows, userIdRef.current);
        setExpenses(saved);
        setError("");
      } catch (err) {
        fail(err, "Could not restore that backup.");
      }
    },
    [fail],
  );

  const refresh = useCallback(async (): Promise<void> => {
    if (!syncedRef.current) {
      setExpenses(loadExpenses());
      return;
    }
    try {
      setExpenses(await listRemoteExpenses());
      setError("");
    } catch (err) {
      fail(err, "Could not load synced expenses.");
    }
  }, [fail]);

  // One-time import of pre-sign-in local expenses. Clears local only on success.
  const importLocal = useCallback(async (): Promise<void> => {
    const userId = userIdRef.current;
    if (!syncedRef.current || !userId) throw new Error("Sign in before importing.");
    const local = loadExpenses();
    if (local.length === 0) {
      setLocalImportCount(0);
      return;
    }
    try {
      await upsertRemoteExpenses(local, userId);
      try {
        localStorage.removeItem(EXPENSE_KEY);
      } catch {
        // Import succeeded; a stale local copy is harmless and will be
        // overwritten by the next local-mode write.
      }
      setLocalImportCount(0);
      setExpenses(await listRemoteExpenses());
      setError("");
    } catch (err) {
      setLocalImportCount(loadExpenses().length);
      fail(err, "Could not import those expenses.");
    }
  }, [fail]);

  return (
    <ExpenseContext.Provider
      value={{ expenses, loading, error, synced, localImportCount, importLocal, add, update, remove, restore, addMany, replaceAll, refresh }}
    >
      {children}
    </ExpenseContext.Provider>
  );
}
