create table if not exists public.collectors (
  id uuid primary key default gen_random_uuid(),
  display_name text not null unique,
  color text not null default '#ef4444',
  created_at timestamptz not null default now()
);

create table if not exists public.collection_entries (
  id uuid primary key default gen_random_uuid(),
  collector_id uuid not null references public.collectors(id) on delete cascade,
  card_key text not null,
  set_code text not null,
  card_number integer not null,
  owned boolean not null default false,
  acquisition_source text check (acquisition_source in ('pack', 'wonder_pick', 'trade', 'unknown')),
  note text,
  obtained_at date,
  updated_at timestamptz not null default now(),
  unique (collector_id, card_key)
);

create table if not exists public.app_accounts (
  id uuid primary key default gen_random_uuid(),
  pseudo text not null unique,
  collector_id uuid not null unique references public.collectors(id) on delete cascade,
  password_hash text not null,
  created_at timestamptz not null default now()
);

create table if not exists public.wonder_misses (
  id uuid primary key default gen_random_uuid(),
  collector_id uuid not null references public.collectors(id) on delete cascade,
  card_key text not null,
  set_code text not null,
  card_number integer not null,
  card_name text not null,
  missed_on date not null default current_date,
  note text,
  created_at timestamptz not null default now()
);

create index if not exists collection_entries_collector_idx
  on public.collection_entries (collector_id, set_code);

create index if not exists wonder_misses_collector_idx
  on public.wonder_misses (collector_id, missed_on desc);

insert into public.collectors (display_name, color)
values ('Miguel', '#ef4444'), ('Elle', '#0ea5e9')
on conflict (display_name) do nothing;
