"use client";

import { BackupControls } from "./backup-controls";
import { CsvImportControls } from "./csv-import";
import type { CsvImportRow } from "@/lib/csv";

// Collapsed power-user area. CSV export stays visible next to the main
// controls; everything else lives behind this native disclosure.
export function DataTools({
  onRestored,
  onImported,
}: {
  onRestored: () => void;
  onImported: (rows: CsvImportRow[]) => void;
}) {
  return (
    <details>
      <summary className="cursor-pointer text-sm underline-offset-4 hover:underline">Data tools</summary>
      <div className="mt-2 flex flex-col gap-3">
        <BackupControls onRestored={onRestored} />
        <CsvImportControls onImport={onImported} />
      </div>
    </details>
  );
}
