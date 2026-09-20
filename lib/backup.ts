// Local JSON backup/restore. No upload, no server: file download + file input only.
import { toUTC, type Expense } from "./calc.ts";
import { loadExpenses, loadPrefs, type Prefs } from "./storage.ts";

export const BACKUP_VERSION = 1;
export const BACKUP_FILENAME = "montara-backup.json";

export type BackupPayload = {
  version: 1;
  exportedAt: string;
  expenses: Expense[];
  prefs: Prefs;
};

function isValidExpense(v: unknown): v is Expense {
  if (typeof v !== "object" || v === null) return false;
  const e = v as Record<string, unknown>;
  return (
    typeof e.id === "string" &&
    e.id.length > 0 &&
    typeof e.amount === "number" &&
    Number.isInteger(e.amount) &&
    e.amount >= 1 &&
    e.amount <= 9_999_999_999 &&
    typeof e.date === "string" &&
    toUTC(e.date) !== null &&
    typeof e.category === "string" &&
    e.category.trim().length >= 1 &&
    e.category.trim().length <= 40 &&
    (e.classification === "personal" || e.classification === "work") &&
    (e.merchant === undefined || typeof e.merchant === "string") &&
    (e.note === undefined || typeof e.note === "string")
  );
}

function normalizeExpense(v: Expense): Expense {
  return {
    id: v.id,
    amount: v.amount,
    date: v.date,
    category: v.category,
    classification: v.classification,
    merchant: typeof v.merchant === "string" ? v.merchant : "",
    note: typeof v.note === "string" ? v.note : "",
    createdAt: typeof v.createdAt === "string" ? v.createdAt : new Date().toISOString(),
    updatedAt: typeof v.updatedAt === "string" ? v.updatedAt : new Date().toISOString(),
  };
}

// Unknown preference fields are ignored; only known keys are kept.
function normalizePrefs(v: unknown): Prefs {
  const p = (typeof v === "object" && v !== null ? v : {}) as Record<string, unknown>;
  return {
    lastCategory: typeof p.lastCategory === "string" && p.lastCategory ? p.lastCategory : "Food",
    lastClassification: p.lastClassification === "work" ? "work" : "personal",
    profileName:
      typeof p.profileName === "string" ? p.profileName.trim().slice(0, 40) : "",
  };
}

// Throws on malformed payloads. Validates everything before the caller writes.
export function parseBackup(text: string): BackupPayload {
  let raw: unknown;
  try {
    raw = JSON.parse(text);
  } catch {
    throw new Error("That file is not valid JSON.");
  }
  if (typeof raw !== "object" || raw === null) throw new Error("That file is not a Montara backup.");
  const b = raw as Record<string, unknown>;
  if (b.version !== BACKUP_VERSION) throw new Error("Unsupported backup version.");
  if (typeof b.exportedAt !== "string") throw new Error("That file is not a Montara backup.");
  if (!Array.isArray(b.expenses)) throw new Error("That file is not a Montara backup.");
  for (const item of b.expenses) {
    if (!isValidExpense(item)) throw new Error("Backup contains an invalid expense (bad date, amount, or classification).");
  }
  return {
    version: 1,
    exportedAt: b.exportedAt,
    expenses: (b.expenses as Expense[]).map(normalizeExpense),
    prefs: normalizePrefs(b.prefs),
  };
}

export function buildBackup(): BackupPayload {
  return {
    version: BACKUP_VERSION,
    exportedAt: new Date().toISOString(),
    expenses: loadExpenses(),
    prefs: loadPrefs(),
  };
}

export function downloadBackup(): void {
  const blob = new Blob([JSON.stringify(buildBackup(), null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = BACKUP_FILENAME;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
