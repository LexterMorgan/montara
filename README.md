# MONTARA — mntr//

See what changed in your money. Spending tracker for Indonesian freelancers, creators, solo professionals. IDR-only, Personal/Work split, deterministic change signals. Not accounting, tax, banking, or investment software.

## Status

Local-first MVP runnable. No backend, auth, database, or payments.

## Docs

- `docs/PRD.md` — source of truth (scope, calculations, signals)
- `docs/DESIGN.md` — visual system + wireframes
- `docs/ARCHITECTURE.md` — stack + boundaries
- `docs/DATA-MODEL.md` — tables + deletion
- `docs/BUSINESS.md` — pilot price experiment (Rp29.000/mo hypothesis)
- `docs/ACCEPTANCE.md` — traceable checklist
- `docs/ROADMAP.md` — 8 vertical slices
- `SECURITY.md`, `CONTRIBUTING.md` — root

## Run locally

`npm install`, then `npm run dev` → `http://localhost:3000/overview`. Record an expense, reload: the total persists.

## Deploy (static)

`npm run build` writes static files to `out/` (`index.html`, `overview.html`, `transactions.html`). Serve `out/` from any static host. No server required or supported.

## Limitations

Each browser stores its own data in `localStorage` (`montara.expenses.v1`). No accounts, sync, or cross-device access. Clearing site data deletes records. Export CSV regularly from Overview or Transactions. No backend, auth, database, payments, analytics, or notifications.

## Founder decisions open

License (MIT vs AGPL-3.0), payment provider, host vendor, support channel — see PRD §18.
