import { getSupabase } from "./supabase.ts";
import type { Expense } from "./calc.ts";

export type ExpenseRow = {
  id: string;
  user_id: string;
  amount_idr: number;
  date: string;
  category: string;
  classification: string;
  merchant: string | null;
  note: string | null;
  created_at: string;
  updated_at: string;
};

export type ExpenseInsert = {
  id: string;
  user_id: string;
  amount_idr: number;
  date: string;
  category: string;
  classification: string;
  merchant: string | null;
  note: string | null;
  created_at: string;
  updated_at: string;
};

const COLUMNS = "id,user_id,amount_idr,date,category,classification,merchant,note,created_at,updated_at";

// Pure mapping: database row -> UI Expense. Null optionals become "".
export function toExpense(row: ExpenseRow): Expense {
  return {
    id: row.id,
    amount: row.amount_idr,
    date: row.date,
    category: row.category,
    classification: row.classification === "work" ? "work" : "personal",
    merchant: typeof row.merchant === "string" ? row.merchant : "",
    note: typeof row.note === "string" ? row.note : "",
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

// Pure mapping: UI Expense -> database insert. user_id always comes from
// the authenticated session argument, never from caller-supplied data.
export function toInsert(expense: Expense, userId: string): ExpenseInsert {
  return {
    id: expense.id,
    user_id: userId,
    amount_idr: expense.amount,
    date: expense.date,
    category: expense.category,
    classification: expense.classification,
    merchant: expense.merchant ? expense.merchant : null,
    note: expense.note ? expense.note : null,
    created_at: expense.createdAt,
    updated_at: expense.updatedAt,
  };
}

function clientOrThrow() {
  const client = getSupabase();
  if (!client) throw new Error("Sync is not configured on this device.");
  return client;
}

function orderByRecent(list: Expense[]): Expense[] {
  return [...list].sort((a, b) => b.date.localeCompare(a.date) || b.createdAt.localeCompare(a.createdAt));
}

export async function listRemoteExpenses(): Promise<Expense[]> {
  const client = clientOrThrow();
  const { data, error } = await client.from("expenses").select(COLUMNS).order("date", { ascending: false });
  if (error || !data) throw new Error("Could not load synced expenses. Check your connection and try again.");
  return orderByRecent((data as ExpenseRow[]).map(toExpense));
}

export async function insertRemoteExpense(expense: Expense, userId: string): Promise<Expense> {
  const client = clientOrThrow();
  const { data, error } = await client
    .from("expenses")
    .insert(toInsert(expense, userId))
    .select(COLUMNS)
    .single();
  if (error || !data) throw new Error("Could not save that expense. Check your connection and try again.");
  return toExpense(data as ExpenseRow);
}

export async function updateRemoteExpense(expense: Expense, userId: string): Promise<Expense> {
  const client = clientOrThrow();
  const payload = { ...toInsert(expense, userId), updated_at: new Date().toISOString() };
  const { data, error } = await client
    .from("expenses")
    .update(payload)
    .eq("id", expense.id)
    .select(COLUMNS)
    .single();
  if (error || !data) throw new Error("Could not save those changes. Check your connection and try again.");
  return toExpense(data as ExpenseRow);
}

export async function deleteRemoteExpense(id: string): Promise<void> {
  const client = clientOrThrow();
  const { error } = await client.from("expenses").delete().eq("id", id);
  if (error) throw new Error("Could not delete that expense. Check your connection and try again.");
}

// Idempotent import: upserts by existing UUIDs. Never deletes.
export async function upsertRemoteExpenses(expenses: Expense[], userId: string): Promise<Expense[]> {
  if (expenses.length === 0) return [];
  const client = clientOrThrow();
  const payload = expenses.map((e) => toInsert(e, userId));
  const { data, error } = await client.from("expenses").upsert(payload, { onConflict: "id" }).select(COLUMNS);
  if (error || !data) throw new Error("Could not import those expenses. Check your connection and try again.");
  return orderByRecent((data as ExpenseRow[]).map(toExpense));
}

// Full replacement (JSON restore): upload first, delete obsolete rows only after upload succeeds.
export async function replaceRemoteExpenses(expenses: Expense[], userId: string): Promise<Expense[]> {
  const client = clientOrThrow();
  const existing = await listRemoteExpenses();
  const existingIds = new Set(existing.map((e) => e.id));
  if (expenses.length > 0) {
    const payload = expenses.map((e) => toInsert(e, userId));
    const { error } = await client.from("expenses").upsert(payload, { onConflict: "id" });
    if (error) throw new Error("Could not restore that backup. Check your connection and try again.");
  }
  const keep = new Set(expenses.map((e) => e.id));
  const obsolete = [...existingIds].filter((id) => !keep.has(id));
  if (obsolete.length > 0) {
    const { error } = await client.from("expenses").delete().in("id", obsolete);
    if (error) throw new Error("Could not restore that backup. Check your connection and try again.");
  } else if (expenses.length === 0 && existingIds.size > 0) {
    const { error } = await client.from("expenses").delete().neq("id", "00000000-0000-0000-0000-000000000000");
    if (error) throw new Error("Could not restore that backup. Check your connection and try again.");
  }
  return orderByRecent(expenses);
}
