alter table public.audit_logs enable row level security;

drop policy if exists "audit_logs_select_authenticated" on public.audit_logs;
drop policy if exists "audit_logs_select_own" on public.audit_logs;

create policy "audit_logs_select_own"
on public.audit_logs
for select
to authenticated
using (
  lower(coalesce(user_email, '')) = lower(coalesce((auth.jwt() ->> 'email'), ''))
);
