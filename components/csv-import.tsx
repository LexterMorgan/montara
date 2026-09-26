"use client";

import { useRef, useState } from "react";
import { Button } from "./ui/button";
import { parseCSVImport, type CsvImportRow } from "@/lib/csv";

// CSV import: reads our own export shape, validates with row numbers,
// confirms, then hands fresh rows to the caller. The caller persists to the
// active store (local or synced); success shows only after it resolves.
export function CsvImportControls({ onImport }: { onImport: (rows: CsvImportRow[]) => Promise<void> }) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [message, setMessage] = useState<{ kind: "ok" | "error"; text: string } | null>(null);

  async function onFile(file: File | undefined) {
    if (!file) return; // picker canceled
    let rows;
    try {
      rows = parseCSVImport(await file.text());
    } catch (err) {
      setMessage({ kind: "error", text: err instanceof Error ? err.message : "Could not read that file." });
      return;
    }
    if (!window.confirm(`Import ${rows.length} expenses from this CSV? They will be added to your existing records.`)) {
      return;
    }
    try {
      await onImport(rows);
      setMessage({ kind: "ok", text: `Imported ${rows.length} expenses from CSV.` });
    } catch (err) {
      setMessage({ kind: "error", text: err instanceof Error ? err.message : "Import failed. Try again." });
    }
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <Button variant="outline" size="sm" onClick={() => fileRef.current?.click()}>
        Import CSV
      </Button>
      <input
        ref={fileRef}
        type="file"
        accept=".csv,text/csv"
        className="hidden"
        aria-label="Import expenses from CSV file"
        onChange={(e) => {
          const file = e.target.files?.[0];
          e.target.value = "";
          void onFile(file);
        }}
      />
      {message && (
        <p
          role={message.kind === "error" ? "alert" : "status"}
          className={
            message.kind === "error"
              ? "w-full text-xs text-[var(--destructive)]"
              : "w-full text-xs text-[var(--muted-foreground)]"
          }
        >
          {message.text}
        </p>
      )}
    </div>
  );
}
