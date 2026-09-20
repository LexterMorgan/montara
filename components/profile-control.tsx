"use client";

import { useState } from "react";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { PROFILE_NAME_MAX, savePrefs } from "@/lib/storage";

// Small inline profile control. Browser-only name, not an account: no login, no sync.
export function ProfileControl({ name, onChanged }: { name: string; onChanged: () => void }) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(name);
  const [error, setError] = useState("");

  function openEdit() {
    setDraft(name);
    setError("");
    setEditing(true);
  }

  function save() {
    const clean = draft.trim().slice(0, PROFILE_NAME_MAX);
    if (draft.trim().length > PROFILE_NAME_MAX) {
      setError(`Keep it under ${PROFILE_NAME_MAX} characters.`);
      return;
    }
    savePrefs({ profileName: clean });
    setEditing(false);
    onChanged();
  }

  function clear() {
    if (!window.confirm("Clear your profile name? Your expenses stay.")) return;
    savePrefs({ profileName: "" });
    onChanged();
  }

  if (editing) {
    return (
      <div className="flex flex-wrap items-center gap-2">
        <label htmlFor="profile-name" className="text-xs text-[var(--muted-foreground)]">
          Profile name
        </label>
        <Input
          id="profile-name"
          value={draft}
          maxLength={PROFILE_NAME_MAX + 1}
          autoComplete="off"
          placeholder="Your name"
          aria-invalid={!!error}
          onChange={(e) => {
            setDraft(e.target.value);
            setError("");
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter") save();
            else if (e.key === "Escape") setEditing(false);
          }}
          className="h-8 w-40"
        />
        <Button size="sm" onClick={save}>
          Save
        </Button>
        <Button size="sm" variant="ghost" onClick={() => setEditing(false)}>
          Cancel
        </Button>
        {error && (
          <p role="alert" className="w-full text-xs text-[var(--destructive)]">
            {error}
          </p>
        )}
      </div>
    );
  }

  if (!name) {
    return (
      <Button size="sm" variant="ghost" onClick={openEdit}>
        Set your name
      </Button>
    );
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <p className="text-sm">
        Hi, <strong>{name}</strong>
      </p>
      <Button size="sm" variant="ghost" aria-label="Edit profile name" onClick={openEdit}>
        Edit
      </Button>
      <Button size="sm" variant="ghost" aria-label="Clear profile name" onClick={clear}>
        Clear
      </Button>
    </div>
  );
}
