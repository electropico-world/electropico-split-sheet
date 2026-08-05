-- Adds signature support for sound recording owners / copyright claimants.
-- Run this once in the Supabase SQL Editor before using the updated app.

alter table public.master_owners
  add column if not exists email text,
  add column if not exists address text,
  add column if not exists linked_songwriter_position integer,
  add column if not exists signing_token text,
  add column if not exists signed_name text,
  add column if not exists signature_data text,
  add column if not exists signed_at timestamptz;

alter table public.master_owners
  drop constraint if exists master_owners_linked_songwriter_position_check;

alter table public.master_owners
  add constraint master_owners_linked_songwriter_position_check
  check (linked_songwriter_position is null or linked_songwriter_position between 1 and 4);

create unique index if not exists master_owners_signing_token_unique
  on public.master_owners(signing_token)
  where signing_token is not null;

create index if not exists master_owners_token_idx
  on public.master_owners(signing_token)
  where signing_token is not null;
