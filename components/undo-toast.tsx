"use client";

import { useEffect, useRef } from "react";
import { Button } from "./ui/button";

// Small delete-undo toast. No library: fixed status bar, 5s auto-dismiss.
// Mounted per deletion (parent keys by expense id) so the timer runs once.
export function UndoToast({
  label,
  onUndo,
  onDone,
}: {
  label: string;
  onUndo: () => void;
  onDone: () => void;
}) {
  const doneRef = useRef(onDone);
  doneRef.current = onDone;
  const undoRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    undoRef.current?.focus();
    const t = setTimeout(() => doneRef.current(), 5000);
    return () => clearTimeout(t);
  }, []);

  return (
    <div className="fixed inset-x-0 bottom-20 z-40 flex justify-center px-4 sm:bottom-6">
      <div
        role="status"
        className="flex max-w-full items-center gap-3 rounded-[var(--radius)] border border-[var(--border)] bg-[var(--card)] px-4 py-2 shadow-sm"
      >
        <p className="truncate text-sm">{label}</p>
        <Button ref={undoRef} size="sm" onClick={onUndo}>
          Undo
        </Button>
        <Button size="sm" variant="ghost" aria-label="Dismiss" onClick={onDone}>
          ✕
        </Button>
      </div>
    </div>
  );
}
