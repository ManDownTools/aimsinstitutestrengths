-- =============================================================================
-- AiMS Strengths Assessment — demo seed data
-- =============================================================================
-- Run this in the Supabase SQL editor once the migrations (0001–0004) have
-- been applied.
--
-- Creates:
--   1 company:   Northwind Logistics
--   5 auth users, all with password:  aims-demo-2026
--     - Jane Whitfield     jane@northwind.demo    Chief Operating Officer   (company_admin)
--     - Aiden Park         aiden@northwind.demo   VP Operations              (team_member)
--     - Nora Ellison       nora@northwind.demo    Director of People         (team_member)
--     - Mateo Reyes        mateo@northwind.demo   Head of Sales              (team_member)
--     - Priya Shah         priya@northwind.demo   Finance Lead               (team_member)
--   5 completed assessments, one per user, with varied strength profiles so
--   the Team view grid shows contrast.
--
-- To rip the demo out afterwards, delete the "Northwind Logistics" company
-- from the /system page — the ON DELETE CASCADE chain wipes everything.
--
-- Safe to re-run: each block is idempotent on the demo emails. If you edit
-- the profile shapes below, delete the company first, then re-run.
-- =============================================================================

do $$
declare
  co_id         uuid;
  jane_id       uuid;
  aiden_id      uuid;
  nora_id       uuid;
  mateo_id      uuid;
  priya_id      uuid;
  jane_asmt     uuid;
  aiden_asmt    uuid;
  nora_asmt     uuid;
  mateo_asmt    uuid;
  priya_asmt    uuid;
  password_hash text;
