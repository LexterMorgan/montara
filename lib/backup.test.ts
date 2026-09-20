import { test } from "node:test";
import assert from "node:assert/strict";
import { BACKUP_FILENAME, BACKUP_VERSION, buildBackup, parseBackup } from "./backup.ts";

const good = () =>
  JSON.stringify({
    version: 1,
    exportedAt: "2026-09-18T00:00:00.000Z",
    expenses: [
      {
        id: "a1",
        amount: 50000,
        date: "2026-09-18",
        category: "Food",
        classification: "personal",
        merchant: "Warung",
        note: "",
        createdAt: "2026-09-18T00:00:00.000Z",
        updatedAt: "2026-09-18T00:00:00.000Z",
      },
    ],
    prefs: { lastCategory: "Food", lastClassification: "personal", profileName: "Lex", extra: "ignored" },
  });

test("backup filename and version", () => {
  assert.equal(BACKUP_FILENAME, "montara-backup.json");
  assert.equal(BACKUP_VERSION, 1);
});

test("valid backup parses; unknown prefs ignored", () => {
  const p = parseBackup(good());
  assert.equal(p.version, 1);
  assert.equal(p.expenses.length, 1);
  assert.equal(p.prefs.profileName, "Lex");
  assert.ok(!("extra" in p.prefs));
});

test("malformed JSON and wrong version rejected", () => {
  assert.throws(() => parseBackup("{nope"), /valid JSON/);
  assert.throws(() => parseBackup(JSON.stringify({ version: 2, exportedAt: "x", expenses: [] })), /version/);
  assert.throws(() => parseBackup(JSON.stringify({ version: 1 })), /backup/);
});

test("invalid expenses rejected: date, amount, classification", () => {
  const base = JSON.parse(good());
  const badDate = { ...base, expenses: [{ ...base.expenses[0], date: "2026-02-29" }] };
  assert.throws(() => parseBackup(JSON.stringify(badDate)), /invalid expense/);
  const badAmount = { ...base, expenses: [{ ...base.expenses[0], amount: 0 }] };
  assert.throws(() => parseBackup(JSON.stringify(badAmount)), /invalid expense/);
  const badClass = { ...base, expenses: [{ ...base.expenses[0], classification: "biz" }] };
  assert.throws(() => parseBackup(JSON.stringify(badClass)), /invalid expense/);
  const badName = { ...base, expenses: [{ ...base.expenses[0], category: "x".repeat(41) }] };
  assert.throws(() => parseBackup(JSON.stringify(badName)), /invalid expense/);
});

test("buildBackup is versioned with ISO timestamp (browser storage only)", () => {
  const b = buildBackup();
  assert.equal(b.version, 1);
  assert.ok(!Number.isNaN(Date.parse(b.exportedAt)));
  assert.ok(Array.isArray(b.expenses));
});
