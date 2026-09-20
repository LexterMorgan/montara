# MONTARA Product Requirements Document

**mntr//** — See what changed in your money.

| | |
|---|---|
| Status | Draft for founder review |
| Owner | Founder |
| Last updated | 2026-09-18 |
| Source of truth | This document owns scope. Other documents cross-reference requirement IDs (e.g. `PRD-F1`) and never redefine them. |

## 1. Purpose

MONTARA helps Indonesian freelancers, creators, and solo professionals record personal and work expenses, compare spending across periods, and understand the transactions behind changes.

Core experience: **record an expense → review a period → see a spending change → inspect supporting transactions → export records.**

This is a spending tracker. It is not accounting, tax-compliance, bank-balance, or investment software. The product records what the user types; it does not verify completeness against any bank feed.

## 2. Facts, assumptions, experiments

Throughout this document:

- **Fact** — verifiable now from this specification or the real world (e.g. IDR has no minor unit in practice; a month is not always 30 days).
- **Assumption** — a belief we hold without proof (e.g. "freelancers want to see personal vs work split").
- **Experiment** — something the pilot will test; each experiment names its action-if-confirmed and action-if-refuted.

Key assumptions with planned tests:

| ID | Assumption | Test | If confirmed | If refuted |
|---|---|---|---|---|
| A1 | Rp29,000/mo is acceptable for the hosted pilot | Recruit 5–10 pilot users; observe paid conversion (BUSINESS §5) | Keep price for pilot | Revisit price or value story |
| A2 | "Record an expense in under 10 seconds" is achievable and matters | Time-to-save instrumentation during pilot (PRD §5.9) | Keep single-screen entry | Re-examine entry flow before charging |
| A3 | Personal/Work split is the classification users need | Track classification usage rate | Keep two-way split | Consider subcategories |

## 3. Release boundaries

Three stages with hard boundaries. Nothing moves between stages without a founder decision recorded in docs/ROADMAP.md.

### Stage A — Working core (first release)

Functional release for initial testing. No accounts, no payments.

| ID | Requirement |
|---|---|
| PRD-F1 | Expense creation, editing, deletion |
| PRD-F2 | Daily, weekly, monthly, yearly views |
| PRD-F3 | Period comparisons |
| PRD-F4 | Explainable spending signals |
| PRD-F5 | Transaction search and filtering |
| PRD-F6 | CSV export |
| PRD-F7 | Persistent storage |
| PRD-F8 | Responsive design and accessibility |

Working-core persistence is local-first (browser storage) so the product is testable before any server exists (ARCHITECTURE §3).

### Stage B — Hosted paid pilot

Requirements necessary to charge early users:

| ID | Requirement |
|---|---|
| PRD-B1 | Accounts and session management |
| PRD-B2 | Private user data with server-side authorization |
| PRD-B3 | Cross-device access |
| PRD-B4 | Account recovery |
| PRD-B5 | Tested backup and restoration process |
| PRD-B6 | Data export and account deletion |
| PRD-B7 | Defined payment and access process |
| PRD-B8 | Basic operational monitoring |
| PRD-B9 | Support and feedback route |
| PRD-B10 | Honest privacy and service information |

### Stage C — Later possibilities

Evaluate, do not include by default: budgets, recurring expenses, CSV import, receipt attachments/OCR, multiple currencies, bank connections, household/team accounts, AI advice, native mobile apps, offline writes with conflict resolution.

Deferral logic: each Stage C item adds state or sync complexity that multiplies testing cost. Budgets and recurring expenses change the overview's meaning (planned vs recorded); bank connections change the trust story entirely. Revisit only after pilot evidence shows demand (ROADMAP §3).

## 4. Audience definition

**Recommendation: keep the audience as specified, and narrow it further by behavior, not by demographics.** "Indonesian freelancers who record expenses at least weekly and want to separate personal from work spending" is the primary user. Broadening to "everyone in Indonesia" or "all freelancers globally" would dilute onboarding defaults (IDR, Asia/Jakarta, Monday-start weeks) that give the product its identity. The niche is narrow enough that defaults feel correct for the target user, and small enough that a solo founder can reach it through personal networks.

