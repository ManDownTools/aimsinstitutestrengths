-- =============================================================================
-- Northwind extras: 10 additional profiles + completed assessments.
--
-- Run AFTER supabase/seed/demo_data.sql. Uses the same password across the
-- demo data ('aims-demo-2026') so any of these accounts can sign in.
--
-- Idempotent: safe to re-run. Delete the "Northwind Logistics" company from
-- /system to wipe all demo data (cascades).
-- =============================================================================

do $$
declare
  co_id       uuid;
  aiden_id    uuid;
  nora_id     uuid;
  mateo_id    uuid;
  priya_id    uuid;
  password_hash text;
  kai_id      uuid;
  elena_id    uuid;
  marcus_id   uuid;
  sofia_id    uuid;
  taylor_id   uuid;
  ravi_id     uuid;
  isabella_id uuid;
  devon_id    uuid;
  anika_id    uuid;
  jordan_id   uuid;
  kai_asmt    uuid;
  elena_asmt  uuid;
  marcus_asmt uuid;
  sofia_asmt  uuid;
  taylor_asmt uuid;
  ravi_asmt   uuid;
  isabella_asmt uuid;
  devon_asmt  uuid;
  anika_asmt  uuid;
  jordan_asmt uuid;
begin
  password_hash := crypt('aims-demo-2026', gen_salt('bf'));

  select id into co_id from public.companies where name = 'Northwind Logistics';
  if co_id is null then
    raise notice 'Northwind Logistics not found. Run demo_data.sql first.';
    return;
  end if;

  select id into aiden_id from public.profiles where email = 'aiden@northwind.demo';
  select id into nora_id  from public.profiles where email = 'nora@northwind.demo';
  select id into mateo_id from public.profiles where email = 'mateo@northwind.demo';
  select id into priya_id from public.profiles where email = 'priya@northwind.demo';

  ------------------------------------------------------------------
  -- 1. Look up existing auth users
  ------------------------------------------------------------------
  select id into kai_id from auth.users where email = 'kai@northwind.demo';
  select id into elena_id from auth.users where email = 'elena@northwind.demo';
  select id into marcus_id from auth.users where email = 'marcus@northwind.demo';
  select id into sofia_id from auth.users where email = 'sofia@northwind.demo';
  select id into taylor_id from auth.users where email = 'taylor@northwind.demo';
  select id into ravi_id from auth.users where email = 'ravi@northwind.demo';
  select id into isabella_id from auth.users where email = 'isabella@northwind.demo';
  select id into devon_id from auth.users where email = 'devon@northwind.demo';
  select id into anika_id from auth.users where email = 'anika@northwind.demo';
  select id into jordan_id from auth.users where email = 'jordan@northwind.demo';

  ------------------------------------------------------------------
  -- 2. Create auth users where missing
  ------------------------------------------------------------------
  if kai_id is null then
    kai_id := gen_random_uuid();
    insert into auth.users (
      instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
      raw_app_meta_data, raw_user_meta_data, created_at, updated_at
    ) values (
      '00000000-0000-0000-0000-000000000000', kai_id, 'authenticated', 'authenticated',
      'kai@northwind.demo', password_hash, now(),
      '{"provider":"email","providers":["email"]}'::jsonb, '{}'::jsonb, now(), now()
    );
    insert into auth.identities (id, user_id, identity_data, provider, provider_id, created_at, updated_at, last_sign_in_at)
    values (gen_random_uuid(), kai_id,
      jsonb_build_object('sub', kai_id::text, 'email', 'kai@northwind.demo', 'email_verified', true),
      'email', kai_id::text, now(), now(), now());
  end if;

  if elena_id is null then
    elena_id := gen_random_uuid();
    insert into auth.users (
      instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
      raw_app_meta_data, raw_user_meta_data, created_at, updated_at
    ) values (
      '00000000-0000-0000-0000-000000000000', elena_id, 'authenticated', 'authenticated',
      'elena@northwind.demo', password_hash, now(),
      '{"provider":"email","providers":["email"]}'::jsonb, '{}'::jsonb, now(), now()
    );
    insert into auth.identities (id, user_id, identity_data, provider, provider_id, created_at, updated_at, last_sign_in_at)
    values (gen_random_uuid(), elena_id,
      jsonb_build_object('sub', elena_id::text, 'email', 'elena@northwind.demo', 'email_verified', true),
      'email', elena_id::text, now(), now(), now());
  end if;

  if marcus_id is null then
    marcus_id := gen_random_uuid();
    insert into auth.users (
      instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
      raw_app_meta_data, raw_user_meta_data, created_at, updated_at
    ) values (
      '00000000-0000-0000-0000-000000000000', marcus_id, 'authenticated', 'authenticated',
      'marcus@northwind.demo', password_hash, now(),
      '{"provider":"email","providers":["email"]}'::jsonb, '{}'::jsonb, now(), now()
    );
    insert into auth.identities (id, user_id, identity_data, provider, provider_id, created_at, updated_at, last_sign_in_at)
    values (gen_random_uuid(), marcus_id,
      jsonb_build_object('sub', marcus_id::text, 'email', 'marcus@northwind.demo', 'email_verified', true),
      'email', marcus_id::text, now(), now(), now());
  end if;

  if sofia_id is null then
    sofia_id := gen_random_uuid();
    insert into auth.users (
      instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
      raw_app_meta_data, raw_user_meta_data, created_at, updated_at
    ) values (
      '00000000-0000-0000-0000-000000000000', sofia_id, 'authenticated', 'authenticated',
      'sofia@northwind.demo', password_hash, now(),
      '{"provider":"email","providers":["email"]}'::jsonb, '{}'::jsonb, now(), now()
    );
    insert into auth.identities (id, user_id, identity_data, provider, provider_id, created_at, updated_at, last_sign_in_at)
    values (gen_random_uuid(), sofia_id,
      jsonb_build_object('sub', sofia_id::text, 'email', 'sofia@northwind.demo', 'email_verified', true),
      'email', sofia_id::text, now(), now(), now());
  end if;

  if taylor_id is null then
    taylor_id := gen_random_uuid();
    insert into auth.users (
      instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
      raw_app_meta_data, raw_user_meta_data, created_at, updated_at
    ) values (
      '00000000-0000-0000-0000-000000000000', taylor_id, 'authenticated', 'authenticated',
      'taylor@northwind.demo', password_hash, now(),
      '{"provider":"email","providers":["email"]}'::jsonb, '{}'::jsonb, now(), now()
    );
    insert into auth.identities (id, user_id, identity_data, provider, provider_id, created_at, updated_at, last_sign_in_at)
    values (gen_random_uuid(), taylor_id,
      jsonb_build_object('sub', taylor_id::text, 'email', 'taylor@northwind.demo', 'email_verified', true),
      'email', taylor_id::text, now(), now(), now());
  end if;

  if ravi_id is null then
    ravi_id := gen_random_uuid();
    insert into auth.users (
      instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
      raw_app_meta_data, raw_user_meta_data, created_at, updated_at
    ) values (
      '00000000-0000-0000-0000-000000000000', ravi_id, 'authenticated', 'authenticated',
      'ravi@northwind.demo', password_hash, now(),
      '{"provider":"email","providers":["email"]}'::jsonb, '{}'::jsonb, now(), now()
    );
    insert into auth.identities (id, user_id, identity_data, provider, provider_id, created_at, updated_at, last_sign_in_at)
    values (gen_random_uuid(), ravi_id,
      jsonb_build_object('sub', ravi_id::text, 'email', 'ravi@northwind.demo', 'email_verified', true),
      'email', ravi_id::text, now(), now(), now());
  end if;

  if isabella_id is null then
    isabella_id := gen_random_uuid();
    insert into auth.users (
      instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
      raw_app_meta_data, raw_user_meta_data, created_at, updated_at
    ) values (
      '00000000-0000-0000-0000-000000000000', isabella_id, 'authenticated', 'authenticated',
      'isabella@northwind.demo', password_hash, now(),
      '{"provider":"email","providers":["email"]}'::jsonb, '{}'::jsonb, now(), now()
    );
    insert into auth.identities (id, user_id, identity_data, provider, provider_id, created_at, updated_at, last_sign_in_at)
    values (gen_random_uuid(), isabella_id,
      jsonb_build_object('sub', isabella_id::text, 'email', 'isabella@northwind.demo', 'email_verified', true),
      'email', isabella_id::text, now(), now(), now());
  end if;

  if devon_id is null then
    devon_id := gen_random_uuid();
    insert into auth.users (
      instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
      raw_app_meta_data, raw_user_meta_data, created_at, updated_at
    ) values (
      '00000000-0000-0000-0000-000000000000', devon_id, 'authenticated', 'authenticated',
      'devon@northwind.demo', password_hash, now(),
      '{"provider":"email","providers":["email"]}'::jsonb, '{}'::jsonb, now(), now()
    );
    insert into auth.identities (id, user_id, identity_data, provider, provider_id, created_at, updated_at, last_sign_in_at)
    values (gen_random_uuid(), devon_id,
      jsonb_build_object('sub', devon_id::text, 'email', 'devon@northwind.demo', 'email_verified', true),
      'email', devon_id::text, now(), now(), now());
  end if;

  if anika_id is null then
    anika_id := gen_random_uuid();
    insert into auth.users (
      instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
      raw_app_meta_data, raw_user_meta_data, created_at, updated_at
    ) values (
      '00000000-0000-0000-0000-000000000000', anika_id, 'authenticated', 'authenticated',
      'anika@northwind.demo', password_hash, now(),
      '{"provider":"email","providers":["email"]}'::jsonb, '{}'::jsonb, now(), now()
    );
    insert into auth.identities (id, user_id, identity_data, provider, provider_id, created_at, updated_at, last_sign_in_at)
    values (gen_random_uuid(), anika_id,
      jsonb_build_object('sub', anika_id::text, 'email', 'anika@northwind.demo', 'email_verified', true),
      'email', anika_id::text, now(), now(), now());
  end if;

  if jordan_id is null then
    jordan_id := gen_random_uuid();
    insert into auth.users (
      instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
      raw_app_meta_data, raw_user_meta_data, created_at, updated_at
    ) values (
      '00000000-0000-0000-0000-000000000000', jordan_id, 'authenticated', 'authenticated',
      'jordan@northwind.demo', password_hash, now(),
      '{"provider":"email","providers":["email"]}'::jsonb, '{}'::jsonb, now(), now()
    );
    insert into auth.identities (id, user_id, identity_data, provider, provider_id, created_at, updated_at, last_sign_in_at)
    values (gen_random_uuid(), jordan_id,
      jsonb_build_object('sub', jordan_id::text, 'email', 'jordan@northwind.demo', 'email_verified', true),
      'email', jordan_id::text, now(), now(), now());
  end if;

  ------------------------------------------------------------------
  -- 3. Profiles
  ------------------------------------------------------------------
  insert into public.profiles (id, company_id, email, first_name, last_name, position, reports_to, position_start_date, hire_date, role, invite_status)
  values
    (kai_id, co_id, 'kai@northwind.demo', 'Kai', 'Nakamura', 'Manager, Warehouse Operations', aiden_id, date '2023-05-01', date '2021-09-14', 'team_member', 'active'),
    (elena_id, co_id, 'elena@northwind.demo', 'Elena', 'Volkov', 'Manager, Fleet Operations', aiden_id, date '2024-01-10', date '2020-04-01', 'team_member', 'active'),
    (marcus_id, co_id, 'marcus@northwind.demo', 'Marcus', 'Chen', 'Senior Sales Manager', mateo_id, date '2023-08-15', date '2021-02-01', 'team_member', 'active'),
    (sofia_id, co_id, 'sofia@northwind.demo', 'Sofia', 'Andersson', 'Manager, People Operations', nora_id, date '2024-03-01', date '2022-06-20', 'team_member', 'active'),
    (taylor_id, co_id, 'taylor@northwind.demo', 'Taylor', 'Brooks', 'Warehouse Coordinator', kai_id, date '2024-06-01', date '2024-06-01', 'team_member', 'active'),
    (ravi_id, co_id, 'ravi@northwind.demo', 'Ravi', 'Patel', 'Fleet Analyst', elena_id, date '2024-04-15', date '2023-11-01', 'team_member', 'active'),
    (isabella_id, co_id, 'isabella@northwind.demo', 'Isabella', 'Rossi', 'Account Executive', marcus_id, date '2024-02-01', date '2022-09-15', 'team_member', 'active'),
    (devon_id, co_id, 'devon@northwind.demo', 'Devon', 'Washington', 'Recruiter', sofia_id, date '2025-01-15', date '2024-08-01', 'team_member', 'active'),
    (anika_id, co_id, 'anika@northwind.demo', 'Anika', 'Sharma', 'Financial Analyst', priya_id, date '2024-11-01', date '2022-01-10', 'team_member', 'active'),
    (jordan_id, co_id, 'jordan@northwind.demo', 'Jordan', 'Lee', 'Junior Operations Specialist', aiden_id, date '2025-03-01', date '2025-03-01', 'team_member', 'active')
  on conflict (id) do nothing;

  ------------------------------------------------------------------
  -- 4. Assessments (completed)
  ------------------------------------------------------------------
  select id into kai_asmt from public.assessments where user_id = kai_id limit 1;
  select id into elena_asmt from public.assessments where user_id = elena_id limit 1;
  select id into marcus_asmt from public.assessments where user_id = marcus_id limit 1;
  select id into sofia_asmt from public.assessments where user_id = sofia_id limit 1;
  select id into taylor_asmt from public.assessments where user_id = taylor_id limit 1;
  select id into ravi_asmt from public.assessments where user_id = ravi_id limit 1;
  select id into isabella_asmt from public.assessments where user_id = isabella_id limit 1;
  select id into devon_asmt from public.assessments where user_id = devon_id limit 1;
  select id into anika_asmt from public.assessments where user_id = anika_id limit 1;
  select id into jordan_asmt from public.assessments where user_id = jordan_id limit 1;

  if kai_asmt is null then
    kai_asmt := gen_random_uuid();
    insert into public.assessments (id, user_id, company_id, status, started_at, completed_at)
    values (kai_asmt, kai_id, co_id, 'completed', now() - interval '3 days', now() - interval '3 days');
  end if;
  if elena_asmt is null then
    elena_asmt := gen_random_uuid();
    insert into public.assessments (id, user_id, company_id, status, started_at, completed_at)
    values (elena_asmt, elena_id, co_id, 'completed', now() - interval '4 days', now() - interval '4 days');
  end if;
  if marcus_asmt is null then
    marcus_asmt := gen_random_uuid();
    insert into public.assessments (id, user_id, company_id, status, started_at, completed_at)
    values (marcus_asmt, marcus_id, co_id, 'completed', now() - interval '5 days', now() - interval '5 days');
  end if;
  if sofia_asmt is null then
    sofia_asmt := gen_random_uuid();
    insert into public.assessments (id, user_id, company_id, status, started_at, completed_at)
    values (sofia_asmt, sofia_id, co_id, 'completed', now() - interval '6 days', now() - interval '6 days');
  end if;
  if taylor_asmt is null then
    taylor_asmt := gen_random_uuid();
    insert into public.assessments (id, user_id, company_id, status, started_at, completed_at)
    values (taylor_asmt, taylor_id, co_id, 'completed', now() - interval '7 days', now() - interval '7 days');
  end if;
  if ravi_asmt is null then
    ravi_asmt := gen_random_uuid();
    insert into public.assessments (id, user_id, company_id, status, started_at, completed_at)
    values (ravi_asmt, ravi_id, co_id, 'completed', now() - interval '8 days', now() - interval '8 days');
  end if;
  if isabella_asmt is null then
    isabella_asmt := gen_random_uuid();
    insert into public.assessments (id, user_id, company_id, status, started_at, completed_at)
    values (isabella_asmt, isabella_id, co_id, 'completed', now() - interval '9 days', now() - interval '9 days');
  end if;
  if devon_asmt is null then
    devon_asmt := gen_random_uuid();
    insert into public.assessments (id, user_id, company_id, status, started_at, completed_at)
    values (devon_asmt, devon_id, co_id, 'completed', now() - interval '10 days', now() - interval '10 days');
  end if;
  if anika_asmt is null then
    anika_asmt := gen_random_uuid();
    insert into public.assessments (id, user_id, company_id, status, started_at, completed_at)
    values (anika_asmt, anika_id, co_id, 'completed', now() - interval '11 days', now() - interval '11 days');
  end if;
  if jordan_asmt is null then
    jordan_asmt := gen_random_uuid();
    insert into public.assessments (id, user_id, company_id, status, started_at, completed_at)
    values (jordan_asmt, jordan_id, co_id, 'completed', now() - interval '12 days', now() - interval '12 days');
  end if;

  ------------------------------------------------------------------
  -- 5. Results
  ------------------------------------------------------------------
  insert into public.results (assessment_id, profile, summary, model) values (
    kai_asmt,
    '{"dimensions":[{"dimension":"thinking","competence_avg":3.6,"energy_avg":3.6},{"dimension":"influence","competence_avg":3.25,"energy_avg":3.25},{"dimension":"execution","competence_avg":5,"energy_avg":5},{"dimension":"relating","competence_avg":3,"energy_avg":3}],"sub_strengths":[{"sub_strength":"ideation","dimension":"thinking","competence":3,"energy":3,"flag":"lower_priority","narrative_evidence":null},{"sub_strength":"problem_solving","dimension":"thinking","competence":4,"energy":4,"flag":"signature","narrative_evidence":null},{"sub_strength":"analysis","dimension":"thinking","competence":4,"energy":4,"flag":"signature","narrative_evidence":null},{"sub_strength":"foresight","dimension":"thinking","competence":3,"energy":3,"flag":"lower_priority","narrative_evidence":null},{"sub_strength":"judgment","dimension":"thinking","competence":4,"energy":4,"flag":"signature","narrative_evidence":null},{"sub_strength":"mobilizing","dimension":"influence","competence":3,"energy":3,"flag":"lower_priority","narrative_evidence":null},{"sub_strength":"communication","dimension":"influence","competence":3,"energy":3,"flag":"lower_priority","narrative_evidence":null},{"sub_strength":"direction","dimension":"influence","competence":4,"energy":4,"flag":"signature","narrative_evidence":null},{"sub_strength":"connecting","dimension":"influence","competence":3,"energy":3,"flag":"lower_priority","narrative_evidence":null},{"sub_strength":"follow_through","dimension":"execution","competence":5,"energy":5,"flag":"signature","narrative_evidence":null},{"sub_strength":"organizing","dimension":"execution","competence":5,"energy":5,"flag":"signature","narrative_evidence":null},{"sub_strength":"ownership","dimension":"execution","competence":5,"energy":5,"flag":"signature","narrative_evidence":null},{"sub_strength":"developing_others","dimension":"relating","competence":3,"energy":3,"flag":"lower_priority","narrative_evidence":null},{"sub_strength":"empathy","dimension":"relating","competence":3,"energy":3,"flag":"lower_priority","narrative_evidence":null},{"sub_strength":"building_trust","dimension":"relating","competence":3,"energy":3,"flag":"lower_priority","narrative_evidence":null},{"sub_strength":"including","dimension":"relating","competence":3,"energy":3,"flag":"lower_priority","narrative_evidence":null}],"orientation":{"lean":"direct","score":1.7,"by_dimension":{}},"top_strengths":["follow_through","organizing","ownership","problem_solving","analysis"],"divergences":[],"narrative_coded":[]}'::jsonb,
    'Kai''s home is the operational spine. Follow-through, organizing, and ownership all land signature, and the problem-solving and judgment side rounds it out for the calls a warehouse floor throws at you daily. The Relating dimension reads quieter and that''s fine as configuration — Kai leads by getting the routine to hold.',
    'seed'
  ) on conflict (assessment_id) do nothing;

  insert into public.results (assessment_id, profile, summary, model) values (
    elena_asmt,
    '{"dimensions":[{"dimension":"thinking","competence_avg":4,"energy_avg":4},{"dimension":"influence","competence_avg":3.25,"energy_avg":3.25},{"dimension":"execution","competence_avg":4.67,"energy_avg":4.33},{"dimension":"relating","competence_avg":3,"energy_avg":3}],"sub_strengths":[{"sub_strength":"ideation","dimension":"thinking","competence":3,"energy":3,"flag":"lower_priority","narrative_evidence":null},{"sub_strength":"problem_solving","dimension":"thinking","competence":4,"energy":4,"flag":"signature","narrative_evidence":null},{"sub_strength":"analysis","dimension":"thinking","competence":4,"energy":4,"flag":"signature","narrative_evidence":null},{"sub_strength":"foresight","dimension":"thinking","competence":5,"energy":5,"flag":"signature","narrative_evidence":null},{"sub_strength":"judgment","dimension":"thinking","competence":4,"energy":4,"flag":"signature","narrative_evidence":null},{"sub_strength":"mobilizing","dimension":"influence","competence":3,"energy":3,"flag":"lower_priority","narrative_evidence":null},{"sub_strength":"communication","dimension":"influence","competence":3,"energy":3,"flag":"lower_priority","narrative_evidence":null},{"sub_strength":"direction","dimension":"influence","competence":4,"energy":4,"flag":"signature","narrative_evidence":null},{"sub_strength":"connecting","dimension":"influence","competence":3,"energy":3,"flag":"lower_priority","narrative_evidence":null},{"sub_strength":"follow_through","dimension":"execution","competence":5,"energy":4,"flag":"signature","narrative_evidence":null},{"sub_strength":"organizing","dimension":"execution","competence":5,"energy":5,"flag":"signature","narrative_evidence":null},{"sub_strength":"ownership","dimension":"execution","competence":4,"energy":4,"flag":"signature","narrative_evidence":null},{"sub_strength":"developing_others","dimension":"relating","competence":3,"energy":3,"flag":"lower_priority","narrative_evidence":null},{"sub_strength":"empathy","dimension":"relating","competence":3,"energy":3,"flag":"lower_priority","narrative_evidence":null},{"sub_strength":"building_trust","dimension":"relating","competence":3,"energy":3,"flag":"lower_priority","narrative_evidence":null},{"sub_strength":"including","dimension":"relating","competence":3,"energy":3,"flag":"lower_priority","narrative_evidence":null}],"orientation":{"lean":"direct","score":1.8,"by_dimension":{}},"top_strengths":["foresight","organizing","follow_through","problem_solving","analysis"],"divergences":[],"narrative_coded":[]}'::jsonb,
    'Elena reads the road ahead. Foresight signature, backed by strong Judgment and Organizing, is a good fit for keeping fleet operations reliable while looking two moves out. Where the energy sits is planning and structure more than the people-facing side.',
    'seed'
  ) on conflict (assessment_id) do nothing;

  insert into public.results (assessment_id, profile, summary, model) values (
    marcus_asmt,
    '{"dimensions":[{"dimension":"thinking","competence_avg":3.2,"energy_avg":3.2},{"dimension":"influence","competence_avg":4.75,"energy_avg":4.75},{"dimension":"execution","competence_avg":3.67,"energy_avg":3.67},{"dimension":"relating","competence_avg":3.75,"energy_avg":3.75}],"sub_strengths":[{"sub_strength":"ideation","dimension":"thinking","competence":3,"energy":3,"flag":"lower_priority","narrative_evidence":null},{"sub_strength":"problem_solving","dimension":"thinking","competence":3,"energy":3,"flag":"lower_priority","narrative_evidence":null},{"sub_strength":"analysis","dimension":"thinking","competence":3,"energy":3,"flag":"lower_priority","narrative_evidence":null},{"sub_strength":"foresight","dimension":"thinking","competence":3,"energy":3,"flag":"lower_priority","narrative_evidence":null},{"sub_strength":"judgment","dimension":"thinking","competence":4,"energy":4,"flag":"signature","narrative_evidence":null},{"sub_strength":"mobilizing","dimension":"influence","competence":5,"energy":5,"flag":"signature","narrative_evidence":null},{"sub_strength":"communication","dimension":"influence","competence":5,"energy":5,"flag":"signature","narrative_evidence":null},{"sub_strength":"direction","dimension":"influence","competence":4,"energy":4,"flag":"signature","narrative_evidence":null},{"sub_strength":"connecting","dimension":"influence","competence":5,"energy":5,"flag":"signature","narrative_evidence":null},{"sub_strength":"follow_through","dimension":"execution","competence":4,"energy":4,"flag":"signature","narrative_evidence":null},{"sub_strength":"organizing","dimension":"execution","competence":3,"energy":3,"flag":"lower_priority","narrative_evidence":null},{"sub_strength":"ownership","dimension":"execution","competence":4,"energy":4,"flag":"signature","narrative_evidence":null},{"sub_strength":"developing_others","dimension":"relating","competence":4,"energy":4,"flag":"signature","narrative_evidence":null},{"sub_strength":"empathy","dimension":"relating","competence":3,"energy":3,"flag":"lower_priority","narrative_evidence":null},{"sub_strength":"building_trust","dimension":"relating","competence":5,"energy":5,"flag":"signature","narrative_evidence":null},{"sub_strength":"including","dimension":"relating","competence":3,"energy":3,"flag":"lower_priority","narrative_evidence":null}],"orientation":{"lean":"direct","score":1.9,"by_dimension":{}},"top_strengths":["mobilizing","communication","connecting","building_trust","judgment"],"divergences":[],"narrative_coded":[]}'::jsonb,
    'Marcus wins the room and keeps the account. Mobilizing, Communication, and Connecting all read signature, and Building Trust holds up alongside them. The team-development pull is there too, which is what pushes a sales manager from performer to multiplier.',
    'seed'
  ) on conflict (assessment_id) do nothing;

  insert into public.results (assessment_id, profile, summary, model) values (
    sofia_asmt,
    '{"dimensions":[{"dimension":"thinking","competence_avg":3.4,"energy_avg":3.4},{"dimension":"influence","competence_avg":4,"energy_avg":4},{"dimension":"execution","competence_avg":3.67,"energy_avg":3.67},{"dimension":"relating","competence_avg":5,"energy_avg":5}],"sub_strengths":[{"sub_strength":"ideation","dimension":"thinking","competence":3,"energy":3,"flag":"lower_priority","narrative_evidence":null},{"sub_strength":"problem_solving","dimension":"thinking","competence":3,"energy":3,"flag":"lower_priority","narrative_evidence":null},{"sub_strength":"analysis","dimension":"thinking","competence":3,"energy":3,"flag":"lower_priority","narrative_evidence":null},{"sub_strength":"foresight","dimension":"thinking","competence":4,"energy":4,"flag":"signature","narrative_evidence":null},{"sub_strength":"judgment","dimension":"thinking","competence":4,"energy":4,"flag":"signature","narrative_evidence":null},{"sub_strength":"mobilizing","dimension":"influence","competence":4,"energy":4,"flag":"signature","narrative_evidence":null},{"sub_strength":"communication","dimension":"influence","competence":4,"energy":4,"flag":"signature","narrative_evidence":null},{"sub_strength":"direction","dimension":"influence","competence":3,"energy":3,"flag":"lower_priority","narrative_evidence":null},{"sub_strength":"connecting","dimension":"influence","competence":5,"energy":5,"flag":"signature","narrative_evidence":null},{"sub_strength":"follow_through","dimension":"execution","competence":4,"energy":4,"flag":"signature","narrative_evidence":null},{"sub_strength":"organizing","dimension":"execution","competence":4,"energy":4,"flag":"signature","narrative_evidence":null},{"sub_strength":"ownership","dimension":"execution","competence":3,"energy":3,"flag":"lower_priority","narrative_evidence":null},{"sub_strength":"developing_others","dimension":"relating","competence":5,"energy":5,"flag":"signature","narrative_evidence":null},{"sub_strength":"empathy","dimension":"relating","competence":5,"energy":5,"flag":"signature","narrative_evidence":null},{"sub_strength":"building_trust","dimension":"relating","competence":5,"energy":5,"flag":"signature","narrative_evidence":null},{"sub_strength":"including","dimension":"relating","competence":5,"energy":5,"flag":"signature","narrative_evidence":null}],"orientation":{"lean":"facilitative","score":3.4,"by_dimension":{}},"top_strengths":["connecting","developing_others","empathy","building_trust","including"],"divergences":[],"narrative_coded":[]}'::jsonb,
    'Sofia builds the conditions where people work well. All four Relating sub-strengths land signature, and the Communication and Connecting sides of Influence carry the same energy. The facilitative lean shows up cleanly: the goal is drawing out the group, not steering it.',
    'seed'
  ) on conflict (assessment_id) do nothing;

  insert into public.results (assessment_id, profile, summary, model) values (
    taylor_asmt,
    '{"dimensions":[{"dimension":"thinking","competence_avg":2.8,"energy_avg":2.8},{"dimension":"influence","competence_avg":3,"energy_avg":3},{"dimension":"execution","competence_avg":4.67,"energy_avg":4.67},{"dimension":"relating","competence_avg":3,"energy_avg":3}],"sub_strengths":[{"sub_strength":"ideation","dimension":"thinking","competence":2,"energy":2,"flag":"lower_priority","narrative_evidence":null},{"sub_strength":"problem_solving","dimension":"thinking","competence":3,"energy":3,"flag":"lower_priority","narrative_evidence":null},{"sub_strength":"analysis","dimension":"thinking","competence":3,"energy":3,"flag":"lower_priority","narrative_evidence":null},{"sub_strength":"foresight","dimension":"thinking","competence":3,"energy":3,"flag":"lower_priority","narrative_evidence":null},{"sub_strength":"judgment","dimension":"thinking","competence":3,"energy":3,"flag":"lower_priority","narrative_evidence":null},{"sub_strength":"mobilizing","dimension":"influence","competence":3,"energy":3,"flag":"lower_priority","narrative_evidence":null},{"sub_strength":"communication","dimension":"influence","competence":3,"energy":3,"flag":"lower_priority","narrative_evidence":null},{"sub_strength":"direction","dimension":"influence","competence":3,"energy":3,"flag":"lower_priority","narrative_evidence":null},{"sub_strength":"connecting","dimension":"influence","competence":3,"energy":3,"flag":"lower_priority","narrative_evidence":null},{"sub_strength":"follow_through","dimension":"execution","competence":5,"energy":5,"flag":"signature","narrative_evidence":null},{"sub_strength":"organizing","dimension":"execution","competence":5,"energy":5,"flag":"signature","narrative_evidence":null},{"sub_strength":"ownership","dimension":"execution","competence":4,"energy":4,"flag":"signature","narrative_evidence":null},{"sub_strength":"developing_others","dimension":"relating","competence":3,"energy":3,"flag":"lower_priority","narrative_evidence":null},{"sub_strength":"empathy","dimension":"relating","competence":3,"energy":3,"flag":"lower_priority","narrative_evidence":null},{"sub_strength":"building_trust","dimension":"relating","competence":3,"energy":3,"flag":"lower_priority","narrative_evidence":null},{"sub_strength":"including","dimension":"relating","competence":3,"energy":3,"flag":"lower_priority","narrative_evidence":null}],"orientation":{"lean":"direct","score":1.9,"by_dimension":{}},"top_strengths":["follow_through","organizing","ownership"],"divergences":[],"narrative_coded":[]}'::jsonb,
    'Taylor keeps the daily work moving. Follow-through and Organizing land signature, with Ownership right there — the pattern of somebody who closes what they open. The rest reads as configuration data: energy is best spent on the operational spine, not out at the edges.',
    'seed'
  ) on conflict (assessment_id) do nothing;

  insert into public.results (assessment_id, profile, summary, model) values (
    ravi_asmt,
    '{"dimensions":[{"dimension":"thinking","competence_avg":4.2,"energy_avg":4.2},{"dimension":"influence","competence_avg":3,"energy_avg":2.5},{"dimension":"execution","competence_avg":3.67,"energy_avg":3.67},{"dimension":"relating","competence_avg":3,"energy_avg":2.25}],"sub_strengths":[{"sub_strength":"ideation","dimension":"thinking","competence":3,"energy":3,"flag":"lower_priority","narrative_evidence":null},{"sub_strength":"problem_solving","dimension":"thinking","competence":5,"energy":5,"flag":"signature","narrative_evidence":null},{"sub_strength":"analysis","dimension":"thinking","competence":5,"energy":5,"flag":"signature","narrative_evidence":null},{"sub_strength":"foresight","dimension":"thinking","competence":4,"energy":4,"flag":"signature","narrative_evidence":null},{"sub_strength":"judgment","dimension":"thinking","competence":4,"energy":4,"flag":"signature","narrative_evidence":null},{"sub_strength":"mobilizing","dimension":"influence","competence":3,"energy":2,"flag":"lower_priority","narrative_evidence":null},{"sub_strength":"communication","dimension":"influence","competence":3,"energy":3,"flag":"lower_priority","narrative_evidence":null},{"sub_strength":"direction","dimension":"influence","competence":3,"energy":2,"flag":"lower_priority","narrative_evidence":null},{"sub_strength":"connecting","dimension":"influence","competence":3,"energy":3,"flag":"lower_priority","narrative_evidence":null},{"sub_strength":"follow_through","dimension":"execution","competence":4,"energy":4,"flag":"signature","narrative_evidence":null},{"sub_strength":"organizing","dimension":"execution","competence":4,"energy":4,"flag":"signature","narrative_evidence":null},{"sub_strength":"ownership","dimension":"execution","competence":3,"energy":3,"flag":"lower_priority","narrative_evidence":null},{"sub_strength":"developing_others","dimension":"relating","competence":3,"energy":2,"flag":"lower_priority","narrative_evidence":null},{"sub_strength":"empathy","dimension":"relating","competence":3,"energy":2,"flag":"lower_priority","narrative_evidence":null},{"sub_strength":"building_trust","dimension":"relating","competence":3,"energy":3,"flag":"lower_priority","narrative_evidence":null},{"sub_strength":"including","dimension":"relating","competence":3,"energy":2,"flag":"lower_priority","narrative_evidence":null}],"orientation":{"lean":"direct","score":1.5,"by_dimension":{}},"top_strengths":["problem_solving","analysis","foresight","judgment","follow_through"],"divergences":[],"narrative_coded":[]}'::jsonb,
    'Ravi digs into the data and finds the pattern. Problem Solving and Analysis signature, with Foresight and Judgment close behind. The Influence and Relating sides read quieter, which is the honest configuration for an analyst role.',
    'seed'
  ) on conflict (assessment_id) do nothing;

  insert into public.results (assessment_id, profile, summary, model) values (
    isabella_asmt,
    '{"dimensions":[{"dimension":"thinking","competence_avg":3,"energy_avg":3},{"dimension":"influence","competence_avg":4,"energy_avg":4},{"dimension":"execution","competence_avg":3.67,"energy_avg":3.67},{"dimension":"relating","competence_avg":4,"energy_avg":4}],"sub_strengths":[{"sub_strength":"ideation","dimension":"thinking","competence":3,"energy":3,"flag":"lower_priority","narrative_evidence":null},{"sub_strength":"problem_solving","dimension":"thinking","competence":3,"energy":3,"flag":"lower_priority","narrative_evidence":null},{"sub_strength":"analysis","dimension":"thinking","competence":3,"energy":3,"flag":"lower_priority","narrative_evidence":null},{"sub_strength":"foresight","dimension":"thinking","competence":3,"energy":3,"flag":"lower_priority","narrative_evidence":null},{"sub_strength":"judgment","dimension":"thinking","competence":3,"energy":3,"flag":"lower_priority","narrative_evidence":null},{"sub_strength":"mobilizing","dimension":"influence","competence":4,"energy":4,"flag":"signature","narrative_evidence":null},{"sub_strength":"communication","dimension":"influence","competence":4,"energy":4,"flag":"signature","narrative_evidence":null},{"sub_strength":"direction","dimension":"influence","competence":3,"energy":3,"flag":"lower_priority","narrative_evidence":null},{"sub_strength":"connecting","dimension":"influence","competence":5,"energy":5,"flag":"signature","narrative_evidence":null},{"sub_strength":"follow_through","dimension":"execution","competence":4,"energy":4,"flag":"signature","narrative_evidence":null},{"sub_strength":"organizing","dimension":"execution","competence":3,"energy":3,"flag":"lower_priority","narrative_evidence":null},{"sub_strength":"ownership","dimension":"execution","competence":4,"energy":4,"flag":"signature","narrative_evidence":null},{"sub_strength":"developing_others","dimension":"relating","competence":3,"energy":3,"flag":"lower_priority","narrative_evidence":null},{"sub_strength":"empathy","dimension":"relating","competence":4,"energy":4,"flag":"signature","narrative_evidence":null},{"sub_strength":"building_trust","dimension":"relating","competence":5,"energy":5,"flag":"signature","narrative_evidence":null},{"sub_strength":"including","dimension":"relating","competence":4,"energy":4,"flag":"signature","narrative_evidence":null}],"orientation":{"lean":"facilitative","score":3,"by_dimension":{}},"top_strengths":["connecting","building_trust","mobilizing","communication","follow_through"],"divergences":[],"narrative_coded":[]}'::jsonb,
    'Isabella opens the door and keeps it open. Connecting and Building Trust land signature, with Empathy and the Influence subs right behind. The strengths line up cleanly with an account role where the relationship is the product.',
    'seed'
  ) on conflict (assessment_id) do nothing;

  insert into public.results (assessment_id, profile, summary, model) values (
    devon_asmt,
    '{"dimensions":[{"dimension":"thinking","competence_avg":3,"energy_avg":3},{"dimension":"influence","competence_avg":4.25,"energy_avg":4.25},{"dimension":"execution","competence_avg":3.33,"energy_avg":3.33},{"dimension":"relating","competence_avg":4.5,"energy_avg":4.5}],"sub_strengths":[{"sub_strength":"ideation","dimension":"thinking","competence":3,"energy":3,"flag":"lower_priority","narrative_evidence":null},{"sub_strength":"problem_solving","dimension":"thinking","competence":3,"energy":3,"flag":"lower_priority","narrative_evidence":null},{"sub_strength":"analysis","dimension":"thinking","competence":3,"energy":3,"flag":"lower_priority","narrative_evidence":null},{"sub_strength":"foresight","dimension":"thinking","competence":3,"energy":3,"flag":"lower_priority","narrative_evidence":null},{"sub_strength":"judgment","dimension":"thinking","competence":3,"energy":3,"flag":"lower_priority","narrative_evidence":null},{"sub_strength":"mobilizing","dimension":"influence","competence":4,"energy":4,"flag":"signature","narrative_evidence":null},{"sub_strength":"communication","dimension":"influence","competence":5,"energy":5,"flag":"signature","narrative_evidence":null},{"sub_strength":"direction","dimension":"influence","competence":3,"energy":3,"flag":"lower_priority","narrative_evidence":null},{"sub_strength":"connecting","dimension":"influence","competence":5,"energy":5,"flag":"signature","narrative_evidence":null},{"sub_strength":"follow_through","dimension":"execution","competence":4,"energy":4,"flag":"signature","narrative_evidence":null},{"sub_strength":"organizing","dimension":"execution","competence":3,"energy":3,"flag":"lower_priority","narrative_evidence":null},{"sub_strength":"ownership","dimension":"execution","competence":3,"energy":3,"flag":"lower_priority","narrative_evidence":null},{"sub_strength":"developing_others","dimension":"relating","competence":4,"energy":4,"flag":"signature","narrative_evidence":null},{"sub_strength":"empathy","dimension":"relating","competence":5,"energy":5,"flag":"signature","narrative_evidence":null},{"sub_strength":"building_trust","dimension":"relating","competence":4,"energy":4,"flag":"signature","narrative_evidence":null},{"sub_strength":"including","dimension":"relating","competence":5,"energy":5,"flag":"signature","narrative_evidence":null}],"orientation":{"lean":"facilitative","score":3.2,"by_dimension":{}},"top_strengths":["communication","connecting","empathy","including","mobilizing"],"divergences":[],"narrative_coded":[]}'::jsonb,
    'Devon draws people in. Communication, Connecting, Empathy, and Including all read signature — a rare configuration and a strong one for the recruiter seat. People warm up quickly and feel understood, which is exactly what the front of the hiring funnel needs.',
    'seed'
  ) on conflict (assessment_id) do nothing;

  insert into public.results (assessment_id, profile, summary, model) values (
    anika_asmt,
    '{"dimensions":[{"dimension":"thinking","competence_avg":4.4,"energy_avg":4.4},{"dimension":"influence","competence_avg":2.5,"energy_avg":2.5},{"dimension":"execution","competence_avg":3.67,"energy_avg":3.67},{"dimension":"relating","competence_avg":2.5,"energy_avg":2.5}],"sub_strengths":[{"sub_strength":"ideation","dimension":"thinking","competence":3,"energy":3,"flag":"lower_priority","narrative_evidence":null},{"sub_strength":"problem_solving","dimension":"thinking","competence":5,"energy":5,"flag":"signature","narrative_evidence":null},{"sub_strength":"analysis","dimension":"thinking","competence":5,"energy":5,"flag":"signature","narrative_evidence":null},{"sub_strength":"foresight","dimension":"thinking","competence":4,"energy":4,"flag":"signature","narrative_evidence":null},{"sub_strength":"judgment","dimension":"thinking","competence":5,"energy":5,"flag":"signature","narrative_evidence":null},{"sub_strength":"mobilizing","dimension":"influence","competence":2,"energy":2,"flag":"lower_priority","narrative_evidence":null},{"sub_strength":"communication","dimension":"influence","competence":3,"energy":3,"flag":"lower_priority","narrative_evidence":null},{"sub_strength":"direction","dimension":"influence","competence":2,"energy":2,"flag":"lower_priority","narrative_evidence":null},{"sub_strength":"connecting","dimension":"influence","competence":3,"energy":3,"flag":"lower_priority","narrative_evidence":null},{"sub_strength":"follow_through","dimension":"execution","competence":4,"energy":4,"flag":"signature","narrative_evidence":null},{"sub_strength":"organizing","dimension":"execution","competence":4,"energy":4,"flag":"signature","narrative_evidence":null},{"sub_strength":"ownership","dimension":"execution","competence":3,"energy":3,"flag":"lower_priority","narrative_evidence":null},{"sub_strength":"developing_others","dimension":"relating","competence":2,"energy":2,"flag":"lower_priority","narrative_evidence":null},{"sub_strength":"empathy","dimension":"relating","competence":3,"energy":3,"flag":"lower_priority","narrative_evidence":null},{"sub_strength":"building_trust","dimension":"relating","competence":3,"energy":3,"flag":"lower_priority","narrative_evidence":null},{"sub_strength":"including","dimension":"relating","competence":2,"energy":2,"flag":"lower_priority","narrative_evidence":null}],"orientation":{"lean":"direct","score":1.4,"by_dimension":{}},"top_strengths":["problem_solving","analysis","judgment","foresight","follow_through"],"divergences":[],"narrative_coded":[]}'::jsonb,
    'Anika is a Thinker''s Thinker. Problem Solving, Analysis, and Judgment all land signature, with Foresight close. The Execution side supports the analytical work — Follow-through and Organizing carry it home. Influence and Relating read as configuration, not deficit.',
    'seed'
  ) on conflict (assessment_id) do nothing;

  insert into public.results (assessment_id, profile, summary, model) values (
    jordan_asmt,
    '{"dimensions":[{"dimension":"thinking","competence_avg":3.2,"energy_avg":3.8},{"dimension":"influence","competence_avg":3,"energy_avg":3.25},{"dimension":"execution","competence_avg":3.33,"energy_avg":3.33},{"dimension":"relating","competence_avg":3,"energy_avg":3.5}],"sub_strengths":[{"sub_strength":"ideation","dimension":"thinking","competence":3,"energy":5,"flag":"hidden_pull","narrative_evidence":null},{"sub_strength":"problem_solving","dimension":"thinking","competence":4,"energy":4,"flag":"signature","narrative_evidence":null},{"sub_strength":"analysis","dimension":"thinking","competence":3,"energy":3,"flag":"lower_priority","narrative_evidence":null},{"sub_strength":"foresight","dimension":"thinking","competence":3,"energy":4,"flag":"hidden_pull","narrative_evidence":null},{"sub_strength":"judgment","dimension":"thinking","competence":3,"energy":3,"flag":"lower_priority","narrative_evidence":null},{"sub_strength":"mobilizing","dimension":"influence","competence":3,"energy":3,"flag":"lower_priority","narrative_evidence":null},{"sub_strength":"communication","dimension":"influence","competence":3,"energy":3,"flag":"lower_priority","narrative_evidence":null},{"sub_strength":"direction","dimension":"influence","competence":3,"energy":3,"flag":"lower_priority","narrative_evidence":null},{"sub_strength":"connecting","dimension":"influence","competence":3,"energy":4,"flag":"hidden_pull","narrative_evidence":null},{"sub_strength":"follow_through","dimension":"execution","competence":4,"energy":4,"flag":"signature","narrative_evidence":null},{"sub_strength":"organizing","dimension":"execution","competence":3,"energy":3,"flag":"lower_priority","narrative_evidence":null},{"sub_strength":"ownership","dimension":"execution","competence":3,"energy":3,"flag":"lower_priority","narrative_evidence":null},{"sub_strength":"developing_others","dimension":"relating","competence":3,"energy":3,"flag":"lower_priority","narrative_evidence":null},{"sub_strength":"empathy","dimension":"relating","competence":3,"energy":4,"flag":"hidden_pull","narrative_evidence":null},{"sub_strength":"building_trust","dimension":"relating","competence":3,"energy":3,"flag":"lower_priority","narrative_evidence":null},{"sub_strength":"including","dimension":"relating","competence":3,"energy":4,"flag":"hidden_pull","narrative_evidence":null}],"orientation":{"lean":"balanced","score":2.5,"by_dimension":{}},"top_strengths":["problem_solving","follow_through"],"divergences":[],"narrative_coded":[]}'::jsonb,
    'Jordan has strong energy for ideas and problem solving that runs a step ahead of the current competence rating. That''s a Hidden Pull, and it''s worth reading as an early signal of where the role can grow. The Relating side also reads with energy that will develop with reps.',
    'seed'
  ) on conflict (assessment_id) do nothing;

end $$;
