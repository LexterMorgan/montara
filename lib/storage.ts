// Tiny localStorage wrapper per ARCHITECTURE §3. No servers, no deps.
"use client";

import { useEffect, useState } from "react";
import type { Classification, Expense } from "./calc";

export const EXPENSE_KEY = "montara.expenses.v1";
export const PREFS_KEY = "montara.prefs.v1";

export const DEFAULT_CATEGORIES = [
  "Food",
  "Transport",
  "Housing",
  "Bills",
  "Health",
  "Fun",
  "Shopping",
  "Education",
  "Work Direct Cost",
  "Work Tools",
  "Other",
];

export type Prefs = { lastCategory: string; lastClassification: Classification; profileName?: string };

export const PROFILE_NAME_MAX = 40;

export function sanitizeProfileName(v: unknown): string {
  if (typeof v !== "string") return "";
  return v.trim().slice(0, PROFILE_NAME_MAX);
}

function readJSON<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function isExpense(v: unknown): v is Expense {
  if (typeof v !== "object" || v === null) return false;
  const e = v as Record<string, unknown>;
  return (
    typeof e.id === "string" &&
    typeof e.amount === "number" &&
    Number.isInteger(e.amount) &&
    typeof e.date === "string" &&
    typeof e.category === "string" &&
    (e.classification === "personal" || e.classification === "work")
  );
}

export function loadExpenses(): Expense[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(EXPENSE_KEY);
    if (!raw) return [];
    const arr = JSON.parse(raw);
    if (!Array.isArray(arr)) return [];
    return arr.filter(isExpense);
  } catch {
    return [];
  }
}

export function loadPrefs(): Prefs {
  if (typeof window === "undefined") return { lastCategory: "Food", lastClassification: "personal", profileName: "" };
  const p = readJSON<Partial<Prefs>>(PREFS_KEY, {});
  return {
    lastCategory: typeof p.lastCategory === "string" && p.lastCategory ? p.lastCategory : "Food",
    lastClassification: p.lastClassification === "work" ? "work" : "personal",
    profileName: sanitizeProfileName(p.profileName),
  };
}

// Merge patch over stored prefs so unrelated fields (e.g. profileName) survive.
export function savePrefs(patch: Partial<Prefs>): Prefs {
  const current = loadPrefs();
  const next: Prefs = {
    ...current,
    ...patch,
    profileName: patch.profileName === undefined ? current.profileName : sanitizeProfileName(patch.profileName),
  };
  try {
    localStorage.setItem(PREFS_KEY, JSON.stringify(next));
  } catch {
    // prefs are best-effort; expenses already saved
  }
  return next;
}

export function usePrefsTick(deps: unknown[]): Prefs {
  // Re-read prefs after each save so repeat-entry defaults stay fresh.
  const [prefs, setPrefs] = useState<Prefs>({ lastCategory: "Food", lastClassification: "personal" });
  useEffect(() => {
    setPrefs(loadPrefs());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
  return prefs;
}

export function allCategories(expenses: Expense[]): string[] {
  const seen = new Set([...DEFAULT_CATEGORIES, ...expenses.map((e) => e.category)]);
  return [...seen].sort((a, b) => a.localeCompare(b));
}