| Item | Definition |
|---|---|
| Primary user | Indonesian freelancer, creator, or solo professional; earns in IDR; mixes personal and work expenses; currently tracks spending irregularly or not at all |
| Main problem | Cannot answer "did my spending change, and which purchases caused it?" without spreadsheets or manual math |
| Current workaround | Spreadsheet (Google Sheets), notebook, or nothing; some use bank apps that show balances but not spending changes |
| Expected recurring value | Weekly review ritual: see what changed this week/month vs last, drill into transactions, export when needed |
| Churn risks | Forgetting to record; feeling guilty about visible spending; perceiving no change between periods; finding entry slower than the spreadsheet they left |
| Learn before charging | Willingness to pay (A1), entry speed (A2), classification fit (A3) |
| Personal vs professional boundary | MONTARA tracks and classifies spending. It does not invoice, compute tax, depreciate assets, or produce financial statements. Work classification exists so users can filter; it is not bookkeeping |

Concrete moments to open the product:
- Sunday evening review: "What did I spend this week vs last week?"
- After a big purchase: "How much is left this month?" (answered with recorded totals, not budgets)
- Invoice paid: "How much did I spend on work this month?"
- Before saying yes to a low-paying gig: "What are my baseline monthly expenses?"

## 5. Expense recording

### 5.1 Fields

| Field | Required | Default | Validation | Max length |
|---|---|---|---|---|
| Amount | Yes | Empty; cursor lands here | Integer rupiah ≥ 1 and ≤ 9,999,999,999 (exceeds 32-bit integer range; stored as 64-bit, see DATA-MODEL §2) | 10 digits |
| Expense date | Yes | Today in account timezone | Valid calendar date; not more than 1 year in the future | 10 chars (YYYY-MM-DD) |
| Category | Yes | Most recently used category | Must exist and belong to the user | 40 chars |
| Classification | Yes | Same as last saved expense (Personal default) | `personal` or `work` | — |
| Merchant | No | Empty | Free text, trimmed | 60 chars |
| Note | No | Empty | Free text, trimmed | 200 chars |
| Payment method | No | Empty | Free text, trimmed | 30 chars |

Payment method decision: **defer as a required field, keep as optional free text.** Rationale: forcing method selection adds a tap to every entry (A2 risk) while the classification and category carry more analytical weight. If pilot data shows users typing "QRIS"/"cash"/"card" into notes, promote it to a first-class field with presets.

Refunds: **deferred** (Stage C). Negative amounts are rejected (§5.1); users who need to correct an expense edit or delete it instead. Do not model refund logic until pilot demand appears.

### 5.2 Future dates
Allowed up to 1 year ahead (post-dated checks, pre-trip cash planning). Future-dated expenses appear in views whose range covers their date, and are excluded from comparisons until their period completes. They never appear in "current period elapsed-portion" comparisons (§6.4). Current-period recorded totals exclude dates after today; future-dated rows surface only when navigating to their date/range, labeled with their date.

### 5.3 First-use entry flow
1. Empty overview shows a single prominent action: "Record first expense".
2. Form: Amount (numeric keypad focus) → date (pre-filled, collapsible) → category (recent 3 + full list) → classification toggle → optional merchant/note collapsed behind "Add details".
3. Save returns to Overview with the new expense visible in Recent transactions.

### 5.4 Repeat entry flow
Same form, pre-filled with last-used category and classification. Reached via a persistent "+" action visible on all app screens. Amount field receives focus immediately; Enter saves; date and optional fields stay collapsed unless edited recently.

### 5.5 Keyboard behavior
- Amount: numeric keyboard on mobile (`inputmode="numeric"`), digits only accepted; no decimal point (IDR has no minor unit in practice).
- Tab order: Amount → Date → Category → Classification → Merchant → Note → Save.
- `Cmd/Ctrl+Enter` saves from any field. `Esc` closes the form without saving (confirmation if fields are dirty).
- Desktop shortcut `N` opens the entry form from any app screen (documented in UI, disabled while typing in a field).

