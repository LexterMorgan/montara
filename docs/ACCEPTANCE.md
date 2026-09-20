# MONTARA Acceptance

Traceable to PRD IDs. `[A]` = automatable, `[M]` = manual.

## Expense CRUD [A]
- Create valid → appears in Overview recent + Transactions (PRD-F1, §5.6).
- Edit amount/date/category → both affected periods recompute (§5.8).
- Delete with confirm → gone everywhere; signals recompute (§7.8).
- Invalid (0, negative, >9,999,999,999, bad date, >1yr future, oversize text) rejected with inline error, draft kept.
- Double-submit (button + replayed idempotency key) → exactly one row (§5.7).

## Persistence / isolation [A]
- Reload from slice-2 on (Stage A local) / new device login (Stage B) → data intact. Slice-1 static demo exempt (resets on reload OK).
- User X cannot read/write user Y rows → rejected (PRD-B2).

## Dates / comparisons [A]
- Week edges: 2026-09-13 Sun in prior week, not current (§6.2 example).
- Month-end: Sep vs Aug whole-month math (§6.3). Leap: Feb 29 participates, ordinal elapsed math unbroken (§6.4).
- Elapsed comparison: Sep 1–17 vs Aug 1–17 = +Rp300.000 (+14.3%) with incomplete-day label.
- Custom range: totals only, no comparison, range always shown (§6.5).
- Zero/history: empty → "No recorded expenses"; no prior → "Not enough history"; never Infinity/NaN/∞% (§6.6, §7.6).

## Signals [A]
- Fixture: Software +Rp300.000 largest → Signal 1 copy + link lands on filtered Transactions reproducing exact sum.
- Largest transaction tie → most recent wins (§7.2).
- Both deltas 0 → Signal 3 omitted. Duplicate explanation → Signal 1 kept, Signal 3 dropped (§7.4).

## CSV [A]
- Filtered export matches on-screen filters; all-export complete.
- Columns exact order; UTF-8 BOM; quoting RFC-4180; `=,+,-,@`/tab/CR cells `'`-prefixed (PRD-E3).
- Empty → header-only file + notice. Filename `montara-expenses-YYYYMMDD-HHmm.csv`.
- Never labeled backup (PRD-E6).

## Accounts / ops (Stage B) [A+M]
- Recovery email flow works; session cross-device; delete wipes rows; backup restore drilled monthly [A restore in staging, M verify].
- Payment: manual activation ≤24h; past-due read-only + export works; cancel one action [M].

## UX [M]
- Mobile 360px layout stacked, no overlap; keyboard full flow (Tab order, Cmd+Enter save, N opens, Esc confirms-dirty); screen-reader: landmarks, signal links named, ASCII decorative hidden, deltas not color-only.
- Network fail (B): draft kept, explicit retry, no silent loss. Entry timed: median <10s week 2 (target, not claim).

## Test tiers
Unit: money/dates/comparisons/signals. Integration: persistence + isolation. E2E (one): record → compare → signal → drill → export.
