-- Team insights cache. One row per company; regenerated only when a new
-- assessment finishes (tracked via source_max_completed_at).

create table if not exists public.team_insights (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null unique references public.companies(id) on delete cascade,
  narrative text not null,
  stats jsonb not null,
  model text not null,
  source_max_completed_at timestamptz,
  generated_at timestamptz not null default now()
);

create index if not exists team_insights_company_idx on public.team_insights(company_id);

alter table public.team_insights enable row level security;

create policy team_insights_select on public.team_insights
  for select using (
    public.current_user_role() = 'system_admin'
    or (public.current_user_role() = 'company_admin' and company_id = public.current_user_company())
  );
