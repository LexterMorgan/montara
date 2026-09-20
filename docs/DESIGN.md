# MONTARA Design System

Source of truth for scope: `docs/PRD.md`. This doc owns visual decisions only.

## 1. Direction

Premium instrument panel, ASCII details. Warm off-white surfaces, ink-dark text, one restrained accent. Sans body, monospace + tabular numerals for amounts/dates/labels. Thin rules, precise alignment, generous spacing around key figures, restrained radii. ASCII markers (`[CHANGE]`, `[PERIOD]`, `[RECORDS]`) sparingly, decorative only, `aria-hidden`.

Avoid: summary-card grids, badge spam, gradients/glass, neon terminal, fake prompts, meaningless animation, emoji categories, stock illustrations, placeholder marketing, tiny low-contrast type.

## 2. Tokens (shadcn CSS variables)

Base: shadcn neutral. Override in `globals.css` `:root` / `[data-theme]` only; components use semantic variables (`--background`, `--foreground`, `--card`, `--muted`, `--primary`, `--border`, `--destructive`). No raw color utilities in components. Theme: system preference by default, manual Light/Dark toggle in header persists `montara.theme` in localStorage; a pre-paint script sets `data-theme` so no flash. Shader art stays decorative (`aria-hidden`, low opacity).

| Token | Light | Dark | Use | Contrast |
|---|---|---|---|---|
| `--background` | `#F2EEE7` warm sand | `#141210` | page | text ≥ 12:1 both |
| `--foreground` | `#1C1917` ink | `#F5F1E8` | text | — |
| `--card` | `#FFFDF8` | `#211C17` | panels | — |
| `--muted` / `--muted-foreground` | `#E8E1D6` / `#5C554D` | `#30271F` / `#C5B8A8` | helper text, empty states | muted text ≥ 4.5:1 both |
| `--primary` / `--primary-foreground` | `#9A3412` burnt sienna / white | `#E07A3F` / `#1C1917` ink text | key actions, active period, delta highlights | button text ≥ 4.5:1 both (dark accent takes dark text) |
| `--border` | `#D8CFC2` | `#493B30` | rules, card edges | — |
| `--destructive` | `#B3261E` | `#F2A49C` | delete, errors | error text readable on page bg both |
| `--radius` | `0.375rem` | same | base; inputs `sm`, cards `md`, sheets `lg` | — |

Accent restraint rule: one accent per viewport — the primary action or the delta figure, never both competing. Deltas: increase = foreground bold (not red/green); direction carried by `+`/`−` sign and words, never color alone.

## 3. Type / spacing / numbers

- Body: system sans stack (`Inter` fallback system-ui if installed; no webfont dependency at Stage A — ponytail: system stack, add Inter when brand polish proven needed). Scale: 12 label / 14 body / 16 lead / 20 section / 28 hero total / 32 landing only.
- Figures: `font-mono` + `tabular-nums`, right-aligned in tables/lists, never centered. Dates `YYYY-MM-DD` mono 12–13px. Currency format `id-ID`: `Rp4.600.000` (no decimals).
- Spacing scale: 4 / 8 / 12 / 16 / 24 / 32 / 48. Key figure gets 32+ clearance. Rules: 1px `border-border`.
- Radii: `--radius 0.375rem`; inputs `sm`, cards `md`, mobile sheet `lg` top only.

## 4. States

- Hover: `hover:bg-accent` on rows/actions only; no hover on static figures.
- Active: `active:scale-[0.99]` buttons only.
- Focus: visible `ring-ring` 2px offset always; keyboard shortcut `N` discoverable via tooltip + `Kbd`.
- Disabled: `opacity-50`, no pointer events; save button disabled while in-flight (§PRD-5.7).
- Error: `text-destructive` + inline `FieldDescription`; draft preserved.
- Loading: `Skeleton` rows matching list shape; no spinners for full page.
- Motion: none functional; transitions ≤150ms; `prefers-reduced-motion` disables all.

## 5. Components (shadcn only, no custom UI)

Button, Input, Select/Combobox, ToggleGroup (period + classification), Calendar/DatePicker, Dialog/Sheet (entry form), AlertDialog (delete), Card, Table, Badge (count only, max 1 per row), Separator, Skeleton, Sonner toast (Stage B failures only), Empty, Tooltip/Kbd. No Sidebar, no Chart lib at Stage A (category breakdown = Table with mono amounts; ponytail: bar chart deferred until pilot asks).

## 6. Wireframes (hierarchy, not literal ASCII)

Desktop overview:
header [mntr// | Overview Transactions Account | + Record] / main: [PERIOD] segmented Day Week Month Year + prev label next + Today / total block: label range, hero total mono, comparison line / [CHANGE] signal cards max 3, each one sentence link / category Table: name | count | total right / recent list 10 + View all link.

Mobile overview: same order stacked; period control sticky; + Record thumb-reach bottom bar; filters collapse to Sheet.

Entry flow: trigger (+ / N) → Amount focused numeric → Date prefilled collapsible → Category recent-3 + list → Personal/Work ToggleGroup → Add details collapsed → Save (disabled in-flight) → return Overview, new row visible.

## 7. Responsive / a11y

- Breakpoints: `<640` stacked + bottom action; `≥1024` two-col (total+signals left, breakdown+recent right).
- Landmarks: header/main/nav; h1 = period label; signal cards = links with full-sentence names; decorative ASCII `aria-hidden`; deltas never color-only; focus ring always; `N` disabled while typing.
