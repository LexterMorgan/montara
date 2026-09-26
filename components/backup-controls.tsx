"use client";

import { useRef, useState } from "react";
import { Button } from "./ui/button";
import { BACKUP_FILENAME, downloadBackup, parseBackup } from "@/lib/backup";
import { PREFS_KEY } from "@/lib/storage";
import { useExpenses } from "./expense-provider";

// JSON backup/restore against the active store. The backup file itself never
// leaves the browser; restore writes expenses through replaceAll (local or
// synced) while preferences stay in localStorage.
export function BackupControls({ onRestored }: { onRestored: () => void }) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [message, setMessage] = useState<{ kind: "ok" | "error"; text: string } | null>(null);
  const { expenses, replaceAll } = useExpenses();

  function backup() {
    try {
      downloadBackup(expenses);
      setMessage({ kind: "ok", text: `Saved ${BACKUP_FILENAME}. Keep it somewhere safe.` });
    } catch {
      setMessage({ kind: "error", text: "Backup failed in this browser. Try again." });
    }
  }

  async function onFile(file: File | undefined) {
    if (!file) return; // picker canceled
    let payload;
    try {
      payload = parseBackup(await file.text());
    } catch (err) {
      setMessage({ kind: "error", text: err instanceof Error ? err.message : "Could not read that file." });
      return;
    }
    if (
      !window.confirm(
        `Replace current data with this backup (${payload.expenses.length} expenses, exported ${payload.exportedAt})? This cannot be undone.`,
      )
    ) {
      return;
    }
    try {
      localStorage.setItem(PREFS_KEY, JSON.stringify(payload.prefs));
    } catch {
      setMessage({ kind: "error", text: "Restore failed: browser storage is full." });
      return;
    }
    try {
      await replaceAll(payload.expenses);
    } catch (err) {
      setMessage({ kind: "error", text: err instanceof Error ? err.message : "Restore failed. Try again." });
      return;
    }
    onRestored();
    setMessage({ kind: "ok", text: `Restored ${payload.expenses.length} expenses from backup.` });
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <Button variant="outline" size="sm" onClick={backup}>
        Backup JSON
      </Button>
      <Button variant="outline" size="sm" onClick={() => fileRef.current?.click()}>
        Restore JSON
      </Button>
      <input
        ref={fileRef}
        type="file"
        accept="application/json"
        className="hidden"
        aria-label="Restore from JSON backup file"
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
