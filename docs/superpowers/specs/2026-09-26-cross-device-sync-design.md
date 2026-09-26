# Montara Cross-Device Sync Design

## Goal

Add optional cross-device expense history without removing Montara's existing account-free local mode. A user signs in by email, imports existing local expenses once, and then sees the same history on every signed-in device.

## Scope

- Supabase Auth using email magic links.
- One Supabase `expenses` table protected by Row Level Security.
- A small Sync account control in the existing header or data controls.
- One-time import of existing `localStorage` expenses after the first sign-in.
- Signed-in create, edit, delete, undo, CSV import, and JSON restore write to Supabase.
- Sign-out clears synced expense data from the device.
- Existing signed-out local mode remains unchanged.

## Out of Scope

- Offline edits or a background conflict-resolution engine in synced mode.
- Realtime subscriptions.
- Team, household, or shared accounts.
- Bank connections, payments, billing, or administrative dashboards.
- Syncing profile name, theme, or other preferences.
- A custom backend server.

## User Flow

1. A signed-out user continues using Montara locally.
2. The user selects **Sync across devices**, enters an email address, and requests a magic link.
3. The link returns to Montara and establishes a Supabase session.
4. If local expenses exist, Montara shows the number of records and asks to import them.
5. Import upserts records by their existing UUIDs. Local data is cleared only after Supabase confirms the complete import.
6. Signed-in pages load expenses belonging to the authenticated user.
7. Another device signed into the same email loads the same expenses.
8. Signing out clears synced records from browser storage and returns Montara to an empty local workspace.

## Data Model

Create only one new application table for this version:

```sql
expenses
- id uuid primary key
- user_id uuid not null references auth.users(id) on delete cascade
- amount_idr bigint not null
- date date not null
- category text not null
- classification text not null
- merchant text null
- note text null
- created_at timestamptz not null
- updated_at timestamptz not null
```

Retain the current expense UUID and timestamps during import. Add the existing amount, classification, category, merchant, and note validation as database constraints where practical.

## Authorization and Security

- Enable Row Level Security on `expenses`.
- Revoke table access from `anon`.
- Grant only `select`, `insert`, `update`, and `delete` to `authenticated`.
- Create separate policies for each operation.
- Every policy checks `(select auth.uid()) = user_id`.
- Update uses both `USING` and `WITH CHECK`.
- The browser receives only the Supabase URL and publishable key.
- Never expose a secret key or `service_role` key.
- Allow only the local development URL and the production Cloudflare Pages URL as auth redirects.
- Do not log emails, merchant names, notes, amounts, or expense payloads.

## Application Structure

- Add a single browser Supabase client module.
- Add a small auth/session hook or provider at the existing application layout boundary.
- Keep the current expense UI and calculations unchanged.
- Adapt `useExpenses` so it uses the existing local implementation while signed out and Supabase CRUD while signed in.
- Keep calculation functions pure; fetched rows must map to the current `Expense` shape.
- Show clear loading, signed-out, email-sent, syncing, and error states.

## Sync Rules

- Supabase is the source of truth while signed in.
- Synced-mode writes require a network connection and confirm success before the UI treats them as saved.
- Failed writes keep the form open or restore the previous UI state with a plain error message.
- First import is idempotent through expense UUID upserts.
- Never clear local expenses until all imported rows are confirmed.
- No automatic merging between two simultaneously edited devices in this version. The latest confirmed update wins through `updated_at`.

## Email Delivery

Supabase's default email service is suitable only for initial testing with project-team email addresses. Public use requires a custom SMTP provider. The app should use the default unbranded magic-link template initially and avoid adding an email service dependency to the codebase.

## Environment and Deployment

Add these public build variables locally and in Cloudflare Pages:

```text
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
```

The Next.js application remains a static export deployed to Cloudflare Pages. Supabase supplies Auth and the Data API directly to the browser.

## Acceptance Checks

- Local mode still works without signing in.
- A magic link creates and restores a session on the production domain.
- Existing local expenses import exactly once without duplicates.
- A second browser signed into the same email sees the imported history.
- Add, edit, delete, undo, CSV import, and JSON restore persist across devices.
- User A cannot select, insert, update, or delete User B's rows.
- Unauthenticated requests cannot access the expenses table.
- Sign-out removes synced expense data from the current device.
- Build and existing calculation, CSV, and backup tests continue to pass.

## Release Order

1. Create the Supabase project and configure production and local redirect URLs.
2. Apply the table, grants, constraints, and RLS policies.
3. Add client auth and session handling.
4. Add one-time local import.
5. Route signed-in expense operations through Supabase.
6. Verify isolation with two test users and verify cross-device behavior.
7. Add custom SMTP before inviting public users.
