"use client";

import { useEffect, useMemo, useRef, useState } from "react";

// Original faint dot texture: deterministic glyphs so server and client HTML match.
// 10px monospace ≈ 6px per glyph, 15px per row; the count fits the viewport at
// runtime (rows run out on wide screens with a fixed count).
const GLYPH_W = 6;
const GLYPH_H = 15;
const SSR_GLYPHS = 6000;
const MAX_GLYPHS = 120_000;

function glyph(i: number): string {
  let h = (i * 2654435761) >>> 0;
  h ^= h >>> 13;
  h = (h * 1274126177) >>> 0;
  h ^= h >>> 16;
  const r = h % 100;
  if (r < 58) return " ";
  if (r < 82) return "·";
  if (r < 91) return ".";
  if (r < 96) return ":";
  if (r < 99) return "+";
  return "*";
}

const buildTexture = (n: number): string =>
  Array.from({ length: Math.max(n, 0) }, (_, i) => glyph(i)).join("");

// Viewport-sized glyph count (client only). SSR uses the safe default so the
// first client render matches; the effect upgrades it after mount.
function neededGlyphs(): number {
  const cols = Math.ceil(window.innerWidth / GLYPH_W) + 2;
  const rows = Math.ceil(window.innerHeight / GLYPH_H) + 2;
  return Math.min(cols * rows, MAX_GLYPHS);
}

// Decorative ASCII/dot backdrop with a cursor spotlight. Pointer position flows
// through CSS vars (--cursor-x/--cursor-y) via rAF — no React state per move.
// Static faint texture on touch devices and prefers-reduced-motion.
// mode="card": absolute, tracks the parent card. mode="page": fixed above the
// page background and below all content (content carries its own z-index),
// tracks the viewport.
export function AsciiCursorBackdrop({ mode = "card" }: { mode?: "card" | "page" }) {
  const ref = useRef<HTMLDivElement>(null);
  const [glyphs, setGlyphs] = useState(SSR_GLYPHS);
  const texture = useMemo(() => buildTexture(glyphs), [glyphs]);

  useEffect(() => {
    if (mode === "page") {
      const fit = () => setGlyphs(neededGlyphs());
      fit();
      window.addEventListener("resize", fit);
      return () => window.removeEventListener("resize", fit);
    }
  }, [mode]);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (window.matchMedia("(pointer: coarse)").matches) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const host = mode === "page" ? window : el.parentElement;
    if (!host) return;
    let raf = 0;
    let tx = 0;
    let ty = 0;
    const apply = () => {
      raf = 0;
      el.style.setProperty("--cursor-x", `${tx}px`);
      el.style.setProperty("--cursor-y", `${ty}px`);
    };
    const onMove = (ev: PointerEvent) => {
      const r = el.getBoundingClientRect();
      tx = ev.clientX - r.left;
      ty = ev.clientY - r.top;
      if (!raf) raf = requestAnimationFrame(apply);
    };
    const listener = (ev: Event) => onMove(ev as PointerEvent);
    host.addEventListener("pointermove", listener);
    return () => {
      host.removeEventListener("pointermove", listener);
      if (raf) cancelAnimationFrame(raf);
    };
  }, [mode]);

  return (
    <div
      ref={ref}
      aria-hidden="true"
      className={
        mode === "page"
          ? "ascii-backdrop pointer-events-none fixed inset-0 z-0 overflow-hidden"
          : "ascii-backdrop pointer-events-none absolute inset-0 z-0 overflow-hidden"
      }
    >
      <pre aria-hidden="true" className="ascii-base">
        {texture}
      </pre>
      <pre aria-hidden="true" className="ascii-spot">
        {texture}
      </pre>
    </div>
  );
}
