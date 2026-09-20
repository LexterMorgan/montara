"use client";

import { ArrowRight } from "lucide-react";
import { lazy, Suspense, useEffect, useState } from "react";

const Dithering = lazy(() =>
  import("@paper-design/shaders-react").then(({ Dithering }) => ({ default: Dithering })),
);

// Theme-aware shader tint: manual theme lives on html[data-theme], so the
// WebGL color follows it (Tailwind dark: variants track the OS instead).
function useShaderColor(): string {
  const get = () => {
    if (typeof document === "undefined") return "#9A3412";
    const t = document.documentElement.dataset.theme;
    if (t === "dark") return "#E07A3F";
    if (t === "light") return "#9A3412";
    return window.matchMedia("(prefers-color-scheme: dark)").matches ? "#E07A3F" : "#9A3412";
  };
  const [color, setColor] = useState(get);
  useEffect(() => {
    setColor(get());
    const obs = new MutationObserver(() => setColor(get()));
    obs.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });
    return () => obs.disconnect();
  }, []);
  return color;
}

type CTASectionProps = {
  compact?: boolean;
  heading?: "h1" | "h2" | "p";
  eyebrow?: string;
  title?: string;
  description?: string;
  actionLabel?: string;
  actionHref?: string;
};

export function CTASection({
  compact = false,
  heading = "h1",
  eyebrow = "Local-first spending tracker",
  title = "See what changed in your money.",
  description = "Record expenses, compare periods, and inspect the purchases behind each change. Your records stay in this browser.",
  actionLabel = "Open overview",
  actionHref = "/overview",
}: CTASectionProps) {
  const [isHovered, setIsHovered] = useState(false);
  const shaderColor = useShaderColor();
  const height = compact ? "min-h-[15rem]" : "min-h-[28rem]";

  return (
    <section aria-labelledby="hero-title" className="w-full">
      <div
        className={`relative ${height} overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--card)] shadow-sm`}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      >
        <div aria-hidden="true" className="hero-fallback pointer-events-none absolute inset-0 z-0" />
        <Suspense fallback={<div aria-hidden="true" className="absolute inset-0 bg-[var(--muted)]/20" />}>
          <div aria-hidden="true" className="hero-shader pointer-events-none absolute inset-0 z-0">
            <Dithering
              colorBack="#00000000"
              colorFront={shaderColor}
              shape="warp"
              type="4x4"
              speed={isHovered ? 0.6 : 0.2}
              className="size-full"
              minPixelRatio={1}
            />
          </div>
        </Suspense>

        <div className={`relative z-10 flex ${height} flex-col items-center justify-center px-6 text-center ${compact ? "py-10" : "py-16"}`}>
          <p className="mono mb-4 text-xs uppercase tracking-[0.18em] text-[var(--primary)]">{eyebrow}</p>
          {heading === "p" ? (
            <p id="hero-title" className={`max-w-3xl font-semibold tracking-tight ${compact ? "text-3xl sm:text-4xl" : "text-4xl sm:text-5xl md:text-6xl"}`}>
              {title}
            </p>
          ) : heading === "h2" ? (
            <h2 id="hero-title" className={`max-w-3xl font-semibold tracking-tight ${compact ? "text-3xl sm:text-4xl" : "text-4xl sm:text-5xl md:text-6xl"}`}>
              {title}
            </h2>
          ) : (
            <h1 id="hero-title" className={`max-w-3xl font-semibold tracking-tight ${compact ? "text-3xl sm:text-4xl" : "text-4xl sm:text-5xl md:text-6xl"}`}>
              {title}
            </h1>
          )}
          <p className={`max-w-2xl text-[var(--muted-foreground)] ${compact ? "mt-4 text-sm sm:text-base" : "mt-6 text-base sm:text-lg"}`}>
            {description}
          </p>
          {actionHref && actionLabel && (
            <a
              href={actionHref}
              className="group mt-8 inline-flex h-12 items-center justify-center gap-3 rounded-full bg-[var(--primary)] px-8 text-sm font-medium text-[var(--primary-foreground)] transition-transform hover:scale-[1.02] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--primary)] active:scale-[.98]"
            >
              {actionLabel}
              <ArrowRight aria-hidden="true" className="size-4 transition-transform group-hover:translate-x-1" />
            </a>
          )}
          {!compact && <p className="mono mt-5 text-xs text-[var(--muted-foreground)]">Your data stays in this browser · IDR only · no account required</p>}
        </div>
      </div>
    </section>
  );
}
