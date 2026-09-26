# Montara Cross-Device Sync Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add optional email sign-in and secure cross-device expense history while preserving Montara's existing account-free local mode.

**Architecture:** Supabase Auth provides magic-link sessions and Supabase Postgres stores signed-in expenses behind per-user Row Level Security. Signed-out users keep the current `localStorage` path; signed-in users use Supabase as the source of truth and can import their existing local expenses once.

**Tech Stack:** Next.js 15 static export, React 19, TypeScript, `@supabase/supabase-js`, Supabase Auth, Postgres RLS, Cloudflare Pages.

**Spec:** `docs/superpowers/specs/2026-09-26-cross-device-sync-design.md`

## Global Constraints

- Preserve account-free local mode and the current expense UI.
- Synced-mode writes require a network connection; do not build offline queues, conflict resolution, Realtime, teams, billing, or a custom backend.
- The browser may receive only `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`; never expose a secret or `service_role` key.
- Keep the static Next.js export and Cloudflare Pages deployment.
- Pin the Supabase client dependency exactly and commit the lockfile when the user later commits.
- Do not commit, push, deploy, or create external projects. The user owns Git, Supabase, SMTP, and Cloudflare actions.

## Review Focus

- Missing Supabase environment variables: local mode still builds and works; Sync reports that configuration is unavailable.
- Partial first import: local records remain intact unless every upsert succeeds; retry does not duplicate UUIDs.
- Cross-account access: User A cannot select, insert, update, or delete User B's rows.
- Failed synced write: the dialog stays open or the previous UI state is restored, with an accessible error message.
- Sign-out on a shared device: session and synced expense cache are cleared while unrelated local preferences remain.

---

## File Map

- The migration path printed by `npx supabase migration new create_expenses`: table, constraints, grants, and operation-specific RLS policies.
- `lib/supabase.ts`: lazily creates the browser client only when public environment variables exist.
- `lib/sync.ts`: database row mapping and expense CRUD/import functions.
- `lib/sync.test.ts`: pure mapping and validation regression checks.
- `components/auth-provider.tsx`: owns Supabase session state and exposes it through `useAuth()`.
- `components/expense-provider.tsx`: owns the single expense state shared by the header Sync control and pages.
- `components/sync-control.tsx`: magic-link, import, status, and sign-out UI.
- `lib/storage.ts`: retains local expense and preference helpers used by the shared expense provider.
- `app/layout.tsx`: installs the auth provider and displays the Sync control.
- `app/overview/page.tsx`, `app/transactions/page.tsx`: await writes and preserve forms/state on failure.
- `components/data-tools.tsx`, `components/backup-controls.tsx`, `components/csv-import.tsx`, `lib/backup.ts`: route import/restore through the active expense store.
- `.env.example`, `package.json`, `package-lock.json`, `README.md`: configuration, dependency, test command, and user-facing storage documentation.

### Task 1: Supabase schema and client dependency

**Files:**
- Create: the migration returned by `npx supabase migration new create_expenses`
- Modify: `package.json`
- Modify: `package-lock.json`
- Modify: `.env.example`

**Interfaces:**
- Produces: public table `expenses`; build variables `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`.

- [ ] **Step 1: Discover current tooling and install the client**

Run `npx supabase --help` before using the CLI. Install the current stable `@supabase/supabase-js` with `npm install --save-exact @supabase/supabase-js`; do not add `@supabase/ssr` because this remains a client-only static export.

- [ ] **Step 2: Generate the migration filename**

Run `npx supabase init` because this repository has no Supabase directory, then run `npx supabase migration new create_expenses`. Edit the returned file rather than inventing a migration timestamp.

- [ ] **Step 3: Define the table and constraints**

Create `public.expenses` with the columns from the spec. Enforce amount `1..9999999999`, date required, category trimmed length `1..40`, classification `personal|work`, merchant maximum `60`, note maximum `200`, and `user_id references auth.users(id) on delete cascade`. Keep imported UUIDs and timestamps; defaults may support new rows.

- [ ] **Step 4: Lock down grants and RLS**

Enable RLS, revoke all table privileges from `anon` and `authenticated`, then grant only `select, insert, update, delete` to `authenticated`. Add separate policies for each operation using `(select auth.uid()) = user_id`; update requires both `USING` and `WITH CHECK`.

- [ ] **Step 5: Add public environment placeholders**

