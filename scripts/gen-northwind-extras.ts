// Generates supabase/seed/demo_extras.sql — 10 additional Northwind profiles
// with assessments and results. Idempotent SQL: safe to re-run.
// Run: node --experimental-strip-types scripts/gen-northwind-extras.ts

import { writeFileSync } from "node:fs";
import { join } from "node:path";

type Dim = "thinking" | "influence" | "execution" | "relating";
type Flag =
  | "signature"
  | "capable_but_draining"
  | "hidden_pull"
  | "lower_priority";

const SUB_BY_DIM: Record<Dim, string[]> = {
  thinking: ["ideation", "problem_solving", "analysis", "foresight", "judgment"],
  influence: ["mobilizing", "communication", "direction", "connecting"],
  execution: ["follow_through", "organizing", "ownership"],
  relating: ["developing_others", "empathy", "building_trust", "including"],
};
const DIM_OF: Record<string, Dim> = {};
for (const [dim, subs] of Object.entries(SUB_BY_DIM)) {
  for (const s of subs) DIM_OF[s] = dim as Dim;
}
const ALL_SUBS = Object.values(SUB_BY_DIM).flat();

type PersonSpec = {
  email: string;
  first: string;
  last: string;
  position: string;
  reports_to_email: string;
  role: "company_admin" | "team_member";
  position_start_date: string;
  hire_date: string;
  lean: "direct" | "balanced" | "facilitative";
  lean_score: number;
  energy: Record<string, number>;
  competence: Record<string, number>;
  summary: string;
};

// -----------------------------------------------------------------------------
// The 10 additional Northwind people.
//
// Reporting structure produces a three-level tree under Jane (COO):
//   Jane
//     Aiden (VP Ops)
//       Kai      (Manager, Warehouse Ops)     → Taylor (Coordinator)
//       Elena    (Manager, Fleet Ops)          → Ravi (Analyst)
//       Jordan   (Junior Ops Specialist)
//     Nora (Dir of People)
//       Sofia    (Manager, People Ops)         → Devon (Recruiter)
//     Mateo (Head of Sales)
//       Marcus   (Senior Sales Manager)        → Isabella (Account Executive)
//     Priya (Finance Lead)
//       Anika    (Financial Analyst)
// -----------------------------------------------------------------------------

