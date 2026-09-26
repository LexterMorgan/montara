import { test } from "node:test";
import assert from "node:assert/strict";
import { toExpense, toInsert, type ExpenseRow } from "./sync.ts";
import type { Expense } from "./calc.ts";

const row = (over: Partial<ExpenseRow> = {}): ExpenseRow => ({
  id: "11111111-1111-4111-8111-111111111111",
  user_id: "22222222-2222-4222-8222-222222222222",
  amount_idr: 75000,
  date: "2026-09-26",
  category: "Food",
  classification: "personal",
  merchant: "Warung",
  note: "lunch",
  created_at: "2026-09-26T00:00:00.000Z",
  updated_at: "2026-09-26T01:00:00.000Z",
  ...over,
});

const expense = (over: Partial<Expense> = {}): Expense => ({
  id: "11111111-1111-4111-8111-111111111111",
  amount: 75000,
  date: "2026-09-26",
  category: "Food",
  classification: "personal",
  merchant: "Warung",
  note: "lunch",
  createdAt: "2026-09-26T00:00:00.000Z",
  updatedAt: "2026-09-26T01:00:00.000Z",
  ...over,
});

test("snake_case rows map to the Expense shape", () => {
  const e = toExpense(row());
  assert.equal(e.id, "11111111-1111-4111-8111-111111111111");
  assert.equal(e.amount, 75000);
  assert.equal(e.date, "2026-09-26");
  assert.equal(e.category, "Food");
  assert.equal(e.classification, "personal");
  assert.equal(e.merchant, "Warung");
  assert.equal(e.note, "lunch");
  assert.equal(e.createdAt, "2026-09-26T00:00:00.000Z");
  assert.equal(e.updatedAt, "2026-09-26T01:00:00.000Z");
});

test("rupiah values stay safe integers", () => {
  const e = toExpense(row({ amount_idr: 9999999999 }));
  assert.equal(e.amount, 9999999999);
  assert.ok(Number.isSafeInteger(e.amount));
});

test("empty optional text becomes empty strings", () => {
  const e = toExpense(row({ merchant: null, note: null }));
  assert.equal(e.merchant, "");
  assert.equal(e.note, "");
});

test("outbound rows take user_id from the session argument", () => {
  const a = toInsert(expense(), "user-a");
  const b = toInsert(expense(), "user-b");
  assert.equal(a.user_id, "user-a");
  assert.equal(b.user_id, "user-b");
  const sneaky = toInsert({ ...expense(), user_id: "intruder" } as unknown as Expense, "real-user");
  assert.equal(sneaky.user_id, "real-user");
});

test("outbound rows map camelCase to snake_case and keep UUIDs/timestamps", () => {
  const out = toInsert(expense(), "user-a");
  assert.equal(out.id, "11111111-1111-4111-8111-111111111111");
  assert.equal(out.amount_idr, 75000);
  assert.equal(out.date, "2026-09-26");
  assert.equal(out.created_at, "2026-09-26T00:00:00.000Z");
  assert.equal(out.updated_at, "2026-09-26T01:00:00.000Z");
});
