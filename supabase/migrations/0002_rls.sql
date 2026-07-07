-- Row Level Security policies.
-- Reads and per-user writes go through RLS. Mutations that cross privilege
-- boundaries (invitations, company creation) run server-side with the service
-- role key and bypass RLS.

alter table public.companies enable row level security;
alter table public.profiles enable row level security;
alter table public.items enable row level security;
alter table public.assessments enable row level security;
alter table public.responses enable row level security;
alter table public.narrative_messages enable row level security;
alter table public.results enable row level security;
alter table public.coaching_conversations enable row level security;
alter table public.coaching_messages enable row level security;

-- companies
create policy companies_select_own on public.companies
  for select using (
    public.current_user_role() = 'system_admin'
    or id = public.current_user_company()
  );

-- profiles
create policy profiles_select_self on public.profiles
  for select using (
    id = auth.uid()
    or public.current_user_role() = 'system_admin'
    or (public.current_user_role() = 'company_admin' and company_id = public.current_user_company())
  );

create policy profiles_update_self on public.profiles
  for update using (id = auth.uid())
  with check (id = auth.uid());

-- items: readable by all authenticated
create policy items_select_all on public.items
  for select using (auth.role() = 'authenticated');

-- assessments
create policy assessments_select on public.assessments
  for select using (
    user_id = auth.uid()
    or public.current_user_role() = 'system_admin'
    or (public.current_user_role() = 'company_admin' and company_id = public.current_user_company())
  );

create policy assessments_insert_own on public.assessments
  for insert with check (user_id = auth.uid());

create policy assessments_update_own on public.assessments
  for update using (user_id = auth.uid())
  with check (user_id = auth.uid());

-- responses
create policy responses_select on public.responses
  for select using (
    exists (
      select 1 from public.assessments a
      where a.id = responses.assessment_id
      and (
        a.user_id = auth.uid()
        or public.current_user_role() = 'system_admin'
        or (public.current_user_role() = 'company_admin' and a.company_id = public.current_user_company())
      )
    )
  );

create policy responses_insert_own on public.responses
  for insert with check (
    exists (
      select 1 from public.assessments a
      where a.id = responses.assessment_id and a.user_id = auth.uid()
    )
  );

create policy responses_update_own on public.responses
  for update using (
    exists (
      select 1 from public.assessments a
      where a.id = responses.assessment_id and a.user_id = auth.uid()
    )
  );

-- narrative_messages
create policy narrative_select on public.narrative_messages
  for select using (
    exists (
      select 1 from public.assessments a
      where a.id = narrative_messages.assessment_id
      and (
        a.user_id = auth.uid()
        or public.current_user_role() = 'system_admin'
        or (public.current_user_role() = 'company_admin' and a.company_id = public.current_user_company())
      )
    )
  );

create policy narrative_insert_own on public.narrative_messages
  for insert with check (
    exists (
      select 1 from public.assessments a
      where a.id = narrative_messages.assessment_id and a.user_id = auth.uid()
    )
  );

-- results (writes happen server-side with service role)
create policy results_select on public.results
  for select using (
    exists (
      select 1 from public.assessments a
      where a.id = results.assessment_id
      and (
        a.user_id = auth.uid()
        or public.current_user_role() = 'system_admin'
        or (public.current_user_role() = 'company_admin' and a.company_id = public.current_user_company())
      )
    )
  );

-- coaching_conversations (owner only)
create policy coaching_conv_select_own on public.coaching_conversations
  for select using (user_id = auth.uid());
create policy coaching_conv_insert_own on public.coaching_conversations
  for insert with check (user_id = auth.uid());

-- coaching_messages (owner only)
create policy coaching_msg_select_own on public.coaching_messages
  for select using (
    exists (
      select 1 from public.coaching_conversations c
      where c.id = coaching_messages.conversation_id and c.user_id = auth.uid()
    )
  );
create policy coaching_msg_insert_own on public.coaching_messages
  for insert with check (
    exists (
      select 1 from public.coaching_conversations c
      where c.id = coaching_messages.conversation_id and c.user_id = auth.uid()
    )
  );