const PEOPLE: PersonSpec[] = [
  // ------------------------- managers (4) -------------------------
  {
    email: "kai@northwind.demo",
    first: "Kai",
    last: "Nakamura",
    position: "Manager, Warehouse Operations",
    reports_to_email: "aiden@northwind.demo",
    role: "team_member",
    position_start_date: "2023-05-01",
    hire_date: "2021-09-14",
    lean: "direct",
    lean_score: 1.7,
    energy: {
      ideation: 3, problem_solving: 4, analysis: 4, foresight: 3, judgment: 4,
      mobilizing: 3, communication: 3, direction: 4, connecting: 3,
      follow_through: 5, organizing: 5, ownership: 5,
      developing_others: 3, empathy: 3, building_trust: 3, including: 3,
    },
    competence: {
      ideation: 3, problem_solving: 4, analysis: 4, foresight: 3, judgment: 4,
      mobilizing: 3, communication: 3, direction: 4, connecting: 3,
      follow_through: 5, organizing: 5, ownership: 5,
      developing_others: 3, empathy: 3, building_trust: 3, including: 3,
    },
    summary:
      "Kai's home is the operational spine. Follow-through, organizing, and ownership all land signature, and the problem-solving and judgment side rounds it out for the calls a warehouse floor throws at you daily. The Relating dimension reads quieter and that's fine as configuration — Kai leads by getting the routine to hold.",
  },
  {
    email: "elena@northwind.demo",
    first: "Elena",
    last: "Volkov",
    position: "Manager, Fleet Operations",
    reports_to_email: "aiden@northwind.demo",
    role: "team_member",
    position_start_date: "2024-01-10",
    hire_date: "2020-04-01",
    lean: "direct",
    lean_score: 1.8,
    energy: {
      ideation: 3, problem_solving: 4, analysis: 4, foresight: 5, judgment: 4,
      mobilizing: 3, communication: 3, direction: 4, connecting: 3,
      follow_through: 4, organizing: 5, ownership: 4,
      developing_others: 3, empathy: 3, building_trust: 3, including: 3,
    },
    competence: {
      ideation: 3, problem_solving: 4, analysis: 4, foresight: 5, judgment: 4,
      mobilizing: 3, communication: 3, direction: 4, connecting: 3,
      follow_through: 5, organizing: 5, ownership: 4,
      developing_others: 3, empathy: 3, building_trust: 3, including: 3,
    },
    summary:
      "Elena reads the road ahead. Foresight signature, backed by strong Judgment and Organizing, is a good fit for keeping fleet operations reliable while looking two moves out. Where the energy sits is planning and structure more than the people-facing side.",
  },
  {
    email: "marcus@northwind.demo",
    first: "Marcus",
    last: "Chen",
    position: "Senior Sales Manager",
    reports_to_email: "mateo@northwind.demo",
    role: "team_member",
    position_start_date: "2023-08-15",
    hire_date: "2021-02-01",
    lean: "direct",
    lean_score: 1.9,
    energy: {
      ideation: 3, problem_solving: 3, analysis: 3, foresight: 3, judgment: 4,
      mobilizing: 5, communication: 5, direction: 4, connecting: 5,
      follow_through: 4, organizing: 3, ownership: 4,
      developing_others: 4, empathy: 3, building_trust: 5, including: 3,
    },
    competence: {
      ideation: 3, problem_solving: 3, analysis: 3, foresight: 3, judgment: 4,
      mobilizing: 5, communication: 5, direction: 4, connecting: 5,
      follow_through: 4, organizing: 3, ownership: 4,
      developing_others: 4, empathy: 3, building_trust: 5, including: 3,
    },
    summary:
      "Marcus wins the room and keeps the account. Mobilizing, Communication, and Connecting all read signature, and Building Trust holds up alongside them. The team-development pull is there too, which is what pushes a sales manager from performer to multiplier.",
  },
  {
    email: "sofia@northwind.demo",
    first: "Sofia",
    last: "Andersson",
    position: "Manager, People Operations",
    reports_to_email: "nora@northwind.demo",
    role: "team_member",
    position_start_date: "2024-03-01",
    hire_date: "2022-06-20",
    lean: "facilitative",
    lean_score: 3.4,
    energy: {
      ideation: 3, problem_solving: 3, analysis: 3, foresight: 4, judgment: 4,
      mobilizing: 4, communication: 4, direction: 3, connecting: 5,
      follow_through: 4, organizing: 4, ownership: 3,
      developing_others: 5, empathy: 5, building_trust: 5, including: 5,
    },
    competence: {
      ideation: 3, problem_solving: 3, analysis: 3, foresight: 4, judgment: 4,
      mobilizing: 4, communication: 4, direction: 3, connecting: 5,
      follow_through: 4, organizing: 4, ownership: 3,
      developing_others: 5, empathy: 5, building_trust: 5, including: 5,
    },
    summary:
      "Sofia builds the conditions where people work well. All four Relating sub-strengths land signature, and the Communication and Connecting sides of Influence carry the same energy. The facilitative lean shows up cleanly: the goal is drawing out the group, not steering it.",
  },
  // ------------------------- team members (6) -------------------------
  {
    email: "taylor@northwind.demo",
    first: "Taylor",
    last: "Brooks",
    position: "Warehouse Coordinator",
    reports_to_email: "kai@northwind.demo",
    role: "team_member",
    position_start_date: "2024-06-01",
    hire_date: "2024-06-01",
    lean: "direct",
    lean_score: 1.9,
    energy: {
      ideation: 2, problem_solving: 3, analysis: 3, foresight: 3, judgment: 3,
      mobilizing: 3, communication: 3, direction: 3, connecting: 3,
      follow_through: 5, organizing: 5, ownership: 4,
      developing_others: 3, empathy: 3, building_trust: 3, including: 3,
    },
    competence: {
      ideation: 2, problem_solving: 3, analysis: 3, foresight: 3, judgment: 3,
      mobilizing: 3, communication: 3, direction: 3, connecting: 3,
      follow_through: 5, organizing: 5, ownership: 4,
      developing_others: 3, empathy: 3, building_trust: 3, including: 3,
    },
    summary:
      "Taylor keeps the daily work moving. Follow-through and Organizing land signature, with Ownership right there — the pattern of somebody who closes what they open. The rest reads as configuration data: energy is best spent on the operational spine, not out at the edges.",
  },
  {
    email: "ravi@northwind.demo",
    first: "Ravi",
    last: "Patel",
    position: "Fleet Analyst",
    reports_to_email: "elena@northwind.demo",
    role: "team_member",
    position_start_date: "2024-04-15",
    hire_date: "2023-11-01",
    lean: "direct",
    lean_score: 1.5,
    energy: {
      ideation: 3, problem_solving: 5, analysis: 5, foresight: 4, judgment: 4,
      mobilizing: 2, communication: 3, direction: 2, connecting: 3,
      follow_through: 4, organizing: 4, ownership: 3,
      developing_others: 2, empathy: 2, building_trust: 3, including: 2,
    },
    competence: {
      ideation: 3, problem_solving: 5, analysis: 5, foresight: 4, judgment: 4,
      mobilizing: 3, communication: 3, direction: 3, connecting: 3,
      follow_through: 4, organizing: 4, ownership: 3,
      developing_others: 3, empathy: 3, building_trust: 3, including: 3,
    },
    summary:
      "Ravi digs into the data and finds the pattern. Problem Solving and Analysis signature, with Foresight and Judgment close behind. The Influence and Relating sides read quieter, which is the honest configuration for an analyst role.",
  },
  {
    email: "isabella@northwind.demo",
    first: "Isabella",
    last: "Rossi",
    position: "Account Executive",
    reports_to_email: "marcus@northwind.demo",
    role: "team_member",
    position_start_date: "2024-02-01",
    hire_date: "2022-09-15",
    lean: "facilitative",
    lean_score: 3.0,
    energy: {
      ideation: 3, problem_solving: 3, analysis: 3, foresight: 3, judgment: 3,
      mobilizing: 4, communication: 4, direction: 3, connecting: 5,
      follow_through: 4, organizing: 3, ownership: 4,
      developing_others: 3, empathy: 4, building_trust: 5, including: 4,
    },
    competence: {
      ideation: 3, problem_solving: 3, analysis: 3, foresight: 3, judgment: 3,
      mobilizing: 4, communication: 4, direction: 3, connecting: 5,
      follow_through: 4, organizing: 3, ownership: 4,
      developing_others: 3, empathy: 4, building_trust: 5, including: 4,
    },
    summary:
      "Isabella opens the door and keeps it open. Connecting and Building Trust land signature, with Empathy and the Influence subs right behind. The strengths line up cleanly with an account role where the relationship is the product.",
  },
  {
    email: "devon@northwind.demo",
    first: "Devon",
    last: "Washington",
    position: "Recruiter",
    reports_to_email: "sofia@northwind.demo",
    role: "team_member",
    position_start_date: "2025-01-15",
    hire_date: "2024-08-01",
    lean: "facilitative",
    lean_score: 3.2,
    energy: {
      ideation: 3, problem_solving: 3, analysis: 3, foresight: 3, judgment: 3,
      mobilizing: 4, communication: 5, direction: 3, connecting: 5,
      follow_through: 4, organizing: 3, ownership: 3,
      developing_others: 4, empathy: 5, building_trust: 4, including: 5,
    },
    competence: {
      ideation: 3, problem_solving: 3, analysis: 3, foresight: 3, judgment: 3,
      mobilizing: 4, communication: 5, direction: 3, connecting: 5,
      follow_through: 4, organizing: 3, ownership: 3,
      developing_others: 4, empathy: 5, building_trust: 4, including: 5,
    },
    summary:
      "Devon draws people in. Communication, Connecting, Empathy, and Including all read signature — a rare configuration and a strong one for the recruiter seat. People warm up quickly and feel understood, which is exactly what the front of the hiring funnel needs.",
  },
  {
    email: "anika@northwind.demo",
    first: "Anika",
    last: "Sharma",
    position: "Financial Analyst",
    reports_to_email: "priya@northwind.demo",
    role: "team_member",
    position_start_date: "2024-11-01",
    hire_date: "2022-01-10",
    lean: "direct",
    lean_score: 1.4,
    energy: {
      ideation: 3, problem_solving: 5, analysis: 5, foresight: 4, judgment: 5,
      mobilizing: 2, communication: 3, direction: 2, connecting: 3,
      follow_through: 4, organizing: 4, ownership: 3,
      developing_others: 2, empathy: 3, building_trust: 3, including: 2,
    },
    competence: {
      ideation: 3, problem_solving: 5, analysis: 5, foresight: 4, judgment: 5,
      mobilizing: 2, communication: 3, direction: 2, connecting: 3,
      follow_through: 4, organizing: 4, ownership: 3,
      developing_others: 2, empathy: 3, building_trust: 3, including: 2,
    },
    summary:
      "Anika is a Thinker's Thinker. Problem Solving, Analysis, and Judgment all land signature, with Foresight close. The Execution side supports the analytical work — Follow-through and Organizing carry it home. Influence and Relating read as configuration, not deficit.",
  },
  {
    email: "jordan@northwind.demo",
    first: "Jordan",
    last: "Lee",
    position: "Junior Operations Specialist",
    reports_to_email: "aiden@northwind.demo",
    role: "team_member",
    position_start_date: "2025-03-01",
    hire_date: "2025-03-01",
    lean: "balanced",
    lean_score: 2.5,
    energy: {
      ideation: 5, problem_solving: 4, analysis: 3, foresight: 4, judgment: 3,
      mobilizing: 3, communication: 3, direction: 3, connecting: 4,
      follow_through: 4, organizing: 3, ownership: 3,
      developing_others: 3, empathy: 4, building_trust: 3, including: 4,
    },
    competence: {
      ideation: 3, problem_solving: 4, analysis: 3, foresight: 3, judgment: 3,
      mobilizing: 3, communication: 3, direction: 3, connecting: 3,
      follow_through: 4, organizing: 3, ownership: 3,
      developing_others: 3, empathy: 3, building_trust: 3, including: 3,
    },
    summary:
      "Jordan has strong energy for ideas and problem solving that runs a step ahead of the current competence rating. That's a Hidden Pull, and it's worth reading as an early signal of where the role can grow. The Relating side also reads with energy that will develop with reps.",
  },
];

