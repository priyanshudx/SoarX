create extension if not exists pgcrypto;

create table if not exists public.audit_logs (
  id uuid primary key default gen_random_uuid(),
  timestamp timestamptz not null default now(),
  user_email text not null,
  action text not null,
  resource text not null,
  resource_type text not null check (resource_type in ('user', 'alert', 'policy', 'config', 'report', 'system')),
  status text not null check (status in ('success', 'failure', 'warning')),
  ip_address text not null,
  details text not null,
  created_at timestamptz not null default now()
);

alter table public.audit_logs
  add column if not exists timestamp timestamptz default now(),
  add column if not exists user_email text,
  add column if not exists action text,
  add column if not exists resource text,
  add column if not exists resource_type text,
  add column if not exists status text,
  add column if not exists ip_address text,
  add column if not exists details text,
  add column if not exists created_at timestamptz default now();

update public.audit_logs
set timestamp = coalesce(timestamp, now()),
    created_at = coalesce(created_at, now())
where timestamp is null or created_at is null;

create index if not exists idx_audit_logs_timestamp_desc on public.audit_logs (timestamp desc);
create index if not exists idx_audit_logs_user_email on public.audit_logs (user_email);
create index if not exists idx_audit_logs_resource_type on public.audit_logs (resource_type);
create index if not exists idx_audit_logs_status on public.audit_logs (status);

alter table public.audit_logs enable row level security;

drop policy if exists "audit_logs_select_authenticated" on public.audit_logs;
create policy "audit_logs_select_authenticated"
on public.audit_logs
for select
to authenticated
using (true);
