-- Electropico Split Sheet V1
-- Run this entire file in the Supabase SQL editor.

create extension if not exists pgcrypto;

create table if not exists public.agreements (
  id uuid primary key default gen_random_uuid(),
  song_title text not null,
  release_name text,
  artist_name text not null,
  effective_date date not null,
  governing_state text not null,
  status text not null default 'draft' check (status in ('draft', 'pending', 'completed')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  invitations_sent_at timestamptz,
  completed_at timestamptz,
  final_pdf_path text,
  completion_email_sent_at timestamptz,
  completion_email_error text
);

create table if not exists public.songwriters (
  id uuid primary key default gen_random_uuid(),
  agreement_id uuid not null references public.agreements(id) on delete cascade,
  position integer not null check (position between 1 and 4),
  legal_name text not null,
  professional_name text,
  email text not null,
  address text not null,
  ipi_cae text,
  pro text,
  publisher text,
  contribution text not null,
  composition_percent numeric(6,3) not null check (composition_percent >= 0 and composition_percent <= 100),
  signing_token text not null unique,
  signed_name text,
  signature_data text,
  signed_at timestamptz,
  created_at timestamptz not null default now(),
  unique (agreement_id, position)
);

create table if not exists public.master_owners (
  id uuid primary key default gen_random_uuid(),
  agreement_id uuid not null references public.agreements(id) on delete cascade,
  position integer not null check (position between 1 and 4),
  owner_name text not null,
  ownership_percent numeric(6,3) not null check (ownership_percent >= 0 and ownership_percent <= 100),
  isrc text,
  created_at timestamptz not null default now(),
  unique (agreement_id, position)
);

create index if not exists agreements_status_idx on public.agreements(status);
create index if not exists songwriters_agreement_idx on public.songwriters(agreement_id);
create index if not exists master_owners_agreement_idx on public.master_owners(agreement_id);
create index if not exists songwriters_token_idx on public.songwriters(signing_token);

create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists agreements_updated_at on public.agreements;
create trigger agreements_updated_at
before update on public.agreements
for each row execute function public.set_updated_at();

alter table public.agreements enable row level security;
alter table public.songwriters enable row level security;
alter table public.master_owners enable row level security;

-- The app uses the service-role key on the server, so no public table policies are required.
-- Never expose the service-role key in browser code.

insert into storage.buckets (id, name, public)
values ('completed-agreements', 'completed-agreements', false)
on conflict (id) do nothing;

create or replace function public.save_agreement(p_agreement_id uuid, p_data jsonb)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_id uuid;
  v_writer jsonb;
  v_owner jsonb;
  v_position integer;
  v_composition_total numeric;
  v_master_total numeric;
  v_status text;
begin
  if jsonb_array_length(p_data->'songwriters') < 2 or jsonb_array_length(p_data->'songwriters') > 4 then
    raise exception 'Agreements require between 2 and 4 songwriters.';
  end if;
  if jsonb_array_length(p_data->'masterOwners') < 1 or jsonb_array_length(p_data->'masterOwners') > 4 then
    raise exception 'Agreements require between 1 and 4 master owners.';
  end if;

  select coalesce(sum((item->>'compositionPercent')::numeric), 0)
    into v_composition_total
    from jsonb_array_elements(p_data->'songwriters') item;
  select coalesce(sum((item->>'ownershipPercent')::numeric), 0)
    into v_master_total
    from jsonb_array_elements(p_data->'masterOwners') item;

  if abs(v_composition_total - 100) > 0.001 then
    raise exception 'Composition splits must total 100%%.';
  end if;
  if abs(v_master_total - 100) > 0.001 then
    raise exception 'Master ownership must total 100%%.';
  end if;

  if p_agreement_id is null then
    insert into public.agreements (song_title, release_name, artist_name, effective_date, governing_state)
    values (
      p_data->>'songTitle', nullif(p_data->>'releaseName', ''), p_data->>'artistName',
      (p_data->>'effectiveDate')::date, p_data->>'governingState'
    ) returning id into v_id;
  else
    select status into v_status from public.agreements where id = p_agreement_id for update;
    if v_status is null then raise exception 'Agreement not found.'; end if;
    if v_status = 'completed' then raise exception 'Completed agreements are locked.'; end if;

    v_id := p_agreement_id;
    update public.agreements
      set song_title = p_data->>'songTitle',
          release_name = nullif(p_data->>'releaseName', ''),
          artist_name = p_data->>'artistName',
          effective_date = (p_data->>'effectiveDate')::date,
          governing_state = p_data->>'governingState',
          status = 'draft',
          invitations_sent_at = null,
          completed_at = null,
          final_pdf_path = null,
          completion_email_sent_at = null,
          completion_email_error = null
      where id = v_id;
    delete from public.songwriters where agreement_id = v_id;
    delete from public.master_owners where agreement_id = v_id;
  end if;

  v_position := 0;
  for v_writer in select * from jsonb_array_elements(p_data->'songwriters') loop
    v_position := v_position + 1;
    insert into public.songwriters (
      agreement_id, position, legal_name, professional_name, email, address,
      ipi_cae, pro, publisher, contribution, composition_percent, signing_token
    ) values (
      v_id, v_position, v_writer->>'legalName', nullif(v_writer->>'professionalName', ''),
      lower(v_writer->>'email'), v_writer->>'address', nullif(v_writer->>'ipiCae', ''),
      nullif(v_writer->>'pro', ''), nullif(v_writer->>'publisher', ''),
      v_writer->>'contribution', (v_writer->>'compositionPercent')::numeric,
      encode(gen_random_bytes(32), 'hex')
    );
  end loop;

  v_position := 0;
  for v_owner in select * from jsonb_array_elements(p_data->'masterOwners') loop
    v_position := v_position + 1;
    insert into public.master_owners (agreement_id, position, owner_name, ownership_percent, isrc)
    values (
      v_id, v_position, v_owner->>'ownerName',
      (v_owner->>'ownershipPercent')::numeric, nullif(v_owner->>'isrc', '')
    );
  end loop;

  return v_id;
end;
$$;

revoke all on function public.save_agreement(uuid, jsonb) from public;