// -----------------------------------------------------------------------------
// Derive dimension averages, flags, top strengths from raw scores.
// -----------------------------------------------------------------------------

function flagFor(comp: number, energy: number): Flag {
  if (comp >= 4 && energy >= 4) return "signature";
  if (comp >= 4 && energy <= 2) return "capable_but_draining";
  if (energy >= 4 && comp <= 3) return "hidden_pull";
  return "lower_priority";
}

function buildProfile(p: PersonSpec) {
  const subs = ALL_SUBS.map((sub) => {
    const dim = DIM_OF[sub];
    const comp = p.competence[sub] ?? 3;
    const energy = p.energy[sub] ?? 3;
    return {
      sub_strength: sub,
      dimension: dim,
      competence: comp,
      energy,
      flag: flagFor(comp, energy),
      narrative_evidence: null,
    };
  });

  const dims: Dim[] = ["thinking", "influence", "execution", "relating"];
  const dimensions = dims.map((dim) => {
    const list = subs.filter((s) => s.dimension === dim);
    const avg = (k: "competence" | "energy") =>
      Number(
        (list.reduce((a, s) => a + s[k], 0) / list.length).toFixed(2),
      );
    return {
      dimension: dim,
      competence_avg: avg("competence"),
      energy_avg: avg("energy"),
    };
  });

  const signatures = subs.filter((s) => s.flag === "signature");
  signatures.sort((a, b) => b.competence + b.energy - (a.competence + a.energy));
  const top_strengths = signatures.slice(0, 5).map((s) => s.sub_strength);

  return {
    dimensions,
    sub_strengths: subs,
    orientation: {
      lean: p.lean,
      score: p.lean_score,
      by_dimension: {},
    },
    top_strengths,
    divergences: [],
    narrative_coded: [],
  };
}