begin
  password_hash := crypt('aims-demo-2026', gen_salt('bf'));

  ---------------------------------------------------------------------------
  -- 1. Company
  ---------------------------------------------------------------------------
  select id into co_id from public.companies where name = 'Northwind Logistics';
  if co_id is null then
    insert into public.companies (name) values ('Northwind Logistics')
      returning id into co_id;
  end if;

  ---------------------------------------------------------------------------
  -- 2. Auth users
  ---------------------------------------------------------------------------
  select id into jane_id  from auth.users where email = 'jane@northwind.demo';
  select id into aiden_id from auth.users where email = 'aiden@northwind.demo';
  select id into nora_id  from auth.users where email = 'nora@northwind.demo';
  select id into mateo_id from auth.users where email = 'mateo@northwind.demo';
  select id into priya_id from auth.users where email = 'priya@northwind.demo';

  if jane_id is null then
    jane_id := gen_random_uuid();
    insert into auth.users (
      instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
      raw_app_meta_data, raw_user_meta_data, created_at, updated_at
    ) values (
      '00000000-0000-0000-0000-000000000000', jane_id, 'authenticated', 'authenticated',
      'jane@northwind.demo', password_hash, now(),
      '{"provider":"email","providers":["email"]}'::jsonb, '{}'::jsonb, now(), now()
    );
    insert into auth.identities (id, user_id, identity_data, provider, provider_id, created_at, updated_at, last_sign_in_at)
    values (gen_random_uuid(), jane_id,
      jsonb_build_object('sub', jane_id::text, 'email', 'jane@northwind.demo', 'email_verified', true),
      'email', jane_id::text, now(), now(), now());
  end if;

  if aiden_id is null then
    aiden_id := gen_random_uuid();
    insert into auth.users (instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
      raw_app_meta_data, raw_user_meta_data, created_at, updated_at)
    values ('00000000-0000-0000-0000-000000000000', aiden_id, 'authenticated', 'authenticated',
      'aiden@northwind.demo', password_hash, now(),
      '{"provider":"email","providers":["email"]}'::jsonb, '{}'::jsonb, now(), now());
    insert into auth.identities (id, user_id, identity_data, provider, provider_id, created_at, updated_at, last_sign_in_at)
    values (gen_random_uuid(), aiden_id,
      jsonb_build_object('sub', aiden_id::text, 'email', 'aiden@northwind.demo', 'email_verified', true),
      'email', aiden_id::text, now(), now(), now());
  end if;

  if nora_id is null then
    nora_id := gen_random_uuid();
    insert into auth.users (instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
      raw_app_meta_data, raw_user_meta_data, created_at, updated_at)
    values ('00000000-0000-0000-0000-000000000000', nora_id, 'authenticated', 'authenticated',
      'nora@northwind.demo', password_hash, now(),
      '{"provider":"email","providers":["email"]}'::jsonb, '{}'::jsonb, now(), now());
    insert into auth.identities (id, user_id, identity_data, provider, provider_id, created_at, updated_at, last_sign_in_at)
    values (gen_random_uuid(), nora_id,
      jsonb_build_object('sub', nora_id::text, 'email', 'nora@northwind.demo', 'email_verified', true),
      'email', nora_id::text, now(), now(), now());
  end if;

  if mateo_id is null then
    mateo_id := gen_random_uuid();
    insert into auth.users (instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
      raw_app_meta_data, raw_user_meta_data, created_at, updated_at)
    values ('00000000-0000-0000-0000-000000000000', mateo_id, 'authenticated', 'authenticated',
      'mateo@northwind.demo', password_hash, now(),
      '{"provider":"email","providers":["email"]}'::jsonb, '{}'::jsonb, now(), now());
    insert into auth.identities (id, user_id, identity_data, provider, provider_id, created_at, updated_at, last_sign_in_at)
    values (gen_random_uuid(), mateo_id,
      jsonb_build_object('sub', mateo_id::text, 'email', 'mateo@northwind.demo', 'email_verified', true),
      'email', mateo_id::text, now(), now(), now());
  end if;

  if priya_id is null then
    priya_id := gen_random_uuid();
    insert into auth.users (instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
      raw_app_meta_data, raw_user_meta_data, created_at, updated_at)
    values ('00000000-0000-0000-0000-000000000000', priya_id, 'authenticated', 'authenticated',
      'priya@northwind.demo', password_hash, now(),
      '{"provider":"email","providers":["email"]}'::jsonb, '{}'::jsonb, now(), now());
    insert into auth.identities (id, user_id, identity_data, provider, provider_id, created_at, updated_at, last_sign_in_at)
    values (gen_random_uuid(), priya_id,
      jsonb_build_object('sub', priya_id::text, 'email', 'priya@northwind.demo', 'email_verified', true),
      'email', priya_id::text, now(), now(), now());
  end if;

  ---------------------------------------------------------------------------
  -- 3. Profiles
  ---------------------------------------------------------------------------
  insert into public.profiles (id, company_id, email, first_name, last_name, position, position_start_date, hire_date, role, invite_status)
  values
    (jane_id,  co_id, 'jane@northwind.demo',  'Jane',  'Whitfield', 'Chief Operating Officer', date '2024-03-15', date '2019-06-10', 'company_admin', 'active'),
    (aiden_id, co_id, 'aiden@northwind.demo', 'Aiden', 'Park',      'VP Operations',           date '2022-11-01', date '2020-08-15', 'team_member',   'active'),
    (nora_id,  co_id, 'nora@northwind.demo',  'Nora',  'Ellison',   'Director of People',      date '2023-04-20', date '2021-01-05', 'team_member',   'active'),
    (mateo_id, co_id, 'mateo@northwind.demo', 'Mateo', 'Reyes',     'Head of Sales',           date '2025-02-10', date '2022-03-22', 'team_member',   'active'),
    (priya_id, co_id, 'priya@northwind.demo', 'Priya', 'Shah',      'Finance Lead',            date '2024-08-05', date '2023-01-15', 'team_member',   'active')
  on conflict (id) do nothing;

  -- Wire up a simple reporting line so the "Reports to" dropdown has content.
  update public.profiles set reports_to = jane_id where id in (aiden_id, nora_id, mateo_id, priya_id);

  ---------------------------------------------------------------------------
  -- 4. Assessments (all completed)
  ---------------------------------------------------------------------------
  select id into jane_asmt  from public.assessments where user_id = jane_id  limit 1;
  select id into aiden_asmt from public.assessments where user_id = aiden_id limit 1;
  select id into nora_asmt  from public.assessments where user_id = nora_id  limit 1;
  select id into mateo_asmt from public.assessments where user_id = mateo_id limit 1;
  select id into priya_asmt from public.assessments where user_id = priya_id limit 1;

  if jane_asmt is null then
    jane_asmt := gen_random_uuid();
    insert into public.assessments (id, user_id, company_id, status, started_at, completed_at)
    values (jane_asmt, jane_id, co_id, 'completed', now() - interval '12 days', now() - interval '12 days');
  end if;
  if aiden_asmt is null then
    aiden_asmt := gen_random_uuid();
    insert into public.assessments (id, user_id, company_id, status, started_at, completed_at)
    values (aiden_asmt, aiden_id, co_id, 'completed', now() - interval '10 days', now() - interval '10 days');
  end if;
  if nora_asmt is null then
    nora_asmt := gen_random_uuid();
    insert into public.assessments (id, user_id, company_id, status, started_at, completed_at)
    values (nora_asmt, nora_id, co_id, 'completed', now() - interval '8 days', now() - interval '8 days');
  end if;
  if mateo_asmt is null then
    mateo_asmt := gen_random_uuid();
    insert into public.assessments (id, user_id, company_id, status, started_at, completed_at)
    values (mateo_asmt, mateo_id, co_id, 'completed', now() - interval '6 days', now() - interval '6 days');
  end if;
  if priya_asmt is null then
    priya_asmt := gen_random_uuid();
    insert into public.assessments (id, user_id, company_id, status, started_at, completed_at)
    values (priya_asmt, priya_id, co_id, 'completed', now() - interval '4 days', now() - interval '4 days');
  end if;

  ---------------------------------------------------------------------------
  -- 5. Results — one row per assessment, varied profiles so the Team view
  --    grid shows meaningful contrast across the five people.
  ---------------------------------------------------------------------------

  -- Jane: signature Execution + Direction, capable-but-draining Empathy.
  insert into public.results (assessment_id, profile, summary, model) values (
    jane_asmt,
    '{
      "dimensions": [
        {"dimension":"thinking","competence_avg":4.0,"energy_avg":3.4},
        {"dimension":"influence","competence_avg":4.6,"energy_avg":4.2},
        {"dimension":"execution","competence_avg":4.8,"energy_avg":4.7},
        {"dimension":"relating","competence_avg":3.5,"energy_avg":2.5}
      ],
      "sub_strengths": [
        {"sub_strength":"ideation","dimension":"thinking","competence":3,"energy":4,"flag":"hidden_pull","narrative_evidence":null},
        {"sub_strength":"problem_solving","dimension":"thinking","competence":4,"energy":3,"flag":"capable_but_draining","narrative_evidence":null},
        {"sub_strength":"analysis","dimension":"thinking","competence":4,"energy":3,"flag":"capable_but_draining","narrative_evidence":null},
        {"sub_strength":"foresight","dimension":"thinking","competence":5,"energy":4,"flag":"signature","narrative_evidence":null},
        {"sub_strength":"judgment","dimension":"thinking","competence":4,"energy":3,"flag":"capable_but_draining","narrative_evidence":null},
        {"sub_strength":"mobilizing","dimension":"influence","competence":5,"energy":4,"flag":"signature","narrative_evidence":null},
        {"sub_strength":"communication","dimension":"influence","competence":4,"energy":4,"flag":"signature","narrative_evidence":null},
        {"sub_strength":"direction","dimension":"influence","competence":5,"energy":5,"flag":"signature","narrative_evidence":null},
        {"sub_strength":"connecting","dimension":"influence","competence":4,"energy":4,"flag":"signature","narrative_evidence":null},
        {"sub_strength":"follow_through","dimension":"execution","competence":5,"energy":5,"flag":"signature","narrative_evidence":null},
        {"sub_strength":"organizing","dimension":"execution","competence":5,"energy":4,"flag":"signature","narrative_evidence":null},
        {"sub_strength":"ownership","dimension":"execution","competence":5,"energy":5,"flag":"signature","narrative_evidence":null},
        {"sub_strength":"developing_others","dimension":"relating","competence":3,"energy":2,"flag":"capable_but_draining","narrative_evidence":null},
        {"sub_strength":"empathy","dimension":"relating","competence":4,"energy":2,"flag":"capable_but_draining","narrative_evidence":null},
        {"sub_strength":"building_trust","dimension":"relating","competence":4,"energy":3,"flag":"capable_but_draining","narrative_evidence":null},
        {"sub_strength":"including","dimension":"relating","competence":3,"energy":3,"flag":"hidden_pull","narrative_evidence":null}
      ],
      "orientation":{"lean":"direct","score":1.6,"by_dimension":{"thinking":1.5,"execution":1.2,"influence":2.0}},
      "top_strengths":["follow_through","direction","ownership","organizing","mobilizing"],
      "divergences":[],
      "narrative_coded":[]
    }'::jsonb,
    'You configure your energy around getting things done, and you can feel that in the way people describe you. Execution is where you go big: ownership, follow-through, and organizing all show up as signature strengths, and they''re backed by the energy to match. The Direction and Mobilizing scores tell the same story — when a group needs a call, you make it, and people move. Foresight rounds this out on the Thinking side, which makes sense: the people who consistently ship also tend to see the next step before others do.\n\nThe interesting territory is Relating. Building trust and empathy read as capable but draining. You''re competent there — people feel understood by you and your close working relationships hold up — but the energy isn''t naturally sitting there. That''s worth naming out loud rather than pushing through. The move isn''t to develop those muscles harder. It''s to configure your team so that the relational work you do lands where it matters most, and other people carry more of the day-to-day.\n\nIncluding shows up as an emerging pull — energy that''s ahead of your self-rating. Worth watching. That may be a way to bring some of the Relating dimension into your natural mode without forcing empathy work that drains you.',
    'seed'
  ) on conflict (assessment_id) do nothing;

  -- Aiden: strong Execution, hidden pull on Ideation, low Relating.
  insert into public.results (assessment_id, profile, summary, model) values (
    aiden_asmt,
    '{
      "dimensions": [
        {"dimension":"thinking","competence_avg":3.4,"energy_avg":3.6},
        {"dimension":"influence","competence_avg":3.2,"energy_avg":3.0},
        {"dimension":"execution","competence_avg":4.7,"energy_avg":4.7},
        {"dimension":"relating","competence_avg":2.8,"energy_avg":2.3}
      ],
      "sub_strengths": [
        {"sub_strength":"ideation","dimension":"thinking","competence":3,"energy":5,"flag":"hidden_pull","narrative_evidence":null},
        {"sub_strength":"problem_solving","dimension":"thinking","competence":4,"energy":4,"flag":"signature","narrative_evidence":null},
        {"sub_strength":"analysis","dimension":"thinking","competence":4,"energy":3,"flag":"capable_but_draining","narrative_evidence":null},
        {"sub_strength":"foresight","dimension":"thinking","competence":3,"energy":3,"flag":"hidden_pull","narrative_evidence":null},
        {"sub_strength":"judgment","dimension":"thinking","competence":3,"energy":3,"flag":"hidden_pull","narrative_evidence":null},
        {"sub_strength":"mobilizing","dimension":"influence","competence":3,"energy":3,"flag":"hidden_pull","narrative_evidence":null},
        {"sub_strength":"communication","dimension":"influence","competence":3,"energy":3,"flag":"hidden_pull","narrative_evidence":null},
        {"sub_strength":"direction","dimension":"influence","competence":4,"energy":3,"flag":"capable_but_draining","narrative_evidence":null},
        {"sub_strength":"connecting","dimension":"influence","competence":3,"energy":3,"flag":"hidden_pull","narrative_evidence":null},
        {"sub_strength":"follow_through","dimension":"execution","competence":5,"energy":5,"flag":"signature","narrative_evidence":null},
        {"sub_strength":"organizing","dimension":"execution","competence":5,"energy":5,"flag":"signature","narrative_evidence":null},
        {"sub_strength":"ownership","dimension":"execution","competence":4,"energy":4,"flag":"signature","narrative_evidence":null},
        {"sub_strength":"developing_others","dimension":"relating","competence":2,"energy":2,"flag":"lower_priority","narrative_evidence":null},
        {"sub_strength":"empathy","dimension":"relating","competence":3,"energy":2,"flag":"capable_but_draining","narrative_evidence":null},
        {"sub_strength":"building_trust","dimension":"relating","competence":3,"energy":3,"flag":"hidden_pull","narrative_evidence":null},
        {"sub_strength":"including","dimension":"relating","competence":3,"energy":2,"flag":"capable_but_draining","narrative_evidence":null}
      ],
      "orientation":{"lean":"direct","score":1.4,"by_dimension":{"execution":1.2,"influence":1.7}},
      "top_strengths":["follow_through","organizing","ownership","problem_solving"],
      "divergences":[],
      "narrative_coded":[]
    }'::jsonb,
    'Execution is your natural home. Follow-through and organizing both land as signature strengths, and ownership isn''t far behind. The pattern is consistent: what you take on gets done, tends to keep running after you step back, and people count on you as the one who closes the loop. Problem solving reads the same way — you like the knotty ones and they tend to actually get solved.\n\nWhat''s interesting is the Ideation score. Your energy for dreaming up new ideas is high, but the confidence in your own ideas landing isn''t quite there yet. That''s an emerging pull worth investing in. There''s something in the mix between execution and ideation that could go somewhere useful for the operations role you''re in.\n\nOn Relating, the story is quieter. This isn''t a deficit — it''s configuration. Where the team leans on you is for the operational spine, and where you probably want to lean back is on Nora and Mateo for the people work. That''s the kind of team configuration where everybody plays to their energy.',
    'seed'
  ) on conflict (assessment_id) do nothing;

  -- Nora: signature Relating, hidden pull on Ideation.
  insert into public.results (assessment_id, profile, summary, model) values (
    nora_asmt,
    '{
      "dimensions": [
        {"dimension":"thinking","competence_avg":3.6,"energy_avg":3.8},
        {"dimension":"influence","competence_avg":4.2,"energy_avg":4.5},
        {"dimension":"execution","competence_avg":3.3,"energy_avg":3.0},
        {"dimension":"relating","competence_avg":4.7,"energy_avg":4.8}
      ],
      "sub_strengths": [
        {"sub_strength":"ideation","dimension":"thinking","competence":3,"energy":5,"flag":"hidden_pull","narrative_evidence":null},
        {"sub_strength":"problem_solving","dimension":"thinking","competence":4,"energy":4,"flag":"signature","narrative_evidence":null},
        {"sub_strength":"analysis","dimension":"thinking","competence":3,"energy":3,"flag":"hidden_pull","narrative_evidence":null},
        {"sub_strength":"foresight","dimension":"thinking","competence":4,"energy":3,"flag":"capable_but_draining","narrative_evidence":null},
        {"sub_strength":"judgment","dimension":"thinking","competence":4,"energy":4,"flag":"signature","narrative_evidence":null},
        {"sub_strength":"mobilizing","dimension":"influence","competence":4,"energy":5,"flag":"signature","narrative_evidence":null},
        {"sub_strength":"communication","dimension":"influence","competence":5,"energy":5,"flag":"signature","narrative_evidence":null},
        {"sub_strength":"direction","dimension":"influence","competence":4,"energy":4,"flag":"signature","narrative_evidence":null},
        {"sub_strength":"connecting","dimension":"influence","competence":4,"energy":4,"flag":"signature","narrative_evidence":null},
        {"sub_strength":"follow_through","dimension":"execution","competence":3,"energy":3,"flag":"hidden_pull","narrative_evidence":null},
        {"sub_strength":"organizing","dimension":"execution","competence":3,"energy":3,"flag":"hidden_pull","narrative_evidence":null},
        {"sub_strength":"ownership","dimension":"execution","competence":4,"energy":3,"flag":"capable_but_draining","narrative_evidence":null},
        {"sub_strength":"developing_others","dimension":"relating","competence":5,"energy":5,"flag":"signature","narrative_evidence":null},
        {"sub_strength":"empathy","dimension":"relating","competence":5,"energy":5,"flag":"signature","narrative_evidence":null},
        {"sub_strength":"building_trust","dimension":"relating","competence":5,"energy":5,"flag":"signature","narrative_evidence":null},
        {"sub_strength":"including","dimension":"relating","competence":4,"energy":4,"flag":"signature","narrative_evidence":null}
      ],
      "orientation":{"lean":"facilitative","score":3.5,"by_dimension":{"influence":3.7,"execution":3.4}},
      "top_strengths":["empathy","developing_others","building_trust","communication","mobilizing"],
      "divergences":[],
      "narrative_coded":[]
    }'::jsonb,
    'The relational layer is where you''re at your fullest. Empathy, building trust, and developing others all show up as signature strengths, and the energy to match is right there with them. People feel understood by you, and the close working relationships you build hold up. That''s not soft skill — that''s the operating system for the People function you''re in.\n\nOn the Influence side, communication and mobilizing both signature. When you frame the message, it lands. That combination — deep relational grounding plus a real ability to bring people with you — is a rare one and worth naming.\n\nExecution reads quieter, and that''s configuration, not a gap. The organizing and follow-through pieces have lower energy for you, which is fine because Jane and Aiden carry that side. Where your energy is best spent is on the human side of the org.\n\nOne to watch: your Ideation energy is ahead of your competence rating. There''s an emerging pull there worth exploring — the kind of new-thinking work you might not have done much of yet but that your energy suggests would suit you.',
    'seed'
  ) on conflict (assessment_id) do nothing;

  -- Mateo: signature Influence + Connecting.
  insert into public.results (assessment_id, profile, summary, model) values (
    mateo_asmt,
    '{
      "dimensions": [
        {"dimension":"thinking","competence_avg":3.4,"energy_avg":3.2},
        {"dimension":"influence","competence_avg":4.8,"energy_avg":4.8},
        {"dimension":"execution","competence_avg":3.7,"energy_avg":4.0},
        {"dimension":"relating","competence_avg":3.8,"energy_avg":4.3}
      ],
      "sub_strengths": [
        {"sub_strength":"ideation","dimension":"thinking","competence":4,"energy":4,"flag":"signature","narrative_evidence":null},
        {"sub_strength":"problem_solving","dimension":"thinking","competence":3,"energy":3,"flag":"hidden_pull","narrative_evidence":null},
        {"sub_strength":"analysis","dimension":"thinking","competence":3,"energy":2,"flag":"capable_but_draining","narrative_evidence":null},
        {"sub_strength":"foresight","dimension":"thinking","competence":3,"energy":3,"flag":"hidden_pull","narrative_evidence":null},
        {"sub_strength":"judgment","dimension":"thinking","competence":4,"energy":4,"flag":"signature","narrative_evidence":null},
        {"sub_strength":"mobilizing","dimension":"influence","competence":5,"energy":5,"flag":"signature","narrative_evidence":null},
        {"sub_strength":"communication","dimension":"influence","competence":5,"energy":5,"flag":"signature","narrative_evidence":null},
        {"sub_strength":"direction","dimension":"influence","competence":4,"energy":4,"flag":"signature","narrative_evidence":null},
        {"sub_strength":"connecting","dimension":"influence","competence":5,"energy":5,"flag":"signature","narrative_evidence":null},
        {"sub_strength":"follow_through","dimension":"execution","competence":4,"energy":4,"flag":"signature","narrative_evidence":null},
        {"sub_strength":"organizing","dimension":"execution","competence":3,"energy":4,"flag":"hidden_pull","narrative_evidence":null},
        {"sub_strength":"ownership","dimension":"execution","competence":4,"energy":4,"flag":"signature","narrative_evidence":null},
        {"sub_strength":"developing_others","dimension":"relating","competence":3,"energy":4,"flag":"hidden_pull","narrative_evidence":null},
        {"sub_strength":"empathy","dimension":"relating","competence":4,"energy":4,"flag":"signature","narrative_evidence":null},
        {"sub_strength":"building_trust","dimension":"relating","competence":4,"energy":5,"flag":"signature","narrative_evidence":null},
        {"sub_strength":"including","dimension":"relating","competence":4,"energy":4,"flag":"signature","narrative_evidence":null}
      ],
      "orientation":{"lean":"direct","score":1.9,"by_dimension":{"influence":1.7,"execution":2.1}},
      "top_strengths":["mobilizing","communication","connecting","building_trust","ideation"],
      "divergences":[],
      "narrative_coded":[]
    }'::jsonb,
    'You come alive winning people over. Mobilizing, communication, and connecting all read as signature strengths, and the energy is fully there for each of them. That''s the sales lead reading of your profile — you make the case, you get people behind it, and new people warm to you quickly. Direction rounds out the Influence dimension, which means when a group stalls, you tend to step in and get to a call.\n\nOn Relating, building trust and empathy both signature, with high energy for including. This is unusual and worth naming: a lot of people who lead in Influence run thin on Relating. You don''t. The trust you build stays built. That combination is what makes the sales conversations you have hold up rather than reset every quarter.\n\nAnalysis reads capable but draining, and that''s a useful signal. When the work turns into deep data digs, that''s the energy leak. Configure the team so that Priya carries the analytical grind and you carry the room. Ideation and Judgment on the Thinking side are both signatures, which suggests the strategy-level thinking sits comfortably with you even if the deep detail work doesn''t.',
    'seed'
  ) on conflict (assessment_id) do nothing;

  -- Priya: signature Thinking (analysis, judgment), capable-but-draining influence/relating.
  insert into public.results (assessment_id, profile, summary, model) values (
    priya_asmt,
    '{
      "dimensions": [
        {"dimension":"thinking","competence_avg":4.8,"energy_avg":4.6},
        {"dimension":"influence","competence_avg":3.2,"energy_avg":2.5},
        {"dimension":"execution","competence_avg":4.3,"energy_avg":3.7},
        {"dimension":"relating","competence_avg":3.2,"energy_avg":2.8}
      ],
      "sub_strengths": [
        {"sub_strength":"ideation","dimension":"thinking","competence":4,"energy":4,"flag":"signature","narrative_evidence":null},
        {"sub_strength":"problem_solving","dimension":"thinking","competence":5,"energy":5,"flag":"signature","narrative_evidence":null},
        {"sub_strength":"analysis","dimension":"thinking","competence":5,"energy":5,"flag":"signature","narrative_evidence":null},
        {"sub_strength":"foresight","dimension":"thinking","competence":5,"energy":4,"flag":"signature","narrative_evidence":null},
        {"sub_strength":"judgment","dimension":"thinking","competence":5,"energy":5,"flag":"signature","narrative_evidence":null},
        {"sub_strength":"mobilizing","dimension":"influence","competence":3,"energy":2,"flag":"capable_but_draining","narrative_evidence":null},
        {"sub_strength":"communication","dimension":"influence","competence":4,"energy":3,"flag":"capable_but_draining","narrative_evidence":null},
        {"sub_strength":"direction","dimension":"influence","competence":3,"energy":2,"flag":"capable_but_draining","narrative_evidence":null},
        {"sub_strength":"connecting","dimension":"influence","competence":3,"energy":3,"flag":"hidden_pull","narrative_evidence":null},
        {"sub_strength":"follow_through","dimension":"execution","competence":5,"energy":4,"flag":"signature","narrative_evidence":null},
        {"sub_strength":"organizing","dimension":"execution","competence":4,"energy":4,"flag":"signature","narrative_evidence":null},
        {"sub_strength":"ownership","dimension":"execution","competence":4,"energy":3,"flag":"capable_but_draining","narrative_evidence":null},
        {"sub_strength":"developing_others","dimension":"relating","competence":3,"energy":3,"flag":"hidden_pull","narrative_evidence":null},
        {"sub_strength":"empathy","dimension":"relating","competence":3,"energy":3,"flag":"hidden_pull","narrative_evidence":null},
        {"sub_strength":"building_trust","dimension":"relating","competence":4,"energy":3,"flag":"capable_but_draining","narrative_evidence":null},
        {"sub_strength":"including","dimension":"relating","competence":3,"energy":2,"flag":"capable_but_draining","narrative_evidence":null}
      ],
      "orientation":{"lean":"direct","score":1.3,"by_dimension":{"thinking":1.2,"execution":1.5}},
      "top_strengths":["problem_solving","analysis","judgment","foresight","follow_through"],
      "divergences":[],
      "narrative_coded":[]
    }'::jsonb,
    'You are, structurally, a Thinker. All four of the Thinking sub-strengths land as signature, with the analytical ones running the highest: problem solving, analysis, and judgment. Your read on where things are going tends to hold up, and the calls you make on which ideas to back mostly stick. That''s a rare configuration, and it maps neatly onto the finance role.\n\nOn Execution, follow-through and organizing are both signatures. What you take on gets finished, and the work you organize tends to keep running. Ownership reads as capable but draining — you''re competent there, but the energy for being the one everyone hands things to when the pressure is on isn''t quite where it is for follow-through. Worth naming.\n\nThe Influence dimension is where the useful coaching signal sits. Mobilizing, direction, and communication all read capable but draining. You can do the work when you have to, but it isn''t where your energy naturally flows. This is fine — Mateo carries that side. The team configuration to lean into is: you build the case with the numbers, he takes the case to the room.',
    'seed'
  ) on conflict (assessment_id) do nothing;

end $$;
