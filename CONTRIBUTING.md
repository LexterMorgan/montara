# Contributing to MONTARA

Docs-only repo. Code contributions open at slice 1 (see `docs/ROADMAP.md`).

## Workflow

1. Pick a slice in order; no skipping.
2. Small PRs, one slice max. Link PRD IDs + acceptance checks.
3. `lib/calc` owns all period/signal math — never duplicate logic across screens.
4. Amounts integers only; dates YYYY-MM-DD calendar-parsed; no floats, no epoch-math parsing.

## Issues / PRs

- Bug reports: expected vs actual + fixture (dates, amounts, timezone).
- Features: Stage C requests need pilot evidence (ROADMAP gate); default answer no.
- PRs: description states slice, IDs covered, tests added (unit/integration/E2E per ACCEPTANCE).

## Secrets

Never commit `.env`. See `.env.example` for keys. Report vulnerabilities privately per `SECURITY.md` — no public PoC before fix.
