"use client";

import { useState } from "react";
import { Button } from "./ui/button";
import { Dialog, DialogDescription, DialogTitle } from "./ui/dialog";
import { Input } from "./ui/input";
import { useAuth } from "./auth-provider";
import { useExpenses } from "./expense-provider";

// Minimal Sync control for the header. Signed out: magic-link dialog.
// Signed in: account email plus sign-out. Unconfigured: short message.
export function SyncControl() {
  const { user, loading, configured, signIn, signOut } = useAuth();
  const { localImportCount, importLocal } = useExpenses();
  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState("");
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");
  const [signingOut, setSigningOut] = useState(false);
  const [importing, setImporting] = useState(false);
  const [importError, setImportError] = useState("");

  if (!configured && !loading) {
    return <span className="text-xs text-[var(--muted-foreground)]">Sync unavailable</span>;
  }
  if (loading) {
    return (
      <Button variant="outline" size="sm" disabled>
        Sync…
      </Button>
    );
  }
  if (user) {
    return (
      <span className="flex items-center gap-2">
        {localImportCount > 0 && (
          <span className="flex items-center gap-2">
            <Button
              variant="default"
              size="sm"
              disabled={importing}
              onClick={() => {
                setImporting(true);
                setImportError("");
                importLocal()
                  .catch((err) => setImportError(err instanceof Error ? err.message : "Import failed. Try again."))
                  .finally(() => setImporting(false));
              }}
            >
              {importing ? "Importing…" : `Import ${localImportCount} local`}
            </Button>
          </span>
        )}
        {importError && (
          <span role="alert" className="max-w-48 text-xs text-[var(--destructive)]">
            {importError}
          </span>
        )}
        <span className="max-w-36 truncate text-xs text-[var(--muted-foreground)]" title={user.email ?? ""}>
          {user.email}
        </span>
        <Button
          variant="outline"
          size="sm"
          disabled={signingOut}
          onClick={() => {
            setSigningOut(true);
            signOut().finally(() => setSigningOut(false));
          }}
        >
          {signingOut ? "Leaving…" : "Sign out"}
        </Button>
      </span>
    );
  }

  function close() {
    setOpen(false);
    setError("");
    if (!sent) setEmail("");
  }

  async function send(e?: React.FormEvent) {
    e?.preventDefault();
    if (sending) return;
    setError("");
    const value = email.trim();
    if (!value) {
      setError("Enter an email address.");
      return;
    }
    setSending(true);
    try {
      await signIn(value);
      setSent(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not send that link. Try again.");
    } finally {
      setSending(false);
    }
  }

  return (
    <>
      <Button
        variant="outline"
        size="sm"
        onClick={() => {
          setSent(false);
          setError("");
          setOpen(true);
        }}
      >
        Sync
      </Button>
      {open && (
        <Dialog open={open} onClose={close} labelledBy="sync-title">
          <DialogTitle id="sync-title">Sync across devices</DialogTitle>
          <DialogDescription>
            {sent ? "Link sent. Open it on this device to finish signing in." : "Enter your email to receive a sign-in link."}
          </DialogDescription>
          {sent ? (
            <div className="mt-4 flex flex-col gap-3">
              <p role="status" className="text-sm">
                Check your email for the sign-in link.
              </p>
              <div>
                <Button variant="ghost" size="sm" onClick={close}>
                  Done
                </Button>
              </div>
            </div>
          ) : (
            <form noValidate onSubmit={send} className="mt-4 flex flex-col gap-3">
              <label htmlFor="sync-email" className="block text-xs font-medium">
                Email address
              </label>
              <Input
                id="sync-email"
                name="email"
                type="email"
                autoComplete="email"
                required
                autoFocus
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  setError("");
                }}
              />
              {error && (
                <p role="alert" className="text-xs text-[var(--destructive)]">
                  {error}
                </p>
              )}
              <div className="flex items-center gap-2">
                <Button type="submit" disabled={sending}>
                  {sending ? "Sending…" : "Send link"}
                </Button>
                <Button type="button" variant="ghost" onClick={close}>
                  Cancel
                </Button>
              </div>
            </form>
          )}
        </Dialog>
      )}
    </>
  );
}