Add empty `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` entries to `.env.example` with comments stating that the publishable key is browser-safe and secret/service-role keys must never use a `NEXT_PUBLIC_` name.

- [ ] **Step 6: Verify**

Run `npm run typecheck` and `npm run build`. Expected: both pass even when the two Supabase variables are absent.

### Task 2: Browser client, row mapping, and remote expense API

**Files:**
- Create: `lib/supabase.ts`
- Create: `lib/sync.ts`
- Create: `lib/sync.test.ts`
- Modify: `package.json`

**Interfaces:**
- Produces: `getSupabase(): SupabaseClient | null`.
- Produces: `toExpense(row: ExpenseRow): Expense`, `toInsert(expense: Expense, userId: string): ExpenseInsert`.
- Produces: `listRemoteExpenses()`, `insertRemoteExpense(expense, userId)`, `updateRemoteExpense(expense, userId)`, `deleteRemoteExpense(id)`, `upsertRemoteExpenses(expenses, userId)`, and `replaceRemoteExpenses(expenses, userId)`; all return promises and throw plain `Error` values on failure.

- [ ] **Step 1: Write failing pure mapping tests**

Test snake_case database rows mapping to the existing `Expense` shape, rupiah values remaining safe integers, empty optional text becoming empty strings, and outbound rows receiving the authenticated `user_id` rather than a caller-supplied row owner.

- [ ] **Step 2: Run the focused test**

Add `lib/sync.test.ts` to the existing `npm test` command and run `npm test`. Expected: the new mapping tests fail because the module does not exist.

- [ ] **Step 3: Implement the lazy client**

`getSupabase()` reads the two public variables, returns `null` when either is missing, and memoizes one `createClient()` instance in the browser. Do not create a client during static rendering with empty values.

- [ ] **Step 4: Implement mappings and CRUD**

Use the current `Expense` type as the UI contract. Every insert/upsert sets `user_id` from the authenticated session argument. `replaceRemoteExpenses` must upload the replacement first and delete obsolete existing rows only after upload succeeds.

- [ ] **Step 5: Run tests**

Run `npm test`. Expected: all existing tests and the new sync mapping tests pass.

### Task 3: Session provider and Sync control

**Files:**
- Create: `components/auth-provider.tsx`
- Create: `components/sync-control.tsx`
- Modify: `app/layout.tsx`

**Interfaces:**
- Produces: `useAuth(): { user: User | null; loading: boolean; configured: boolean; signIn(email: string): Promise<void>; signOut(): Promise<void> }`.
- Consumes: `getSupabase()` from Task 2.

- [ ] **Step 1: Implement session ownership**

Initialize with `auth.getSession()`, subscribe with `auth.onAuthStateChange()`, and unsubscribe on cleanup. `signIn` calls `signInWithOtp` with `emailRedirectTo` set from `window.location.origin + "/overview"`. `signOut` calls Supabase sign-out and clears only synced expense cache/state.

- [ ] **Step 2: Implement the minimal Sync UI**

Add one `Sync` control to the existing header. Signed out: open the existing accessible dialog, validate an email with native `<input type="email">`, send the link, and show `Check your email`. Signed in: show the email plus `Sign out`. Missing config: show a short setup-unavailable message without breaking local mode.

- [ ] **Step 3: Install the provider**

Wrap the header and page content in `AuthProvider` in `app/layout.tsx`, preserving the server layout, metadata, theme script, skip link, and current navigation.

- [ ] **Step 4: Verify**

Run `npm run typecheck` and `npm run build`. Expected: static export succeeds without environment variables and keyboard focus returns correctly when the Sync dialog closes.

### Task 4: One expense hook for local and synced modes

**Files:**
- Create: `components/expense-provider.tsx`
- Modify: `lib/storage.ts`
- Modify: `components/sync-control.tsx`
- Modify: `app/layout.tsx`
- Modify: `app/overview/page.tsx`
- Modify: `app/transactions/page.tsx`

**Interfaces:**
- Consumes: `useAuth()` and the remote functions from Tasks 2–3.
- Produces: `ExpenseProvider` and `useExpenses(): { expenses: Expense[]; loading: boolean; error: string; synced: boolean; localImportCount: number; importLocal(): Promise<void>; add(draft): Promise<Expense>; update(id, draft): Promise<void>; remove(id): Promise<void>; restore(row): Promise<void>; addMany(drafts): Promise<Expense[]>; replaceAll(rows): Promise<void>; refresh(): Promise<void> }`.

