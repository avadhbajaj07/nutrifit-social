create table if not exists public.nutrifitness_drafts (
  id text primary key,
  status text not null default 'PENDING_REVIEW',
  media_public_id text not null unique,
  data jsonb not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists nutrifitness_drafts_status_idx
  on public.nutrifitness_drafts (status, created_at);

create table if not exists public.nutrifitness_post_history (
  id text primary key,
  data jsonb not null,
  created_at timestamptz not null default now()
);

create table if not exists public.nutrifitness_logs (
  id text primary key,
  level text not null,
  message text not null,
  data jsonb not null,
  created_at timestamptz not null default now()
);

alter table public.nutrifitness_drafts enable row level security;
alter table public.nutrifitness_post_history enable row level security;
alter table public.nutrifitness_logs enable row level security;

grant all on table public.nutrifitness_drafts to service_role;
grant all on table public.nutrifitness_post_history to service_role;
grant all on table public.nutrifitness_logs to service_role;