### 5.6 Saving, success, retry, failure
- Save shows a pending state on the button; double-submit blocked by disabling the button on first press and by a client-side request guard (single in-flight save).
- Success: form closes, new expense visible in the current view, confirmation is the record itself (no toast needed for repeat entries).
- Validation failure: inline field errors; user data preserved.
- Network/server failure (Stage B): form keeps contents, explicit retry offered, nothing silently discarded. Stage A failure modes are storage-quota errors surfaced as an alert with the draft preserved.

### 5.7 Duplicate submission prevention
- Save button disabled while a save is in flight.
- Idempotency key generated per form-open; server treats repeated submits with the same key as one record (DATA-MODEL §2).
- Accidental double-tap within 300 ms coalesced client-side.

### 5.8 Editing and deletion
- Any expense editable via its detail view; same form, pre-filled.
- Deletion requires explicit confirmation (AlertDialog naming the amount and date).
- When an expense moves between dates: totals and comparisons recompute for both affected periods on next view load; signals recompute (§7.8). No notification spam: changes surface only when the user re-opens a view.
- When an expense changes category: same recompute behavior; historical signal cards never persist old values.

### 5.9 Entry-speed target
"Record an expense in under 10 seconds" is a usability target to **test**, not a performance claim. Measured from form open to save complete, instrumented during the pilot (A2). Time-to-save metric appears in the pilot scorecard (BUSINESS §5).

### 5.10 Category management
- Defaults seeded per account: Food, Transport, Housing, Bills, Health, Fun, Shopping, Education, Work Direct Cost, Work Tools, Other. Users can rename, archive, and add (DATA-MODEL §3).
- Rename: updates all past expenses to the new name instantly (categories are referenced by ID, not stored as text).
- Archive: hides from pickers, keeps history intact; archived categories remain filterable in Transactions.
- Delete: allowed only when no expense references the category; otherwise offer archive. No orphan records.
- Maximum: no hard cap on category count; soft guidance "keep it under 20" shown in the manage screen.

## 6. Period calculations

Date-only expense dates (YYYY-MM-DD). No time-of-day is stored or inferred. Account timezone (suggested Asia/Jakarta at onboarding) determines "today". Date parsing is always calendar-based: YYYY-MM-DD strings parse to date-only values; never via `new Date(string)` epoch math, which shifts by UTC offset (ARCHITECTURE §6).

### 6.1 Period definitions

| Period | Definition | Example |
|---|---|---|
| Day | Single calendar date in account timezone | 2026-09-17 |
| Week | Monday–Sunday containing that date (fact: ISO week) | 2026-09-14 → 2026-09-20 |
| Month | Calendar month | 2026-09-01 → 2026-09-30 |
| Year | Calendar year | 2026-01-01 → 2026-12-31 |

Navigation: previous/next moves one full period. "Today" view jumps from anywhere. Period label shows the human range (e.g. "September 2026", "14–20 Sep 2026") alongside the picker.

Current vs completed: a period is **completed** when its end date is before today. Today's day/week/month/year are **current**.

### 6.2 Totals
Total for any range = sum of amounts of expenses whose date falls within [start, end], inclusive, in the account timezone. Amounts are integers; sums are integer additions (no floats, no rounding).

Worked example:
- Expenses: 2026-09-14 Rp50.000; 2026-09-15 Rp120.000; 2026-09-20 Rp30.000
- Week 2026-09-14 → 2026-09-20 total = 50.000 + 120.000 + 30.000 = **Rp200.000**
- An expense dated 2026-09-13 (Sunday) belongs to the previous week (2026-09-07 → 2026-09-13) and is excluded: its week total stays unchanged.

### 6.3 Completed-period comparison
For a completed period P with previous equivalent P′: change = total(P) − total(P′); percent = change ÷ total(P′) × 100.

Worked example (month):
- August 2026 total = Rp4.000.000; September 2026 total = Rp4.600.000
- Change = +Rp600.000; percent = +15%
- Interface: "[PERIOD] September 2026: Rp4.600.000 recorded · +Rp600.000 (+15%) vs August 2026"

Worked example (unequal months, boundary):
- February 2026 (28 days, leap-ish rule: 2026 not a leap year) total = Rp2.800.000 vs January 2026 (31 days) = Rp4.000.000
- Comparison is whole-month vs whole-month (not day-normalized): change = −Rp1.200.000 (−30%).
- Day-normalized figures are never shown in Stage A. (Assumption: users think in whole periods; revisit if pilot asks "but February is shorter".)

