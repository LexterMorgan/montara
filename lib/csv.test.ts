import { test } from "node:test";
import assert from "node:assert/strict";
import { csvFilename, escapeCell, parseCSVImport, toCSV } from "./csv.ts";
import type { Expense } from "./calc.ts";

const row = (over: Partial<Expense> = {}): Expense => ({
  id: "1",
  amount: 50_000,
  date: "2026-09-17",
  category: "Food",
  classification: "personal",
  merchant: "",
  note: "",
  createdAt: "2026-09-17T00:00:00.000Z",
  updatedAt: "2026-09-17T00:00:00.000Z",
  ...over,
});

test("formula cells are guarded, quoting is RFC-4180", () => {
  assert.equal(escapeCell("=SUM(A1)"), "'=SUM(A1)");
  assert.equal(escapeCell("+62"), "'+62");
  assert.equal(escapeCell("a,b"), '"a,b"');
  assert.equal(escapeCell('q"q'), '"q""q"');
});

test("csv has BOM, header order, CRLF", () => {
  const out = toCSV([row({ merchant: "=cmd", note: "a,b" })]);
  assert.ok(out.startsWith("﻿date,amount_idr,category,classification,merchant,note,payment_method,created_at,updated_at\r\n"));
  assert.ok(out.includes("'=cmd"));
  assert.ok(out.includes('"a,b"'));
  assert.ok(out.endsWith("\r\n"));
  assert.match(csvFilename(new Date("2026-09-18T00:00:00Z")), /^montara-expenses-20260918-\d{4}\.csv$/);
});

test("empty export is header-only, never 0-byte", () => {
  const out = toCSV([]);
  assert.ok(out.length > 0);
  assert.equal(out.trim().split("\r\n").length, 1);
});

test("export round-trips through import", () => {
  const rows = [row({ merchant: "=cmd", note: "a,b" }), row({ id: "2", date: "2026-09-18", classification: "work" })];
  const back = parseCSVImport(toCSV(rows));
  assert.equal(back.length, 2);
  assert.deepEqual(back[0], {
    date: "2026-09-17",
    amount: 50000,
    category: "Food",
    classification: "personal",
    merchant: "=cmd",
    note: "a,b",
  });
  assert.equal(back[1].classification, "work");
});

test("import rejects missing headers and bad rows with line numbers", () => {
  assert.throws(() => parseCSVImport("date,amount\n2026-09-17,5"), /Missing required column: amount_idr/);
  assert.throws(() => parseCSVImport(""), /No rows found/);
  const header = "date,amount_idr,category,classification,merchant,note";
  assert.throws(
    () => parseCSVImport([header, "2026-09-17,50000,Food,personal,W,", "2026-02-29,100,Food,personal,,,"].join("\r\n")),
    /Row 3: bad date/,
  );
  assert.throws(
    () => parseCSVImport([header, "2026-09-17,0,Food,personal,,,"].join("\n")),
    /Row 2: bad amount/,
  );
  assert.throws(
    () => parseCSVImport([header, "2026-09-17,100,Food,biz,,,"].join("\n")),
    /Row 2: bad classification/,
  );
});

test("import tolerates missing optionals, extra columns, and blank lines", () => {
  const out = parseCSVImport(
    "date,amount_idr,category,classification,payment_method,created_at\r\n2026-09-17,100,Food,personal,QRIS,x\r\n\r\n",
  );
  assert.deepEqual(out, [
    { date: "2026-09-17", amount: 100, category: "Food", classification: "personal", merchant: "", note: "" },
  ]);
});
