// CSV export per PRD §12. Pure + one download helper. No deps.
import { toUTC, type Expense } from "./calc.ts";

export const CSV_HEADER = [
  "date",
  "amount_idr",
  "category",
  "classification",
  "merchant",
  "note",
  "payment_method",
  "created_at",
  "updated_at",
];

function guard(cell: string): string {
  // Formula-injection guard: prefix = + - @ tab CR cells with '.
  if (/^[=+\-@\t\r]/.test(cell)) return `'${cell}`;
  return cell;
}

export function escapeCell(value: string | number): string {
  const s = guard(String(value));
  if (/["\n\r,]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

export function toCSV(rows: Expense[]): string {
  const lines = rows.map((r) =>
    [
      r.date,
      r.amount,
      r.category,
      r.classification,
      r.merchant ?? "",
      r.note ?? "",
      "",
      r.createdAt,
      r.updatedAt,
    ]
      .map(escapeCell)
      .join(","),
  );
  return "﻿" + [CSV_HEADER.join(","), ...lines].join("\r\n") + "\r\n";
}

export function jakartaStamp(now = new Date()): { day: string; hm: string } {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Jakarta",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  })
    .formatToParts(now)
    .reduce<Record<string, string>>((acc, p) => ({ ...acc, [p.type]: p.value }), {});
  return { day: `${parts.year}${parts.month}${parts.day}`, hm: `${parts.hour}${parts.minute}` };
}

export function csvFilename(now = new Date()): string {
  const { day, hm } = jakartaStamp(now);
  return `montara-expenses-${day}-${hm}.csv`;
}

export function downloadCSV(rows: Expense[], filename = csvFilename()): void {
  const blob = new Blob([toCSV(rows)], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export type CsvImportRow = {
  date: string;
  amount: number;
  category: string;
  classification: "personal" | "work";
  merchant: string;
  note: string;
};

// Split one RFC-4180 line into cells (handles quotes, escaped quotes, commas).
function splitLine(line: string): string[] {
  const cells: string[] = [];
  let cur = "";
  let quoted = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (quoted) {
      if (ch === '"') {
        if (line[i + 1] === '"') {
          cur += '"';
          i++;
        } else {
          quoted = false;
        }
      } else {
        cur += ch;
      }
    } else if (ch === '"') {
      quoted = true;
    } else if (ch === ",") {
      cells.push(cur);
      cur = "";
    } else {
      cur += ch;
    }
  }
  cells.push(cur);
  if (quoted) throw new Error("Unclosed quote in CSV.");
  return cells;
}

// Reverse the export formula guard: a leading ' before = + - @ is escaping, not text.
function unguard(cell: string): string {
  const t = cell.trim();
  if (t.length >= 2 && t[0] === "'" && "=+-@".includes(t[1])) return t.slice(1);
  return t;
}

// Parse our own export shape back. Throws naming the 1-indexed file line.
// Required headers: date, amount_idr, category, classification.
// Optional: merchant, note. Everything else ignored.
export function parseCSVImport(text: string): CsvImportRow[] {
  const clean = text.replace(/^﻿/, "");
  const lines = clean.split(/\r\n|\n|\r/);
  const records = lines.filter((l) => l.trim() !== "");
  if (records.length === 0) throw new Error("No rows found in this CSV.");
  const header = splitLine(records[0]).map((h) => h.trim());
  const idx = (name: string) => header.indexOf(name);
  for (const name of ["date", "amount_idr", "category", "classification"]) {
    if (idx(name) === -1) throw new Error(`Missing required column: ${name}.`);
  }
  const rows: CsvImportRow[] = [];
  for (let r = 1; r < records.length; r++) {
    const lineNo = r + 1;
    const cells = splitLine(records[r]);
    const fail = (why: string): never => {
      throw new Error(`Row ${lineNo}: ${why}.`);
    };
    const date = (cells[idx("date")] ?? "").trim();
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || !toUTC(date)) fail("bad date (want YYYY-MM-DD)");
    const amountRaw = (cells[idx("amount_idr")] ?? "").trim();
    if (!/^\d{1,10}$/.test(amountRaw)) fail("bad amount (want whole rupiah 1..9999999999)");
    const amount = Number(amountRaw);
    if (amount < 1 || amount > 9_999_999_999) fail("bad amount (want whole rupiah 1..9999999999)");
    const category = unguard(cells[idx("category")] ?? "");
    if (category.length < 1 || category.length > 40) fail("bad category (want 1..40 characters)");
    const classification = (cells[idx("classification")] ?? "").trim();
    if (classification !== "personal" && classification !== "work") {
      throw new Error(`Row ${lineNo}: bad classification (want personal or work).`);
    }
    const merchant = idx("merchant") === -1 ? "" : unguard(cells[idx("merchant")] ?? "");
    if (merchant.length > 60) fail("merchant over 60 characters");
    const note = idx("note") === -1 ? "" : unguard(cells[idx("note")] ?? "");
    if (note.length > 200) fail("note over 200 characters");
    rows.push({ date, amount, category, classification, merchant, note });
  }
  if (rows.length === 0) throw new Error("No expense rows found in this CSV.");
  return rows;
}
