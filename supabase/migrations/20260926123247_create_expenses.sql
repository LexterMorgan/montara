-- Montara cross-device sync: expenses table with per-user RLS.
-- Import preserves existing UUIDs and timestamps; defaults support new rows.

create extension if not exists "pgcrypto";

create table public.expenses (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  amount_idr bigint not null check (amount_idr >= 1 and amount_idr <= 9999999999),
  date date not null,
  category text not null check (char_length(btrim(category)) >= 1 and char_length(btrim(category)) <= 40),
  classification text not null check (classification in ('personal', 'work')),
  merchant text null check (merchant is null or char_length(merchant) <= 60),
  note text null check (note is null or char_length(note) <= 200),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.expenses enable row level security;

revoke all on table public.expenses from anon, authenticated;
grant select, insert, update, delete on table public.expenses to authenticated;

create policy "expenses_select_own"
  on public.expenses for select to authenticated
  using ((select auth.uid()) = user_id);

create policy "expenses_insert_own"
  on public.expenses for insert to authenticated
  with check ((select auth.uid()) = user_id);

create policy "expenses_update_own"
  on public.expenses for update to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

create policy "expenses_delete_own"
  on public.expenses for delete to authenticated
  using ((select auth.uid()) = user_id);
