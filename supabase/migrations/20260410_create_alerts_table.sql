create extension if not exists pgcrypto;

create table if not exists public.alerts (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text not null,
  severity text not null check (severity in ('critical', 'high', 'medium', 'low')),
  risk_score numeric not null check (risk_score >= 0 and risk_score <= 100),
  source text not null,
  target_ip text,
  status text check (status in ('open', 'investigating', 'resolved')),
  timestamp timestamptz not null default now(),
  created_at timestamptz not null default now()
);

alter table public.alerts
  add column if not exists title text,
  add column if not exists description text,
  add column if not exists severity text,
  add column if not exists risk_score numeric,
  add column if not exists source text,
  add column if not exists target_ip text,
  add column if not exists status text,
  add column if not exists timestamp timestamptz default now(),
  add column if not exists created_at timestamptz default now();

update public.alerts
set timestamp = coalesce(timestamp, now()),
    created_at = coalesce(created_at, now())
where timestamp is null or created_at is null;

create index if not exists idx_alerts_timestamp_desc on public.alerts (timestamp desc);
create index if not exists idx_alerts_severity on public.alerts (severity);
create index if not exists idx_alerts_status on public.alerts (status);

alter table public.alerts enable row level security;

drop policy if exists "alerts_select_authenticated" on public.alerts;
create policy "alerts_select_authenticated"
on public.alerts
for select
to authenticated
using (true);
