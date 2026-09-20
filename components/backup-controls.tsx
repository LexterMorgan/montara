"use client";

import { useRef, useState } from "react";
import { Button } from "./ui/button";
import { BACKUP_FILENAME, downloadBackup, parseBackup } from "@/lib/backup";
import { EXPENSE_KEY, PREFS_KEY } from "@/lib/storage";

// Local JSON backup/restore. The file never leaves the browser: download + file input only.
export function BackupControls({ onRestored }: { onRestored: () => void }) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [message, setMessage] = useState<{ kind: "ok" | "error"; text: string } | null>(null);

  function backup() {
    try {
      downloadBackup();
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
        `Replace local data with this backup (${payload.expenses.length} expenses, exported ${payload.exportedAt})? This cannot be undone.`,
      )
    ) {
      return;
    }
    try {
      localStorage.setItem(EXPENSE_KEY, JSON.stringify(payload.expenses));
      localStorage.setItem(PREFS_KEY, JSON.stringify(payload.prefs));
    } catch {
      setMessage({ kind: "error", text: "Restore failed: browser storage is full." });
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
