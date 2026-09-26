# MONTARA Architecture

Scope source: `docs/PRD.md` §10. Plain-language reasons included.
Sync spec: `docs/superpowers/specs/2026-09-26-cross-device-sync-design.md`.

## 1. Stack (one codebase)

TypeScript + React + shadcn/ui on Next.js App Router, static export to Cloudflare Pages. Local mode uses browser storage only. Optional sync adds exactly one client dependency (`@supabase/supabase-js`, exact-pinned) talking directly to Supabase Auth + Postgres — no `@supabase/ssr`, no Prisma/Drizzle, no Better Auth, no custom backend, no Node host, no Realtime.

Why: one deployable a solo beginner + agents can hold in head. Static export keeps hosting trivial; Supabase supplies sessions and a Postgres data API without a server to operate. No microservices/K8s/queues/vector/plugin system — no requirement needs them.

Tradeoff note: synced-mode writes require internet (no offline queue or conflict engine in this version); the latest confirmed update wins via `updated_at`.

## 2. Boundary

Browser: renders, validates for UX, holds signed-out local data. Signed in: Supabase owns truth — every `expenses` row carries `user_id`, and Row Level Security enforces `(select auth.uid()) = user_id` per operation (separate SELECT/INSERT/UPDATE/DELETE policies; UPDATE has both USING and WITH CHECK; `anon` revoked). The browser holds only the public URL + publishable key; secret/`service_role` keys never enter client code. Validation twice: UX in browser, enforcement in Postgres constraints + RLS (trust boundary).

## 3. Persistence

Browser storage (localStorage via tiny wrapper) so product testable with zero servers. Same calculation module imported by UI; synced rows map to the same `Expense` shape. Migration path: sign in → one-time UUID-preserving upsert of `montara.expenses.v1` → local cleared only on full success → Supabase is source of truth. Same calculation module runs against both stores; calculation functions stay pure.

## 4. Calculation ownership

One module `lib/calc` (periods + comparisons + signals, pure functions of {expenses, timezone, today}). Screens call it; never re-implement. Unit-tested per ACCEPTANCE. Date parsing calendar-based only; never `new Date('YYYY-MM-DD')` epoch math (UTC shift bug).

## 5. Auth (Supabase magic link, replaces Better Auth Stage B)

Email magic link via Supabase Auth; link redirects to `/overview`, which establishes the session. `AuthProvider` owns session state (`auth.getSession` + `onAuthStateChange`). Every signed-in expense call scopes to the session user id; RLS rejects cross-user access. Sign-out ends the Supabase session, discards synced expense state, and removes synced data from the device; theme and preferences remain. Allowed redirect URLs: local dev and the production Cloudflare Pages domain only.

## 6. Envs / deploy / backup

Envs: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` (both browser-safe; secret/`service_role` keys must never use `NEXT_PUBLIC_`). Absent vars = local-only build, Sync reports unavailable. Dev = `npm run dev` (+ optional `.env.local`); prod = Cloudflare Pages static export + the two public vars; backups = JSON export file + Supabase project backups; no expense payloads in logs.
