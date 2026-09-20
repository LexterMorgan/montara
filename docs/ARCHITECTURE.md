# MONTARA Architecture

Scope source: `docs/PRD.md` §10. Plain-language reasons included.

## 1. Stack (one codebase)

TypeScript + React + shadcn/ui on Next.js App Router. Stage A is static export with browser storage only — no Postgres, ORM, auth, or server actions installed. Stage B adds: Postgres + Prisma (or Drizzle — founder picks at slice 2; one ORM only), Better Auth email/password, single Node host + managed Postgres.

Why: one deployable a solo beginner + agents can hold in head. Next.js gives static public pages + authenticated routes without separate API service. Postgres = real constraints + migrations. Better Auth = sessions/recovery without custom crypto. No microservices/K8s/queues/vector/plugin system — no requirement needs them.

Tradeoff note: Next.js adds framework surface vs bare Vite + API; pays off at Stage B (auth/session/SSR guards in one place). Self-host stays `docker compose up` (app + Postgres, billing off).

## 2. Boundary

Browser: renders, validates for UX, holds Stage-A local data. Server: owns truth at Stage B — all private reads/writes scoped by session user id in server actions/routes; client never trusts its own user id. Validation twice: UX in browser, enforcement on server (trust boundary).

## 3. Stage A persistence

Browser storage (localStorage first via tiny wrapper; IndexedDB upgrade path if quota demands) so product testable with zero servers. Same calculation module imported by UI; Stage B reuses it against Postgres rows. Migration path: Stage B adds export-local → import-to-account (CSV shape, PRD §12).

## 4. Calculation ownership

One module `lib/calc` (periods + comparisons + signals, pure functions of {expenses, timezone, today}). Screens call it; never re-implement. Unit-tested per ACCEPTANCE. Date parsing calendar-based only; never `new Date('YYYY-MM-DD')` epoch math (UTC shift bug).

## 5. Auth (Stage B)

Better Auth email/password + session cookie. Recovery via emailed link with expiry. Every private server action asserts session → `userId` → row ownership. Managed-provider duties (if PaaS): TLS, restarts, Postgres backups; founder still configures env/secrets, backup-restore drills, log redaction.

## 6. Envs / deploy / backup

Envs: `DATABASE_URL`, `BETTER_AUTH_SECRET`, `BETTER_AUTH_URL`, `MAIL_*` (Stage B), `BILLING_ENABLED=false` default (see `.env.example`). Dev = local Postgres compose; test = ephemeral DB per run; prod = managed Postgres + daily snapshots + monthly restore drill. Rollback = redeploy prior image tag (migrations backward-compatible or paired down-migration tested).
