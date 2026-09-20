import { CTASection } from "@/components/ui/hero-dithering-card";

export default function Landing() {
  return (
    <div className="flex flex-col gap-8">
      <CTASection />
      <section aria-label="How it works">
        <h2 className="text-base font-semibold">How it works</h2>
        <ol className="mt-2 list-decimal pl-5">
          <li>Record an expense (under 10 seconds, target).</li>
          <li>Compare Day / Week / Month / Year.</li>
          <li>Inspect the transactions behind each change.</li>
        </ol>
      </section>
      <section aria-label="Example change">
        <h2 className="text-base font-semibold">
          <span aria-hidden="true" className="marker">[CHANGE] </span>Example
        </h2>
        <p className="mono mt-2 text-sm">Software Rp900.000 → Rp1.200.000 (+Rp300.000) · 1–17 Sep vs 1–17 Aug · Demo data</p>
      </section>
    </div>
  );
}