Year boundary example:
- Week containing 2025-12-29 → 2026-01-04 is one week; its previous is 2025-12-22 → 2025-12-28. Both computed by Monday-back arithmetic, not by year arithmetic.

### 6.4 Current-period comparison (elapsed portion)
For a current period, compare against the equivalent elapsed portion of the previous period:

- Elapsed days = days from previous-period start through the matching day count. If today is day k of the current period, compare against previous period days 1..k.
- Rule: compare day 1..k of current vs day 1..k of previous. For months this equals the same calendar dates (Sep 1–17 vs Aug 1–17); for February edges counting stays ordinal so Feb 29 never breaks "day k" math. Weeks compare day 1..k of week (Mon = 1).
- The current day may be incomplete; a label states this. Because entries carry a date rather than a purchase time, no same-time-of-day comparison is implied anywhere.

Worked example:
- Today = 2026-09-17 (day 17 of September).
- Current: Sep 1–17 recorded total = Rp2.400.000 (includes today's Rp45.000, noted as incomplete).
- Elapsed prior: Sep 1–17 of August = Rp2.100.000.
- Change = +Rp300.000 (+14.3%), labeled "vs same dates last month".

Worked example (leap day):
- 2028-02-29 exists; March 2028 elapsed comparison from Mar 1 to Mar k uses February's day count only up to the equivalent ordinal (k); Feb 29 itself participates in current-February totals but never breaks "day k" math because elapsed counting is ordinal, not date-anchored.

Worked example (week, early days):
- Today = Monday 2026-09-14 (day 1). Current week total = Rp80.000 vs previous week day 1 (Monday 2026-09-07) = Rp150.000. Change = −Rp70.000, labeled "vs Monday last week · day 1 of 7".

### 6.5 Custom date filters (Transactions screen)
Custom ranges show totals for the selected range only. **No comparison** is offered for arbitrary ranges in Stage A (no unambiguous "previous equivalent" exists). The filter shows its explicit date range in the UI at all times.

### 6.6 Zero, empty, and insufficient history

| Situation | Display |
|---|---|
| Confirmed zero (period has expenses, all summed to 0) | Not reachable: minimum amount is 1 (§5.1), so a zero total means no expenses. The "confirmed zero" case is therefore only a filter result: "0 expenses match this filter" |
| No recorded expenses in period | "No recorded expenses in this period." + comparison line shows "No recorded expenses in the previous period either" or the prior total for context |
| Insufficient history (no previous equivalent period data) | Comparison section shows "Not enough history to compare yet." Signals requiring a previous period are omitted (§7) |
| Completeness | Copy says "recorded spending", never "you spent" — manual entry does not prove completeness |

### 6.7 Calculation ownership
All period math lives in one shared module with unit tests (ARCHITECTURE §7). Screens never re-implement totals, ranges, or comparisons.

## 7. Deterministic spending signals

Arithmetic and explicit rules only. No LLM or AI service. At most **three** signals shown, ranked; no information repeated across cards. Signals never imply causation or motives: they describe changes in recorded data.

Shared display rule: every signal is one sentence with a click target that opens Transactions pre-filtered to the exact expenses behind the number, preserving dates, category, and Personal/Work filter. Signals recompute on view load after any edit/delete (§5.8); they are never cached across data changes.

### 7.1 Signal 1 — Largest category increase

| Aspect | Rule |
|---|---|
| Inputs | Per-category totals for selected period P and previous equivalent P′ |
| Formula | Δ_c = total_c(P) − total_c(P′) for each category c present in either period |
| Eligibility | P′ has data for the same period type; at least one category with Δ_c > 0 |
| Minimum data | ≥ 3 days of P elapsed, and P′ non-empty |
| Ranking | Max Δ_c (absolute rupiah) |
| Tie | Alphabetically first category name wins |
| Threshold | Show only if Δ_c ≥ Rp50.000 (tunable product assumption, unvalidated) |
| Zero baseline | If total_c(P′) = 0 and total_c(P) > 0: show "New spending appeared in [category]: RpX" — never a percentage |
| Empty/insufficient | Omit signal entirely, no placeholder |
| Copy | "Software spending increased Rp300.000 compared with the same dates last month." |
| Link | Opens Transactions filtered to [category] within [P start, P end], sort amount desc |

### 7.2 Signal 2 — Largest transaction

| Aspect | Rule |
|---|---|
| Inputs | All expenses in selected period P |
| Formula | Max amount |
| Eligibility | ≥ 1 expense in P |
| Minimum data | None beyond eligibility |
| Tie | Most recent wins; if still tied, first-created wins |
| Threshold | None (always eligible) |
| Zero baseline | n/a |
| Empty/insufficient | Omit when P empty |
| Copy | "Largest recorded expense this period: Rp1.200.000 · [merchant or category] · 12 Sep" |
| Link | Opens that expense's detail |

### 7.3 Signal 3 — Personal vs Work shift

| Aspect | Rule |
|---|---|
| Inputs | Sum of personal, sum of work, for P and P′ |
| Formula | Δ_personal = personal(P) − personal(P′); Δ_work = work(P) − work(P′) |
| Eligibility | P′ has data; at least one Δ ≠ 0 |
| Minimum data | P′ non-empty |
| Ranking | Report the larger absolute delta |
| Tie (Δ_personal = Δ_work) | Report both in one card: "Personal and Work each increased Rp100.000" |
| Threshold | None; but omit if both Δ = 0 (that is "no change", not a signal) |
| Zero baseline | If personal(P′) = 0: "First recorded Work spending appeared this period" (or mirror for Work) |
| Empty/insufficient | Omit |
| Copy | "Work spending increased Rp500.000 vs the same dates last month; Personal decreased Rp120.000." |
| Link | Opens Transactions filtered to that classification within [P start, P end] |

### 7.4 Anti-duplication rule
If Signal 1's category also explains Signal 3 (e.g. the work increase IS the software increase), show Signal 1 with its category link and drop the redundant Signal 3 sentence; the classification breakdown remains visible in the category section below signals.

### 7.5 Ranking when more than three qualify
Order: (1) largest category increase, (2) largest transaction, (3) personal/work shift; fill remaining slots from a reserve list of next-largest category increases (2nd, 3rd by Δ_c). Never more than three cards.

### 7.6 Label accuracy
- Percentages shown only when the base (P′ value) > 0; otherwise absolute rupiah only.
- Never display Infinity, NaN, or "∞%". Zero-baseline cases use the "New spending appeared" copy (§7.1).
- All comparisons cite the actual date ranges being compared (§6.4), e.g. "1–17 Sep vs 1–17 Aug".

### 7.7 Correlation, not causation
Signals describe arithmetic differences. No card says "because" or attributes intent. The deepest explanation offered is the list of transactions that produced the change.

### 7.8 Refresh behavior
Signals are pure functions of current data (§6.7). Edits, deletions, date moves, and category changes all recompute on next render; no stale signal caching across mutations.

## 8. Screens and navigation

### 8.1 Public screens

Public screens are static-first, no account needed. Stage A ships landing + local overview demo; sign-in, pricing, privacy activate at Stage B (ROADMAP §slice-7).

**8.1.1 Landing (/)**
- Goal: explain product in 30s and show real UI.
- Primary action: "Try the demo" (Stage A local demo) / "Start pilot" (Stage B).
- Hierarchy: wordmark mntr// + tagline → product screenshot or live demo embed → 3-step how-it-works (record → compare → inspect) → illustrative change example with "Demo data" label → pricing teaser → footer.
- Example block: "[CHANGE] Software Rp900.000 → Rp1.200.000 (+Rp300.000) · 1–17 Sep vs 1–17 Aug · Demo data".
- States: static; offline shows cached page.
- Mobile: single column, demo collapses to image.
- A11y: semantic landmarks, alt text for screenshots, tabular numerals for demo figures.
- Acceptance: no invented testimonials, no savings promises, demo-data label present; Lighthouse-style check manual.

**8.1.2 Pricing / paid-pilot (/pricing) — Stage B**
- Goal: state price, what hosting covers, manual-pilot process.
- Primary action: "Request pilot access" (form or contact route per BUSINESS §5).
- Contents: Rp29.000/mo hypothesis labeled as pilot price; what self-hosters get free; renewal/cancel/export-after-expiry rules; no fake urgency.
- Acceptance: price, billing cadence, cancellation, export-after-expiry all stated.

**8.1.3 Sign-in and recovery (/sign-in, /recover) — Stage B**
- Goal: log in, recover account.
- Primary action: sign in with email+password (Better Auth email/password; ARCHITECTURE §5).
- Recovery: email link flow, expiry stated, no enumeration of registered emails in errors.
- Acceptance: session persists cross-device; recovery tested end-to-end (ACCEPTANCE §B4).

**8.1.4 Privacy (/privacy) — Stage B**
- Goal: honest data story.
- Contents: what is stored, where hosted, backup retention, export/delete rights, contact route, what analytics is NOT collected (no amounts/merchants/notes to third parties).
- Acceptance: matches implemented behavior; no compliance claims beyond what is verified.

### 8.2 Application screens

Compact top nav: Overview · Transactions · [+ Record] · Account. No sidebar.

**8.2.1 Overview (/overview)**
- Goal: answer "what changed?" for selected period.
- Primary action: period switcher (Day/Week/Month/Year + prev/next/today).
- Hierarchy (fixed order): 1. selected period label + date range; 2. recorded total + comparison line; 3. signals (max 3); 4. category breakdown; 5. recent transactions (latest 10, link to full list).
- Components: period segmented control, total panel, signal cards, category table, recent list (DESIGN §5, shadcn Card/Table/Badge/Button).
- Data: totals + comparisons (§6), signals (§7), category sums, recent query.
- Empty: no expenses → "Record first expense" CTA. Loading: skeletons (no layout shift). Error: retry with data preserved. Offline Stage A: works (local); Stage B: read cached, writes queued with explicit "unsynced" state, never silent loss.
- Mobile: stacked, period control sticky under header, amounts right-aligned tabular.
- A11y: h1 = period label; comparison in aria-live polite; signal cards are links with descriptive names.
- Acceptance: hierarchy order verified; date ranges always visible; signal click lands on filtered Transactions.

**8.2.2 Transactions (/transactions)**
- Goal: find and audit any expense.
- Primary action: search + filter (text across merchant/note, category multi-select, classification toggle, date range with presets).
- Hierarchy: filter bar → result total ("RpX recorded across N expenses · 1–17 Sep") → list grouped by date desc → pagination or virtual list.
- Components: Input, Select/Combobox, ToggleGroup, Calendar/DatePicker, Table.
- Data: filtered expense query with indexes (DATA-MODEL §2).
- Empty: "0 expenses match this filter" + clear-filters action. Custom ranges show totals only, no comparison (§6.5).
- Mobile: filters in collapsible sheet; list rows full-width.
- A11y: filter controls labeled; results count announced.
- Acceptance: active filters reflected in CSV export; signal deep-links reproduce exact filter state.

**8.2.3 Add/edit expense (/record, /expenses/:id/edit)**
- Goal: record in under 10s (target, §5.9).
- Primary action: Save.
- Spec: fields/flows per §5. Sheet on mobile, dialog or page on desktop; focus amount on open.
- Acceptance: keyboard flow (§5.5), duplicate-submit guard (§5.7), draft preserved on failure (§5.6).

**8.2.4 Account and preferences (/account) — Stage A local prefs; Stage B full**
- Goal: control identity, prefs, data.
- Primary action set: timezone confirm (Asia/Jakarta suggested), week-start fixed Monday (display only), category manage (§5.10), export CSV, delete account (Stage B).
- Data: user profile + prefs (DATA-MODEL §1).
- Acceptance: timezone change recomputes "today" immediately; export includes active filters; delete requires confirmation and wipes user rows per DATA-MODEL §5.

## 9. Visual system — summary

Full visual specification lives in docs/DESIGN.md (tokens, typography, states, wireframes). Product-level rules here:

| ID | Requirement |
|---|---|
| PRD-V1 | Premium instrument-panel style with restrained ASCII markers ([CHANGE], [PERIOD], [RECORDS]); decorative characters hidden from assistive tech |
| PRD-V2 | shadcn/ui components with shared theme tokens; only components the screens need |
| PRD-V3 | Amounts, dates, compact labels use monospace/tabular numerals |
| PRD-V4 | No gradients, glass, neon-terminal styling, fake prompts, emoji categories, stock art, or placeholder marketing copy |
| PRD-V5 | Overview hierarchy fixed: period → recorded total + comparison → signals → category breakdown → recent transactions |
| PRD-V6 | Compact top navigation; no large sidebar for four app pages |
| PRD-V7 | Landing page shows real product experience with labeled demo data; no invented social proof or savings promises |

Wireframes (hierarchy diagrams, not literal ASCII layouts) for desktop overview, mobile overview, and entry flow are in docs/DESIGN.md §6.

## 10. Technical architecture — product constraints

Full spec in docs/ARCHITECTURE.md. Binding product decisions:

| ID | Decision |
|---|---|
| PRD-T1 | One TypeScript + React + shadcn/ui codebase; Next.js App Router full-stack (server components + server actions for mutations — Stage B only; Stage A is static export with no server actions, per ARCHITECTURE §1–3) |
| PRD-T2 | Stage A persistence is local (browser storage) with the same calculation module that Stage B reuses against Postgres |
| PRD-T3 | Stage B database is Postgres (relational); auth is Better Auth email/password; hosting is a single Node host (VPS or PaaS) with managed Postgres |
| PRD-T4 | One implementation of period/signal math shared by all screens (no duplicated logic) |
| PRD-T5 | No microservices, Kubernetes, queues, custom auth, vector DB, or plugin system in Stage A/B |
| PRD-T6 | Self-hosting must not require the managed provider: `docker compose up` runs app + Postgres with billing disabled |

Why this fits: solo beginner + agents do best with one deployable, established ORM/migration story, and server-side auth checks in one place. Next.js gives static public pages and authenticated app routes from one repo without a separate API service.

## 11. Data model and privacy — product constraints

Full spec in docs/DATA-MODEL.md. Binding decisions:

| ID | Decision |
|---|---|
| PRD-D1 | Minimum tables: users (via Better Auth), profiles/preferences, categories, expenses, plus pilot entitlements (Stage B) |
| PRD-D2 | IDR amounts are integers (BIGINT rupiah); no floats anywhere; app-level CHECK amount 1..9,999,999,999 |
| PRD-D3 | Expense dates are DATE (no time); timezone lives on profile and only decides "today" and period edges |
| PRD-D4 | Every private row carries user ownership; every query is scoped server-side; cross-user read/write is rejected and tested |
| PRD-D5 | Account deletion removes user rows; backups retain encrypted copies until retention expiry, then age out (stated in /privacy) |
| PRD-D6 | No expense details (amounts, merchants, notes) in logs or third-party analytics |

## 12. Export and data portability

| ID | Requirement |
|---|---|
| PRD-E1 | CSV export reflects active Transactions filters; "Export all" exports everything |
| PRD-E2 | Columns (fixed order): `date,amount_idr,category,classification,merchant,note,payment_method,created_at,updated_at`; UTF-8 with BOM for Excel; CRLF line endings |
| PRD-E3 | Exact amounts and YYYY-MM-DD dates preserved; RFC-4180 quoting; formula-injection guard: prefix `= + - @` (also tab/CR) cells with `'` |
| PRD-E4 | Empty export still downloads a header-only file with a notice, never a 0-byte or error page |
| PRD-E5 | Filename: `montara-expenses-YYYYMMDD-HHmm.csv` in account timezone |
| PRD-E6 | CSV is a records export, not a full backup (no prefs/entitlements); never labeled "complete backup" |
| PRD-E7 | Export stays available after subscription expiry (read-only account state) |

## 13. Open-source model — product constraints

Full spec in docs/ROADMAP.md §8 and CONTRIBUTING.md. Binding decisions:

| ID | Decision |
|---|---|
| PRD-O1 | Entire application source is public in one repo; hosted billing/entitlement checks are a config-flagged module, disabled by default for self-hosters |
| PRD-O2 | Self-hosters get full tracking product; they operate host, Postgres, backups, mail themselves |
| PRD-O3 | Paid hosting sells operations (uptime, backups, recovery, support, cross-device), not features |
| PRD-O4 | One codebase: no private fork; hosted-only code paths are feature flags, not separate branches |
| PRD-O5 | License is a founder decision (recommendation: AGPL-3.0 if hosted-moat matters, MIT if adoption matters most — see BUSINESS §7); no LICENSE file is added until decided |
| PRD-O6 | Trademark (MONTARA, mntr//) stays with founder regardless of code license; forks rebrand |

## 14. SaaS and monetization — pilot experiment

Full analysis in docs/BUSINESS.md. Binding product surface: pricing page, manual pilot flow, entitlement states (trial/active/past-due/canceled/export-only).

- Hypothesis price: Rp29.000/mo (experiment, unvalidated).
- Stage B payment process: **manual pilot first** (bank transfer / QRIS + founder-confirmed activation within 24h). Automated checkout (provider-hosted, e.g. Xendit/Midtrans/Stripe — unverified, BUSINESS §4) only after 5–10 paying pilots renew once.
- Rules: confirmation message on activation; renewal is manual in pilot; failed/late payment → 14-day grace read-only, export always works; cancellation is one action + export prompt; refunds are case-by-case stated on /pricing.
- Unit economics are illustrative only (BUSINESS §6); gross revenue is never called profit.

## 15. Validation and pilot scorecard

Full scorecard in docs/BUSINESS.md §5. Product-instrumented events (minimum, no amounts/merchants/notes leave the device to third parties):

first-expense-saved, entry duration (form-open → save), weekly return (W1/W2), multi-day recording, signal opened, signal → transactions drill, willingness-to-pay answer, paid conversion, renewal, stop-reason (exit survey).

Hypothesis thresholds (all unvalidated): ≥60% of testers save first expense in session 1; median entry <10s by week 2; ≥40% return in week 2; ≥30% open a signal; ≥3 of 10 convert to paid; ≥60% of payers renew month 2. Miss any two → pause charging, fix entry/return first (BUSINESS §5).

## 16. Acceptance and verification — scope

Full checklist in docs/ACCEPTANCE.md (traceable to IDs above). Product requires: expense CRUD, refresh + cross-device persistence (Stage B), unauthorized-access rejection, invalid/excessive amounts, date/timezone boundaries, month-end + leap-year comparisons, zero-baseline + missing-history states, signal-evidence matching totals, duplicate submits, CSV escaping + formula injection, recovery, deletion, backup restore, payment access rules, mobile layout, keyboard nav, screen-reader labels, no-silent-loss on network failure. Tests: unit (money/dates/comparisons/signals) + integration (persistence, isolation) + one E2E (record → compare → inspect → export).

## 17. Delivery roadmap — scope order

Full slices in docs/ROADMAP.md. Order is fixed: 1) overview + entry prototype → 2) real save with ownership → 3) edit/delete + transactions → 4) tested comparisons → 5) signals with links → 6) export + account controls → 7) ops verification + pilot release → 8) payment process + retention review. No slice starts until the previous slice's acceptance checks pass.

## 18. Founder decisions

| # | Decision | Recommendation | Status |
|---|---|---|---|
| D1 | Code license | AGPL-3.0 if you want hosted-moat; MIT if you want max adoption (BUSINESS §7) | Open — no LICENSE file until decided |
| D2 | Payment provider for automation | Decide after manual pilot; shortlist Xendit/Midtrans for IDR (unverified — verify pricing/webhooks before committing) | Open |
| D3 | Host + managed Postgres vendor | Cheapest reputable VPS + managed Postgres; verify backup story before pilot | Open |
| D4 | Support channel | Single email or form-to-inbox for pilot; no helpdesk yet | Open |
| D5 | Refund modeling | Keep deferred (edit/delete instead) unless ≥3 pilot users ask | Open |

Product direction: ship the local-first working core (slices 1–6) before any accounts or payments. Charge only when entry-speed and week-2 return clear thresholds. Keep scope hard: every Stage C request waits for pilot evidence.
