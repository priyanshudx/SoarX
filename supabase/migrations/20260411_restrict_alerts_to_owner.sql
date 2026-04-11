alter table public.alerts enable row level security;

drop policy if exists "alerts_select_authenticated" on public.alerts;
drop policy if exists "alerts_select_own" on public.alerts;

create policy "alerts_select_own"
on public.alerts
for select
to authenticated
using (
  lower(coalesce(source, '')) = lower(coalesce((auth.jwt() ->> 'email'), ''))
);
