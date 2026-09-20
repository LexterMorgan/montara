import { test } from "node:test";
import assert from "node:assert/strict";
import {
  averagePerDay,
  buildSignals,
  comparePeriod,
  formatDate,
  formatDateRange,
  inRange,
  movePeriod,
  periodRange,
  suggestMerchants,
  total,
  validateDraft,
  type Expense,
} from "./calc.ts";

const e = (date: string, amount: number, category = "Food", classification: "personal" | "work" = "personal"): Expense => ({
  id: `${date}-${amount}-${category}`,
  amount,
  date,
  category,
  classification,
  merchant: "",
  note: "",
  createdAt: `${date}T00:00:00.000Z`,
  updatedAt: `${date}T00:00:00.000Z`,
});

test("week edges: Sunday belongs to prior week", () => {
  assert.deepEqual(periodRange("2026-09-17", "Week"), {
    start: "2026-09-14",
    end: "2026-09-20",
    label: "14–20 Sep 2026",
  });
  const rows = [e("2026-09-14", 50_000), e("2026-09-15", 120_000), e("2026-09-20", 30_000)];
  assert.equal(total(inRange(rows, "2026-09-14", "2026-09-20")), 200_000);
  assert.equal(total(inRange([e("2026-09-13", 10_000)], "2026-09-14", "2026-09-20")), 0);
});

test("formatDate renders day-first English, falls back on bad input", () => {
  assert.equal(formatDate("2026-09-17"), "17 Sep 2026");
  assert.equal(formatDate("2026-01-05"), "5 Jan 2026");
  assert.equal(formatDate("not-a-date"), "not-a-date");
});

test("formatDateRange collapses same month, splits month and year", () => {
  assert.equal(formatDateRange("2026-09-01", "2026-09-17"), "1–17 Sep 2026");
  assert.equal(formatDateRange("2026-09-17", "2026-09-17"), "17 Sep 2026");
  assert.equal(formatDateRange("2026-08-28", "2026-09-03"), "28 Aug – 3 Sep 2026");
  assert.equal(formatDateRange("2025-12-31", "2026-01-02"), "31 Dec 2025 – 2 Jan 2026");
});

test("month move + leap day", () => {
  assert.equal(periodRange("2028-02-29", "Month").end, "2028-02-29");
  assert.equal(movePeriod("2026-01-31", "Month", 1), "2026-02-01");
  assert.equal(movePeriod("2026-01-01", "Week", -1), "2025-12-22");
});

test("current-period comparison excludes future dates", () => {
  const rows = [e("2026-09-01", 100_000), e("2026-09-17", 45_000), e("2026-09-20", 999_000)];
  const range = periodRange("2026-09-17", "Month");
  const cmp = comparePeriod(rows, range, "Month", "2026-09-17");
  assert.equal(cmp.kind, "current");
  assert.equal(cmp.curEnd, "2026-09-17");
  assert.equal(cmp.curTotal, 145_000);
});

test("averagePerDay divides over inclusive ranges", () => {
  assert.equal(averagePerDay(200_000, "2026-09-14", "2026-09-20"), 28571);
  assert.equal(averagePerDay(45_000, "2026-09-17", "2026-09-17"), 45000);
  assert.equal(averagePerDay(0, "2026-09-17", "2026-09-17"), 0);
  assert.equal(averagePerDay(100, "2026-09-20", "2026-09-14"), 0);
});

test("validation rejects bad amounts and dates", () => {
  const ok = { amount: "50000", date: "2026-09-18", category: "Food", classification: "personal", merchant: "", note: "" };
  assert.deepEqual(validateDraft(ok, "2026-09-18"), {});
  for (const amount of ["0", "10000000000", "", "1.5"]) assert.ok(validateDraft({ ...ok, amount }, "2026-09-18").amount);
  for (const date of ["2026-02-29", "2027-09-19", "x"]) assert.ok(validateDraft({ ...ok, date }, "2026-09-18").date);
});

test("signals: largest transaction always, category needs threshold", () => {
  const rows = [e("2026-09-16", 75_000), e("2026-09-12", 1_200_000, "Software", "work")];
  const range = periodRange("2026-09-17", "Month");
  // No previous history: only max signal.
  assert.deepEqual(
    buildSignals(rows, range, "Month", "2026-09-17").map((s) => s.id),
    ["max"],
  );
  const prev = [e("2026-08-05", 900_000, "Software", "work")];
  const withPrev = buildSignals([...rows, ...prev], range, "Month", "2026-09-17").map((s) => s.id);
  assert.ok(withPrev.includes("cat"));
  assert.ok(withPrev.includes("max"));
});

test("merchant memory: case-insensitive match, starts-with first, max 5", () => {
  const m = (date: string, merchant: string, category = "Food", classification: "personal" | "work" = "personal"): Expense => ({
    ...e(date, 10_000, category, classification),
    id: `${date}-${merchant}`,
    merchant,
  });
  const rows = [
    m("2026-09-17", "Warung Bu Tini", "Food"),
    m("2026-09-16", "warung kopi", "Fun"),
    m("2026-09-15", "Print Studio", "Work Direct Cost", "work"),
    m("2026-09-14", "Warung Bu Tini", "Food"),
    m("2026-09-10", "Kopi Kenangan", "Food"),
    m("2026-09-09", "Kopi Tuku", "Food"),
    m("2026-09-08", "Kopi Fore", "Food"),
    m("2026-09-07", "Kopi Janji", "Food"),
    m("2026-09-06", "Kopi Lain", "Food"),
  ];
  // Case-insensitive substring; most-used most-recent spelling first.
  const war = suggestMerchants(rows, "WAR");
  assert.equal(war[0].merchant, "Warung Bu Tini");
  assert.equal(war[0].uses, 2);
  // Starts-with outranks contains; cap of 5.
  const kopi = suggestMerchants(rows, "kopi");
  assert.equal(kopi.length, 5);
  assert.equal(kopi[0].merchant, "Kopi Kenangan");
  // Empty query and blank merchants never suggest.
  assert.deepEqual(suggestMerchants(rows, "   "), []);
  assert.deepEqual(suggestMerchants([m("2026-09-17", "   ")], "x"), []);
  // Most recent expense wins category/classification.
  const mixed = [m("2026-09-01", "Toko A", "Food"), { ...m("2026-09-17", "toko a", "Shopping", "work") }];
  const got = suggestMerchants(mixed, "toko");
  assert.equal(got.length, 1);
  assert.equal(got[0].category, "Shopping");
  assert.equal(got[0].classification, "work");
});
