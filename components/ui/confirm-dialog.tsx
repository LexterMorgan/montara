"use client";

import { Button } from "./button";
import { Dialog, DialogDescription, DialogTitle } from "./dialog";

// DESIGN.md §5: destructive confirmations happen in-app, never in window.confirm.
// Cancel comes first so the safe action takes focus on open.
export function ConfirmDialog({
  open,
  title,
  description,
  confirmLabel = "Delete",
  busy = false,
  error = "",
  onConfirm,
  onClose,
}: {
  open: boolean;
  title: string;
  description?: string;
  confirmLabel?: string;
  busy?: boolean;
  error?: string;
  onConfirm: () => void;
  onClose: () => void;
}) {
  if (!open) return null;
  return (
    <Dialog open onClose={() => !busy && onClose()} labelledBy="confirm-title">
      <DialogTitle id="confirm-title">{title}</DialogTitle>
      {description && <DialogDescription>{description}</DialogDescription>}
      {error && (
        <p role="alert" className="mt-3 text-sm text-[var(--destructive)]">
          {error}
        </p>
      )}
      <div className="mt-4 flex flex-wrap items-center gap-2">
        <Button variant="ghost" disabled={busy} onClick={onClose}>
          Cancel
        </Button>
        <Button variant="destructive" disabled={busy} onClick={onConfirm}>
          {busy ? "Working…" : confirmLabel}
        </Button>
      </div>
    </Dialog>
  );
}
