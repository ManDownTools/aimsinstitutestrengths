-- Team Builder: teams a company admin composes for a mission, evaluated by the
-- deterministic scoring engine and a cached Claude narrative.
-- A profile can appear on multiple teams (surfaced later as overallocation).
-- Team members have no access to any of these tables in this version.

create table if not exists public.teams (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  name text not null,
  mission_type text not null check (mission_type in ('launch','stabilize','turnaround','growth','general')),
  mission_notes text,
  status text not null default 'draft' check (status in ('draft','active','archived')),
  created_by uuid not null references public.profiles(id) on delete restrict,
  created_at timestamptz not null default now()
);

create index if not exists teams_company_idx on public.teams(company_id);
create index if not exists teams_status_idx on public.teams(status);

create table if not exists public.team_members (
  id uuid primary key default gen_random_uuid(),
  team_id uuid not null references public.teams(id) on delete cascade,
  profile_id uuid not null references public.profiles(id) on delete cascade,
  pinned boolean not null default false,
  added_at timestamptz not null default now(),
  unique (team_id, profile_id)
);

create index if not exists team_members_team_idx on public.team_members(team_id);
create index if not exists team_members_profile_idx on public.team_members(profile_id);

create table if not exists public.team_evaluations (
  id uuid primary key default gen_random_uuid(),
  team_id uuid not null references public.teams(id) on delete cascade,
  roster_hash text not null,
  signals jsonb not null,
  narrative text,
  model text,
  generated_at timestamptz not null default now()
);

create index if not exists team_evaluations_team_idx on public.team_evaluations(team_id);
create index if not exists team_evaluations_lookup_idx on public.team_evaluations(team_id, roster_hash);

alter table public.teams enable row level security;
alter table public.team_members enable row level security;
alter table public.team_evaluations enable row level security;

-- teams: system_admin everywhere; company_admin scoped to their company.
-- team_member has no policy, so no access.

create policy teams_select on public.teams
  for select using (
    public.current_user_role() = 'system_admin'
    or (public.current_user_role() = 'company_admin' and company_id = public.current_user_company())
  );

create policy teams_insert on public.teams
  for insert with check (
    public.current_user_role() = 'system_admin'
    or (public.current_user_role() = 'company_admin' and company_id = public.current_user_company())
  );

create policy teams_update on public.teams
  for update using (
    public.current_user_role() = 'system_admin'
    or (public.current_user_role() = 'company_admin' and company_id = public.current_user_company())
  ) with check (
    public.current_user_role() = 'system_admin'
    or (public.current_user_role() = 'company_admin' and company_id = public.current_user_company())
  );

create policy teams_delete on public.teams
  for delete using (
    public.current_user_role() = 'system_admin'
    or (public.current_user_role() = 'company_admin' and company_id = public.current_user_company())
  );

-- team_members: gated through the parent team's company scope.

create policy team_members_select on public.team_members
  for select using (
    exists (
      select 1 from public.teams t
      where t.id = team_members.team_id
      and (
        public.current_user_role() = 'system_admin'
        or (public.current_user_role() = 'company_admin' and t.company_id = public.current_user_company())
      )
    )
  );

create policy team_members_insert on public.team_members
  for insert with check (
    exists (
      select 1 from public.teams t
      where t.id = team_members.team_id
      and (
        public.current_user_role() = 'system_admin'
        or (public.current_user_role() = 'company_admin' and t.company_id = public.current_user_company())
      )
    )
  );

create policy team_members_update on public.team_members
  for update using (
    exists (
      select 1 from public.teams t
      where t.id = team_members.team_id
      and (
        public.current_user_role() = 'system_admin'
        or (public.current_user_role() = 'company_admin' and t.company_id = public.current_user_company())
      )
    )
  ) with check (
    exists (
      select 1 from public.teams t
      where t.id = team_members.team_id
      and (
        public.current_user_role() = 'system_admin'
        or (public.current_user_role() = 'company_admin' and t.company_id = public.current_user_company())
      )
    )
  );

create policy team_members_delete on public.team_members
  for delete using (
    exists (
      select 1 from public.teams t
      where t.id = team_members.team_id
      and (
        public.current_user_role() = 'system_admin'
        or (public.current_user_role() = 'company_admin' and t.company_id = public.current_user_company())
      )
    )
  );

-- team_evaluations: read-scoped through parent team; writes happen server-side
-- through the service role (same pattern as results). No client insert policy.

create policy team_evaluations_select on public.team_evaluations
  for select using (
    exists (
      select 1 from public.teams t
      where t.id = team_evaluations.team_id
      and (
        public.current_user_role() = 'system_admin'
        or (public.current_user_role() = 'company_admin' and t.company_id = public.current_user_company())
      )
    )
  );
