-- AiMS Strengths Assessment — schema
-- Run in a fresh Supabase project. Requires pgcrypto (default in Supabase).

create extension if not exists pgcrypto;

create table if not exists public.companies (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  created_at timestamptz default now()
);

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  company_id uuid references public.companies(id) on delete set null,
  email text not null,
  first_name text not null,
  last_name text not null,
  position text,
  reports_to uuid references public.profiles(id) on delete set null,
  position_start_date date,
  hire_date date,
  role text not null check (role in ('system_admin','company_admin','team_member')),
  invite_status text not null default 'invited' check (invite_status in ('invited','active')),
  created_at timestamptz default now()
);

create index if not exists profiles_company_id_idx on public.profiles(company_id);
create index if not exists profiles_role_idx on public.profiles(role);

create table if not exists public.items (
  id text primary key,
  dimension text not null check (dimension in ('thinking','influence','execution','relating')),
  sub_strength text not null,
  item_type text not null check (item_type in ('competence','energy','orientation')),
  text text not null,
  text_b text,
  direct_side text check (direct_side in ('A','B')),
  legacy_tags text[],
  sort_order int not null
);

create index if not exists items_sort_idx on public.items(sort_order);

create table if not exists public.assessments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  company_id uuid not null references public.companies(id) on delete cascade,
  version int not null default 1,
  status text not null default 'in_progress' check (status in ('in_progress','completed')),
  started_at timestamptz default now(),
  completed_at timestamptz,
  unique (user_id, version)
);

create index if not exists assessments_user_idx on public.assessments(user_id);
create index if not exists assessments_company_idx on public.assessments(company_id);

create table if not exists public.responses (
  id uuid primary key default gen_random_uuid(),
  assessment_id uuid not null references public.assessments(id) on delete cascade,
  item_id text not null references public.items(id),
  value int not null,
  answered_at timestamptz default now(),
  unique (assessment_id, item_id)
);

create index if not exists responses_assessment_idx on public.responses(assessment_id);

create table if not exists public.narrative_messages (
  id uuid primary key default gen_random_uuid(),
  assessment_id uuid not null references public.assessments(id) on delete cascade,
  role text not null check (role in ('assistant','user')),
  content text not null,
  created_at timestamptz default now()
);

create index if not exists narrative_assessment_idx on public.narrative_messages(assessment_id);

create table if not exists public.results (
  id uuid primary key default gen_random_uuid(),
  assessment_id uuid not null unique references public.assessments(id) on delete cascade,
  profile jsonb not null,
  summary text not null,
  model text not null,
  generated_at timestamptz default now()
);

create table if not exists public.coaching_conversations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  title text,
  created_at timestamptz default now()
);

create index if not exists coaching_conversations_user_idx on public.coaching_conversations(user_id);

create table if not exists public.coaching_messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.coaching_conversations(id) on delete cascade,
  role text not null check (role in ('assistant','user')),
  content text not null,
  created_at timestamptz default now()
);

create index if not exists coaching_messages_conversation_idx on public.coaching_messages(conversation_id);

-- helper functions used by RLS
create or replace function public.current_user_role()
returns text
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select role from public.profiles where id = auth.uid();
$$;

create or replace function public.current_user_company()
returns uuid
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select company_id from public.profiles where id = auth.uid();
$$;

grant execute on function public.current_user_role() to authenticated;
grant execute on function public.current_user_company() to authenticated;
