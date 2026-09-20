"use client";

import { useEffect, useState } from "react";
import { Button } from "./ui/button";

const KEY = "montara.theme";

type Theme = "light" | "dark";

function resolve(): Theme {
  if (typeof document !== "undefined" && document.documentElement.dataset.theme === "dark") return "dark";
  return "light";
}

// Manual Light/Dark toggle. No account, no backend: choice lives in localStorage.
// Unset => follows the operating system preference live.
// First render is deterministic ("light") so server and client HTML match;
// the saved/system theme resolves inside useEffect after mount.
export function ThemeToggle() {
  const [theme, setTheme] = useState<Theme>("light");
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setTheme(resolve());
    setMounted(true);
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const follow = () => {
      try {
        const stored = localStorage.getItem(KEY);
        if (stored === "light" || stored === "dark") return;
        const next: Theme = mq.matches ? "dark" : "light";
        document.documentElement.dataset.theme = next;
        setTheme(next);
      } catch {
        // private mode etc: theme still applies for this page load
      }
    };
    mq.addEventListener("change", follow);
    return () => mq.removeEventListener("change", follow);
  }, []);

  function toggle() {
    const next: Theme = theme === "dark" ? "light" : "dark";
    try {
      localStorage.setItem(KEY, next);
    } catch {
      // storage unavailable: apply for this page load only
    }
    document.documentElement.dataset.theme = next;
    setTheme(next);
  }

  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      onClick={toggle}
      aria-label={mounted ? (theme === "dark" ? "Switch to light theme" : "Switch to dark theme") : "Toggle theme"}
      title={mounted ? (theme === "dark" ? "Switch to light theme" : "Switch to dark theme") : "Toggle theme"}
    >
      <span aria-hidden="true" className="mono text-xs">
        {mounted ? (theme === "dark" ? "Dark" : "Light") : "Theme"}
      </span>
    </Button>
  );
}
