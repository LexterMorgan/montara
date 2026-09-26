# MONTARA Data Model

Scope source: `docs/PRD.md` §11. Sync spec: `docs/superpowers/specs/2026-09-26-cross-device-sync-design.md`.
The old Better Auth/Prisma Stage B direction (profiles/categories/entitlements tables, `category_id` FK, `payment_method`, `idempotency_key`) is superseded for this feature. What ships is below.

## 1. Expenses (`public.expenses`, Supabase Postgres)

| Field | Type | Notes |
|---|---|---|
| `id` | UUID PK, default `gen_random_uuid()` | import preserves existing UUIDs; upsert key |
| `user_id` | UUID NOT NULL FK → `auth.users(id)`, cascade delete | ownership; every policy scopes here |
| `amount_idr` | BIGINT NOT NULL CHECK (1..9999999999) | integer rupiah; no floats anywhere |
| `date` | DATE NOT NULL | date-only, no time |
| `category` | TEXT NOT NULL, trimmed length 1..40 | plain text (matches local shape); rename is just an update |
| `classification` | TEXT NOT NULL CHECK IN ('personal','work') | |
| `merchant` | TEXT NULL CHECK (≤60) | trimmed; null maps to `""` in UI |
| `note` | TEXT NULL CHECK (≤200) | trimmed; null maps to `""` in UI |
| `created_at` / `updated_at` | TIMESTAMPTZ NOT NULL DEFAULT `now()` | import preserves originals; `updated_at` refreshed on edit |

Migration: `supabase/migrations/20260926123247_create_expenses.sql`. RLS enabled; all privileges revoked from `anon`; only `select, insert, update, delete` granted to `authenticated`; four separate policies (`expenses_select_own`, `expenses_insert_own`, `expenses_update_own`, `expenses_delete_own`), each checking `(select auth.uid()) = user_id`, update with both USING and WITH CHECK.

App mapping (`lib/sync.ts`): `toExpense` converts snake_case rows to the `Expense` shape in `lib/calc.ts`; `toInsert` converts back and always takes `user_id` from the authenticated session, never from caller data.

## 2. Local-only data (never synced)

- `montara.expenses.v1` (localStorage): signed-out expense list; cleared once, only after the first import fully succeeds.
- `montara.prefs.v1` (localStorage): `{ lastCategory, lastClassification, profileName }` repeat-entry defaults; JSON restore still writes these locally.
- `montara.theme` (localStorage): Light/Dark choice.

## 3. Deletion / backups

Account delete → Supabase removes the auth user; `ON DELETE CASCADE` wipes their expense rows. Sign-out → session ends and synced expense data leaves the device; local workspace restarts empty. Backups: JSON file export (`montara-backup.json`) restores through `replaceAll` against the active store (upload-first, delete-obsolete-after in synced mode). No amount/merchant/note/email in logs.
