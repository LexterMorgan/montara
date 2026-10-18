import { test } from "node:test";
import assert from "node:assert/strict";
import { orderCategories, sameIds } from "./storage.ts";
import type { Expense } from "./calc.ts";

const expense = (id: string): Expense => ({
  id,
  amount: 1000,
  date: "2026-10-01",
  category: "Food",
  classification: "personal",
  merchant: "",
  note: "",
  createdAt: "2026-10-01T00:00:00.000Z",
  updatedAt: "2026-10-01T00:00:00.000Z",
});

test("sameIds matches the same ids in any order", () => {
  assert.equal(sameIds([expense("a"), expense("b")], [expense("b"), expense("a")]), true);
});

test("sameIds rejects a different count", () => {
  assert.equal(sameIds([expense("a")], [expense("a"), expense("b")]), false);
});

test("sameIds rejects a different id", () => {
  assert.equal(sameIds([expense("a")], [expense("b")]), false);
});

test("sameIds rejects duplicates standing in for a missing id", () => {
  assert.equal(sameIds([expense("a"), expense("a")], [expense("a"), expense("b")]), false);
});

test("orderCategories puts recents first, then the rest", () => {
  assert.deepEqual(orderCategories(["Work Tools", "Food"], ["Food", "Housing", "Work Tools"]), ["Work Tools", "Food", "Housing"]);
});

test("orderCategories drops duplicates without dropping unknown recents", () => {
  assert.deepEqual(orderCategories(["Food", "Food", "Legacy"], ["Food", "Housing"]), ["Food", "Legacy", "Housing"]);
});

test("orderCategories is the plain list when there are no recents", () => {
  assert.deepEqual(orderCategories([], ["Food", "Housing"]), ["Food", "Housing"]);
});
