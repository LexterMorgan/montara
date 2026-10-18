"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import { Button } from "./ui/button";
import { Dialog, DialogDescription, DialogTitle } from "./ui/dialog";
import { Input } from "./ui/input";
import { useAuth } from "./auth-provider";
import { useExpenses } from "./expense-provider";

// Supabase rejects a second email to the same address inside 60s anyway.
const RESEND_SECONDS = 60;
const CODE_LENGTH = 6;

// Header account control.
// Signed out: email, then the code from that same email, so the session lands in
// the browser already in use instead of whichever app opens the link.
// Signed in: one Account button opening the email, first upload, and sign out.
export function SyncControl() {
  const { user, loading, configured, signIn, verifyCode, signOut } = useAuth();
  const { localImportCount, importLocal } = useExpenses();
  const [panel, setPanel] = useState<"none" | "signin" | "account">("none");
  const [step, setStep] = useState<"email" | "code">("email");
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [cooldown, setCooldown] = useState(0);
  const [signingOut, setSigningOut] = useState(false);
  const [importing, setImporting] = useState(false);
  const [importError, setImportError] = useState("");
  // Bumped by every new attempt and by closing, so a late response from a
  // cancelled or replaced attempt cannot rewrite the dialog.
  const attemptRef = useRef(0);

  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = setTimeout(() => setCooldown((n) => n - 1), 1000);
    return () => clearTimeout(timer);
  }, [cooldown]);

  function closeSignIn() {
    attemptRef.current += 1;
    setPanel("none");
    setStep("email");
    setCode("");
    setError("");
    setNotice("");
    setCooldown(0);
    setBusy(false);
  }

  async function send(e?: FormEvent) {
    e?.preventDefault();
    if (busy) return;
    const value = email.trim();
    setError("");
    setNotice("");
    if (!value) {
      setError("Enter an email address.");
      return;
    }
    const attempt = ++attemptRef.current;
    setBusy(true);
    try {
      await signIn(value);
      if (attempt !== attemptRef.current) return;
      setEmail(value);
      setStep("code");
      setCode("");
      setCooldown(RESEND_SECONDS);
    } catch (err) {
      if (attempt !== attemptRef.current) return;
      setError(err instanceof Error ? err.message : "Could not send that email. Try again.");
    }
    setBusy(false);
  }

  async function resend() {
    if (busy || cooldown > 0) return;
    setError("");
    setNotice("");
    const attempt = ++attemptRef.current;
    setBusy(true);
    try {
      await signIn(email.trim());
      if (attempt !== attemptRef.current) return;
      setNotice("New email sent.");
      setCooldown(RESEND_SECONDS);
    } catch (err) {
      if (attempt !== attemptRef.current) return;
      setError(err instanceof Error ? err.message : "Could not send that email. Try again.");
    }
    setBusy(false);
  }

  async function verify(e?: FormEvent) {
    e?.preventDefault();
    if (busy) return;
    setError("");
    setNotice("");
    if (code.length < CODE_LENGTH) {
      setError(`Enter the ${CODE_LENGTH}-digit code from the email.`);
      return;
    }
    const attempt = ++attemptRef.current;
    setBusy(true);
    try {
      // The provider flips to signed in and this dialog goes with it.
      await verifyCode(email.trim(), code);
      if (attempt !== attemptRef.current) return;
      closeSignIn();
    } catch (err) {
      if (attempt !== attemptRef.current) return;
      setError(err instanceof Error ? err.message : "That code did not work. Try again.");
      setBusy(false);
    }
  }

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
      <>
        <Button
          variant="outline"
          size="sm"
          className="max-w-32"
          title={user.email ?? ""}
          onClick={() => {
            setImportError("");
            setPanel("account");
          }}
        >
          <span className="truncate sm:hidden">Account</span>
          <span className="hidden truncate sm:block">{user.email}</span>
        </Button>
        {panel === "account" && (
          <Dialog open onClose={() => setPanel("none")} labelledBy="account-title">
            <DialogTitle id="account-title">Account</DialogTitle>
            <DialogDescription>Signed in as {user.email}. Expenses sync across your devices.</DialogDescription>
            <div className="mt-4">
              {localImportCount > 0 ? (
                <div className="flex flex-col gap-3">
                  <p className="text-sm">
                    {localImportCount === 1
                      ? "1 expense recorded on this device is not synced yet."
                      : `${localImportCount} expenses recorded on this device are not synced yet.`}
                  </p>
                  {importError && (
                    <p role="alert" className="text-xs text-[var(--destructive)]">
                      {importError}
                    </p>
                  )}
                  <div>
                    <Button
                      disabled={importing}
                      onClick={() => {
                        setImporting(true);
                        setImportError("");
                        importLocal()
                          .catch((err) => setImportError(err instanceof Error ? err.message : "Upload failed. Try again."))
                          .finally(() => setImporting(false));
                      }}
                    >
                      {importing ? "Uploading…" : `Upload ${localImportCount} local`}
                    </Button>
                  </div>
                </div>
              ) : (
                <p className="text-sm text-[var(--muted-foreground)]">Nothing left to upload from this device.</p>
              )}
            </div>
            <div className="mt-6">
              <Button
                variant="outline"
                disabled={signingOut}
                onClick={() => {
                  setSigningOut(true);
                  signOut().finally(() => {
                    setSigningOut(false);
                    setPanel("none");
                  });
                }}
              >
                {signingOut ? "Signing out…" : "Sign out"}
              </Button>
            </div>
          </Dialog>
        )}
      </>
    );
  }

  return (
    <>
      <Button
        variant="outline"
        size="sm"
        onClick={() => {
          setStep("email");
          setError("");
          setNotice("");
          setCooldown(0);
          setPanel("signin");
        }}
      >
        Sync
      </Button>
      {panel === "signin" && (
        <Dialog open onClose={closeSignIn} labelledBy="sync-title">
          {step === "email" ? (
            <>
              <DialogTitle id="sync-title">Sync across devices</DialogTitle>
              <DialogDescription>We email a sign-in link and a {CODE_LENGTH}-digit code. Either one works.</DialogDescription>
              <form noValidate onSubmit={send} className="mt-4 flex flex-col gap-3">
                <label htmlFor="sync-email" className="block text-xs font-medium">
                  Email address
                </label>
                <Input
                  id="sync-email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  inputMode="email"
                  required
                  autoFocus
                  value={email}
                  aria-invalid={error ? true : undefined}
                  aria-describedby={error ? "sync-error" : undefined}
                  onChange={(e) => {
                    setEmail(e.target.value);
                    setError("");
                  }}
                />
                {error && (
                  <p id="sync-error" role="alert" className="text-xs text-[var(--destructive)]">
                    {error}
                  </p>
                )}
                <div className="flex flex-wrap items-center gap-2">
                  <Button type="submit" disabled={busy}>
                    {busy ? "Sending…" : "Send code"}
                  </Button>
                  <Button type="button" variant="ghost" onClick={closeSignIn}>
                    Cancel
                  </Button>
                </div>
              </form>
            </>
          ) : (
            <>
              <DialogTitle id="sync-title">Enter your code</DialogTitle>
              <DialogDescription>Sent to {email}. The link in that email also signs you in.</DialogDescription>
              <form noValidate onSubmit={verify} className="mt-4 flex flex-col gap-3">
                <label htmlFor="sync-code" className="block text-xs font-medium">
                  {CODE_LENGTH}-digit code
                </label>
                <Input
                  id="sync-code"
                  name="one-time-code"
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  pattern="[0-9]*"
                  maxLength={CODE_LENGTH}
                  required
                  autoFocus
                  value={code}
                  className="mono text-center tracking-[0.3em]"
                  aria-invalid={error ? true : undefined}
                  aria-describedby={error ? "sync-error" : undefined}
                  onChange={(e) => {
                    setCode(e.target.value.replace(/\D/g, ""));
                    setError("");
                  }}
                />
                {error && (
                  <p id="sync-error" role="alert" className="text-xs text-[var(--destructive)]">
                    {error}
                  </p>
                )}
                {notice && (
                  <p role="status" className="text-xs text-[var(--muted-foreground)]">
                    {notice}
                  </p>
                )}
                <div className="flex flex-wrap items-center gap-2">
                  <Button type="submit" disabled={busy}>
                    {busy ? "Checking…" : "Verify code"}
                  </Button>
                  <Button type="button" variant="ghost" disabled={busy || cooldown > 0} onClick={resend}>
                    {cooldown > 0 ? `Resend in ${cooldown}s` : "Resend email"}
                  </Button>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={() => {
                      setStep("email");
                      setCode("");
                      setError("");
                      setNotice("");
                      setCooldown(0);
                    }}
                  >
                    Use a different email
                  </Button>
                  <Button type="button" variant="ghost" onClick={closeSignIn}>
                    Cancel
                  </Button>
                </div>
              </form>
            </>
          )}
        </Dialog>
      )}
    </>
  );
}
