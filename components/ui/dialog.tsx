"use client";

import { useEffect, useRef, type KeyboardEvent, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { cn } from "./cn";

const FOCUSABLE =
  "button:not([disabled]):not([tabindex='-1']), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex='-1'])";

// Minimal shadcn-style dialog. Focus moves in on open, Tab cycles inside,
// Escape stays with the caller form. No animation libs, no Radix.
export function Dialog({
  open,
  onClose,
  labelledBy,
  children,
}: {
  open: boolean;
  onClose: () => void;
  labelledBy: string;
  children: ReactNode;
}) {
  const contentRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const trigger = document.activeElement as HTMLElement | null;
    const root = contentRef.current;
    const first = root?.querySelector<HTMLElement>(FOCUSABLE);
    (first ?? root)?.focus();
    return () => {
      document.body.style.overflow = prev;
      if (trigger && document.contains(trigger)) trigger.focus({ preventScroll: true });
    };
  }, [open ]);

  function trapTab(e: KeyboardEvent) {
    if (e.key !== "Tab") return;
    const root = contentRef.current;
    if (!root) return;
    const items = [...root.querySelectorAll<HTMLElement>(FOCUSABLE)];
    if (items.length === 0) {
      e.preventDefault();
      return;
    }
    const first = items[0];
    const last = items[items.length - 1];
    if (e.shiftKey && document.activeElement === first) {
      e.preventDefault();
      last.focus();
    } else if (!e.shiftKey && document.activeElement === last) {
      e.preventDefault();
      first.focus();
    }
  }

  if (!open) return null;
  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-0 sm:items-center sm:p-4"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      onKeyDown={trapTab}
    >
      <div
        ref={contentRef}
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        aria-labelledby={labelledBy}
        className={cn(
          "max-h-[92dvh] w-full overflow-y-auto rounded-t-lg border border-[var(--border)] bg-[var(--card)] p-4 sm:max-w-lg sm:rounded-[var(--radius)] sm:p-6",
        )}
      >
        {children}
      </div>
    </div>,
    document.body,
  );
}

export function DialogTitle({ id, children }: { id: string; children: ReactNode }) {
  return (
    <h2 id={id} className="text-base font-semibold">
      {children}
    </h2>
  );
}

export function DialogDescription({ children }: { children: ReactNode }) {
  return <p className="mt-1 text-[13px] text-[var(--muted-foreground)]">{children}</p>;
}
