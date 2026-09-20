# MONTARA Roadmap

Vertical slices. No slice starts until prior acceptance passes. No dates (unknown capacity).

## slice-1 — Overview + entry prototype
Outcome: clickable overview + entry with demo data. Scope: PRD §8.2.1/8.2.3 UI, DESIGN tokens, static demo fixture in-memory only (resets on reload OK; no persistence, no server actions). Checks: hierarchy order, keyboard flow, mobile stack [M]. Feedback: do users read total→signal→breakdown order? Stop: hierarchy disputed → revise before data work.

## slice-2 — Real save + ownership
Outcome: expense persists (Stage A local; Stage B shape ready). Scope: PRD-F1/F7, DATA-MODEL §2–3, idempotency key. Checks: CRUD + reload + duplicate-submit [A]. Feedback: entry time. Stop: median far >10s → simplify form.

## slice-3 — Edit/delete + transactions
Outcome: full audit list with search/filter. Scope: PRD-F5, §5.8/5.10. Checks: move-date recompute, archive/delete rules [A]. Feedback: filter vocabulary match. Stop: filters unused → cut before comparisons.

## slice-4 — Tested comparisons
Outcome: day/week/month/year + elapsed logic. Scope: PRD-F2/F3, §6 incl. worked examples. Checks: all §6 fixtures [A]. Feedback: "same dates" label understood? Stop: confusion → copy fix, no new logic.

## slice-5 — Signals + links
Outcome: max-3 signals, each deep-links. Scope: PRD-F4, §7. Checks: signal fixtures [A]. Feedback: which signal opened? Stop: unopened → threshold/copy tune, not new signal types.

## slice-6 — Export + account controls
Outcome: CSV + prefs + categories + (B) delete. Scope: PRD-F6, §12, §8.2.4. Checks: CSV suite [A]. Feedback: export consumed where (spreadsheet?). Stop: escaping bugs → ship-blocker.

## slice-7 — Ops verify + pilot release
Outcome: hosted pilot live for 5–10. Scope: PRD-B1–B6/B8–B10, backup drill, /privacy, monitoring, support route. Checks: recovery, isolation, restore [A+M]. Feedback: scorecard week 1–2. Stop: return <40% → no payments yet.

## slice-8 — Payment + retention review
Outcome: manual pilot billing running, renew decision. Scope: PRD-B7, BUSINESS §4–5. Checks: grace/export-only/cancel [M]. Feedback: conversion + renewal vs thresholds. Stop: <3/10 convert → revisit price/value, not automation.

## Stage C gate
Any budgets/recurring/import/OCR/multi-currency/bank/team/AI/native/offline item needs: ≥3 pilot requests + founder decision logged here. Default answer: no.

## 8. Open-source ops (planned, not runnable yet)
No setup/run/migrate/seed/test/deploy/backup commands exist yet — docs-only repo. Slice-2 introduces them; until then treat all as `planned:`.