// -----------------------------------------------------------------------------
// SQL emission
// -----------------------------------------------------------------------------

function sqlText(s: string): string {
  return `'${s.replace(/'/g, "''")}'`;
}

function jsonbLiteral(obj: unknown): string {
  const json = JSON.stringify(obj).replace(/'/g, "''");
  return `'${json}'::jsonb`;
}

function emitAuthUser(varName: string, email: string) {
  return `  if ${varName} is null then
    ${varName} := gen_random_uuid();
    insert into auth.users (
      instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
      raw_app_meta_data, raw_user_meta_data, created_at, updated_at
    ) values (
      '00000000-0000-0000-0000-000000000000', ${varName}, 'authenticated', 'authenticated',
      ${sqlText(email)}, password_hash, now(),
      '{"provider":"email","providers":["email"]}'::jsonb, '{}'::jsonb, now(), now()
    );
    insert into auth.identities (id, user_id, identity_data, provider, provider_id, created_at, updated_at, last_sign_in_at)
    values (gen_random_uuid(), ${varName},
      jsonb_build_object('sub', ${varName}::text, 'email', ${sqlText(email)}, 'email_verified', true),
      'email', ${varName}::text, now(), now(), now());
  end if;`;
}

// Map emails → SQL variable holding the profile id. Includes both the new
// PEOPLE we're seeding and the existing Northwind managers already in the DB
// (looked up at the top of the DO block).
const varOf: Record<string, string> = {
  "aiden@northwind.demo": "aiden_id",
  "nora@northwind.demo": "nora_id",
  "mateo@northwind.demo": "mateo_id",
  "priya@northwind.demo": "priya_id",
};
for (const p of PEOPLE) {
  varOf[p.email] = `${p.first.toLowerCase()}_id`;
}
const asmtVarOf: Record<string, string> = {};
PEOPLE.forEach((p) => {
  asmtVarOf[p.email] = `${p.first.toLowerCase()}_asmt`;
});

const declarations: string[] = [
  "co_id       uuid;",
  "aiden_id    uuid;",
  "nora_id     uuid;",
  "mateo_id    uuid;",
  "priya_id    uuid;",
  "password_hash text;",
];
for (const p of PEOPLE) declarations.push(`${varOf[p.email].padEnd(11)} uuid;`);
for (const p of PEOPLE) declarations.push(`${asmtVarOf[p.email].padEnd(11)} uuid;`);

const authLookups: string[] = [];
for (const p of PEOPLE) {
  authLookups.push(
    `  select id into ${varOf[p.email]} from auth.users where email = ${sqlText(p.email)};`,
  );
}

const authInserts: string[] = [];
for (const p of PEOPLE) {
  authInserts.push(emitAuthUser(varOf[p.email], p.email));
}

const profilesValues: string[] = PEOPLE.map((p) => {
  const managerVar = varOf[p.reports_to_email] ?? "null";
  return `    (${varOf[p.email]}, co_id, ${sqlText(p.email)}, ${sqlText(p.first)}, ${sqlText(p.last)}, ${sqlText(p.position)}, ${managerVar}, date ${sqlText(p.position_start_date)}, date ${sqlText(p.hire_date)}, ${sqlText(p.role)}, 'active')`;
});

const daysAgoByEmail: Record<string, number> = {};
PEOPLE.forEach((p, i) => (daysAgoByEmail[p.email] = 3 + i));

const assessmentInserts: string[] = PEOPLE.map((p) => {
  const days = daysAgoByEmail[p.email];
  return `  if ${asmtVarOf[p.email]} is null then
    ${asmtVarOf[p.email]} := gen_random_uuid();
    insert into public.assessments (id, user_id, company_id, status, started_at, completed_at)
    values (${asmtVarOf[p.email]}, ${varOf[p.email]}, co_id, 'completed', now() - interval '${days} days', now() - interval '${days} days');
  end if;`;
});

const assessmentLookups: string[] = PEOPLE.map(
  (p) =>
    `  select id into ${asmtVarOf[p.email]} from public.assessments where user_id = ${varOf[p.email]} limit 1;`,
);

const resultInserts: string[] = PEOPLE.map((p) => {
  const profile = buildProfile(p);
  return `  insert into public.results (assessment_id, profile, summary, model) values (
    ${asmtVarOf[p.email]},
    ${jsonbLiteral(profile)},
    ${sqlText(p.summary)},
    'seed'
  ) on conflict (assessment_id) do nothing;`;
});

// Update reports_to lines. Managers among the extras report to existing seed
// people; extras that report to other extras use the extras var refs directly
// via the profiles insert above, so this update isn't required — the insert
// carries the correct reports_to already.

const sql = `-- =============================================================================
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
${declarations.map((d) => "  " + d).join("\n")}
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
${authLookups.join("\n")}

  ------------------------------------------------------------------
  -- 2. Create auth users where missing
  ------------------------------------------------------------------
${authInserts.join("\n\n")}

  ------------------------------------------------------------------
  -- 3. Profiles
  ------------------------------------------------------------------
  insert into public.profiles (id, company_id, email, first_name, last_name, position, reports_to, position_start_date, hire_date, role, invite_status)
  values
${profilesValues.join(",\n")}
  on conflict (id) do nothing;

  ------------------------------------------------------------------
  -- 4. Assessments (completed)
  ------------------------------------------------------------------
${assessmentLookups.join("\n")}

${assessmentInserts.join("\n")}

  ------------------------------------------------------------------
  -- 5. Results
  ------------------------------------------------------------------
${resultInserts.join("\n\n")}

end $$;
`;

const outPath = join(
  process.cwd(),
  "supabase",
  "seed",
  "demo_extras.sql",
);
writeFileSync(outPath, sql, "utf8");
console.log(`Wrote ${outPath}`);
console.log(`People: ${PEOPLE.length}`);
console.log(`SQL length: ${sql.length} chars`);