- [ ] **Step 1: Convert the existing local operations to the async interface**

Preserve current local behavior and preference updates. Promise-returning local methods should resolve immediately after the local write.

- [ ] **Step 2: Add signed-in remote behavior**

When a session exists, load remote rows and route every operation to Supabase. Update React state only after the remote request succeeds. Store a plain accessible error string on failure.

- [ ] **Step 3: Share one expense state across the application**

Install `ExpenseProvider` inside `AuthProvider` in `app/layout.tsx`, wrapping both the header and page content. Move page imports of `useExpenses` to the new provider so the header Sync control and active page always observe the same state.

- [ ] **Step 4: Implement first-sign-in import**

When a newly signed-in user has local expenses, expose their count through `localImportCount`. `SyncControl` shows the exact count and calls `importLocal()`. Upsert by UUID, clear `montara.expenses.v1` only after the full upsert succeeds, then refresh the shared state from Supabase. A retry must be safe.

- [ ] **Step 5: Handle sign-out**

Discard signed-in expense state and remove any synced cache. Start signed-out mode with an empty local expense list; keep theme and benign preferences.

- [ ] **Step 6: Verify failure cases**

Manually reject a request or disable the network. Expected: existing rows remain visible, local import data is not cleared, and the user sees a retryable error.

### Task 5: Await writes throughout the existing UI

**Files:**
- Modify: `app/overview/page.tsx`
- Modify: `app/transactions/page.tsx`
- Modify: `components/data-tools.tsx`
- Modify: `components/backup-controls.tsx`
- Modify: `components/csv-import.tsx`
- Modify: `lib/backup.ts`

**Interfaces:**
- Consumes: the async `useExpenses()` methods from Task 4.
- Produces: backup and import controls that report success only after active-store persistence succeeds.

- [ ] **Step 1: Await entry mutations**

Make save, delete, undo, CSV import, and JSON restore handlers async. Close forms, move focus, show undo, and display success only after the promise resolves. On rejection, preserve the dialog or prior state and display the hook error.

- [ ] **Step 2: Route JSON backup through current rows**

Change backup creation/download to accept the active `Expense[]` rather than always reading `localStorage`. Route restore through `replaceAll(payload.expenses)` while keeping preferences local.

- [ ] **Step 3: Await CSV import**

Change the import callback to return `Promise<void>` and show `Imported ...` only after it resolves.

- [ ] **Step 4: Update storage copy**

Use neutral copy such as `Stored on this device` while signed out and `Synced across your devices` while signed in. Remove claims that signed-in records exist only in the current browser.

- [ ] **Step 5: Verify existing flows**

Check add, edit, delete, undo, CSV import, JSON restore, CSV export, filtering, period comparison, and profile preferences in both local and synced modes.

### Task 6: Security verification and documentation

**Files:**
- Modify: `README.md`
- Modify: `docs/ARCHITECTURE.md`
- Modify: `docs/DATA-MODEL.md`

**Interfaces:**
- Consumes: all prior tasks.

- [ ] **Step 1: Update documentation**

Document optional sync, the two public environment variables, local-only behavior, synced-mode internet requirement, first import, sign-out behavior, custom SMTP requirement for public users, and the exact Cloudflare redirect URL setup. Replace the superseded Better Auth/Prisma Stage B direction for this feature.

- [ ] **Step 2: Run automated checks**

Run `npm run typecheck`, `npm test`, and `npm run build`. Expected: all pass; static routes remain `/`, `/overview`, `/transactions`, and `/_not-found`.

- [ ] **Step 3: Verify RLS with two accounts**

After the user applies the migration and configures environment variables, create two test users. Insert an expense as User A; confirm User B cannot select, update, or delete it and cannot insert a row with User A's `user_id`. Confirm unauthenticated requests receive no table access.

- [ ] **Step 4: Verify cross-device behavior**

Import local expenses with User A in one browser, sign into User A in a second browser, and confirm identical history. Add, edit, and delete on one device and refresh the other. Sign out and confirm synced expenses disappear from that device.

- [ ] **Step 5: Stop**

Report changed files, commands run, pass/fail results, and the exact Supabase and Cloudflare dashboard steps still required from the user. Do not add Realtime, offline queues, custom SMTP code, billing, teams, or deployment automation.
