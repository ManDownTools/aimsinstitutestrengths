// Unit tests + Northwind side-by-side dry run for the team scoring engine.
// Run: node --experimental-strip-types scripts/test-team-scoring.ts

import { scoreTeam, MISSION_WEIGHTS } from "../src/lib/team-scoring.ts";
import type {
  Member,
  MissionType,
  TeamSignals,
} from "../src/lib/team-scoring.ts";
import type { ResultsProfile, SubStrengthResult } from "../src/lib/types.ts";

// -----------------------------------------------------------------------------
// Tiny test harness. No dependency — one file, easy to reason about.
// -----------------------------------------------------------------------------

type TestResult = { name: string; passed: boolean; error?: string };
const results: TestResult[] = [];

function test(name: string, fn: () => void) {
  try {
    fn();
    results.push({ name, passed: true });
  } catch (e) {
    results.push({
      name,
      passed: false,
      error: e instanceof Error ? e.message : String(e),
    });
  }
}

function assertEqual<T>(actual: T, expected: T, msg?: string) {
  const a = JSON.stringify(actual);
  const b = JSON.stringify(expected);
  if (a !== b) {
    throw new Error(
      `${msg ?? "assertEqual"}\n  expected: ${b}\n  actual:   ${a}`,
    );
  }
}
function assertTrue(cond: boolean, msg?: string) {
  if (!cond) throw new Error(msg ?? "assertTrue failed");
}

// -----------------------------------------------------------------------------
// Fixtures: helpers to build a plausible ResultsProfile from a compact energy
// map (per-sub-strength energy + optional per-sub-strength competence).
// -----------------------------------------------------------------------------

const SUB_STRENGTH_BY_DIM: Record<string, string[]> = {
  thinking: ["ideation", "problem_solving", "analysis", "foresight", "judgment"],
  influence: ["mobilizing", "communication", "direction", "connecting"],
  execution: ["follow_through", "organizing", "ownership"],
  relating: ["developing_others", "empathy", "building_trust", "including"],
};
const DIM_OF: Record<string, "thinking" | "influence" | "execution" | "relating"> =
  {};
for (const [dim, subs] of Object.entries(SUB_STRENGTH_BY_DIM)) {
  for (const sub of subs)
    DIM_OF[sub] = dim as "thinking" | "influence" | "execution" | "relating";
}

function flagFor(comp: number, energy: number): SubStrengthResult["flag"] {
  if (comp >= 4 && energy >= 4) return "signature";
  if (comp >= 4 && energy <= 2) return "capable_but_draining";
  if (energy >= 4 && comp <= 3) return "hidden_pull";
  return "lower_priority";
}

type EnergyMap = Partial<Record<string, number>>;
type CompMap = Partial<Record<string, number>>;

function buildProfile(opts: {
  energy: EnergyMap;
  competence?: CompMap;
  defaultEnergy?: number;
  defaultComp?: number;
  lean?: "direct" | "balanced" | "facilitative";
}): ResultsProfile {
  const dE = opts.defaultEnergy ?? 3;
  const dC = opts.defaultComp ?? 3;
  const subs: SubStrengthResult[] = [];
  for (const [dim, list] of Object.entries(SUB_STRENGTH_BY_DIM)) {
    for (const sub of list) {
      const energy = opts.energy[sub] ?? dE;
      const competence = opts.competence?.[sub] ?? dC;
      subs.push({
        sub_strength: sub,
        dimension: dim as SubStrengthResult["dimension"],
        competence,
        energy,
        flag: flagFor(competence, energy),
        narrative_evidence: null,
      });
    }
  }
  const dims = Object.keys(SUB_STRENGTH_BY_DIM).map((dim) => {
    const dimSubs = subs.filter((s) => s.dimension === dim);
    const avg = (fn: (s: SubStrengthResult) => number) =>
      dimSubs.reduce((a, s) => a + fn(s), 0) / dimSubs.length;
    return {
      dimension: dim as SubStrengthResult["dimension"],
      competence_avg: Number(avg((s) => s.competence).toFixed(2)),
      energy_avg: Number(avg((s) => s.energy).toFixed(2)),
    };
  });
  return {
    dimensions: dims,
    sub_strengths: subs,
    orientation: {
      lean: opts.lean ?? "balanced",
      score: 2.5,
      by_dimension: {},
    },
    top_strengths: [],
    divergences: [],
    narrative_coded: [],
  };
}

function member(id: string, profile: ResultsProfile): Member {
  return { profile_id: id, results: profile };
}

// -----------------------------------------------------------------------------
// Unit tests
// -----------------------------------------------------------------------------

test("strong roster: full coverage on a general mission bands strong", () => {
  const roster: Member[] = [
    member(
      "a",
      buildProfile({
        energy: {
          ideation: 5,
          problem_solving: 5,
          analysis: 4,
          mobilizing: 5,
          communication: 5,
          direction: 4,
        },
        defaultEnergy: 4,
      }),
    ),
    member(
      "b",
      buildProfile({
        energy: {
          follow_through: 5,
          organizing: 5,
          ownership: 5,
          direction: 4,
        },
        defaultEnergy: 4,
      }),
    ),
    member(
      "c",
      buildProfile({
        energy: {
          empathy: 5,
          building_trust: 5,
          developing_others: 5,
          including: 4,
        },
        defaultEnergy: 4,
      }),
    ),
  ];
  const s = scoreTeam(roster, "general");
  assertEqual(s.band, "strong");
  assertTrue(
    s.dimensions.every((d) => d.coverage_count >= 1 && !d.gap),
    "every dim covered",
  );
  assertEqual(s.draining_warnings, []);
});

test("gap in heavily weighted dimension: stabilize team missing Execution bands stretch", () => {
  const roster: Member[] = [
    member(
      "thinker",
      buildProfile({
        energy: {
          analysis: 5,
          problem_solving: 5,
          foresight: 4,
          follow_through: 2,
          organizing: 2,
          ownership: 2,
        },
        defaultEnergy: 3,
      }),
    ),
    member(
      "relator",
      buildProfile({
        energy: {
          empathy: 5,
          building_trust: 5,
          developing_others: 4,
          follow_through: 3,
          organizing: 2,
          ownership: 2,
        },
        defaultEnergy: 3,
      }),
    ),
  ];
  const s = scoreTeam(roster, "stabilize");
  const execDim = s.dimensions.find((d) => d.dimension === "execution")!;
  assertTrue(execDim.gap, "execution should be flagged as a gap");
  assertEqual(execDim.coverage_count, 0);
  assertEqual(s.band, "stretch", "stabilize weights Execution 0.45 → stretch");
});

test("sole holder: exactly one member with energy >= 4 flags that person", () => {
  const roster: Member[] = [
    member(
      "onlyAnalyst",
      buildProfile({
        energy: { analysis: 5, problem_solving: 3 },
        defaultEnergy: 3,
      }),
    ),
    member("plain1", buildProfile({ energy: { analysis: 2 }, defaultEnergy: 3 })),
    member("plain2", buildProfile({ energy: { analysis: 3 }, defaultEnergy: 3 })),
  ];
  const s = scoreTeam(roster, "launch");
  const analysis = s.sub_strengths.find((x) => x.sub_strength === "analysis")!;
  assertEqual(analysis.state, "sole_holder");
  assertEqual(analysis.holder, "onlyAnalyst");
});

test("draining warning: capable-but-draining on a heavily weighted, otherwise-uncovered sub-strength", () => {
  // Launch mission: top-2 weighted dims are Thinking (0.35) and Influence (0.30).
  // Person is competent (4+) but drained (2 or less) on 'analysis' (Thinking),
  // and no other member has energy >= 4 for analysis. Warn.
  const roster: Member[] = [
    member(
      "veteran",
      buildProfile({
        energy: { analysis: 2, foresight: 4, judgment: 4 },
        competence: { analysis: 5 },
        defaultEnergy: 3,
      }),
    ),
    member(
      "junior",
      buildProfile({
        energy: { analysis: 3, ideation: 4 },
        defaultEnergy: 3,
      }),
    ),
  ];
  const s = scoreTeam(roster, "launch");
  const found = s.draining_warnings.find(
    (w) => w.profile_id === "veteran" && w.sub_strength === "analysis",
  );
  assertTrue(!!found, "veteran should be flagged draining on analysis");

  // Control: if another member has energy >= 4 for analysis, the warning goes away.
  const roster2: Member[] = [
    ...roster,
    member(
      "backup",
      buildProfile({ energy: { analysis: 5 }, defaultEnergy: 3 }),
    ),
  ];
  const s2 = scoreTeam(roster2, "launch");
  const foundStill = s2.draining_warnings.find(
    (w) => w.profile_id === "veteran" && w.sub_strength === "analysis",
  );
  assertTrue(
    !foundStill,
    "warning should clear when another member covers the sub-strength",
  );
});

// -----------------------------------------------------------------------------
// Northwind side-by-side: run the 5 seeded profiles as launch and stabilize.
// Profiles below are copied verbatim from supabase/seed/demo_data.sql — energy
// scores and competence per sub-strength — so this exercises the same data the
// UI will show once the tables ship.
// -----------------------------------------------------------------------------

type Seed = { id: string; name: string; energy: EnergyMap; competence: CompMap; lean: "direct" | "balanced" | "facilitative" };

const NORTHWIND: Seed[] = [
  {
    id: "jane",
    name: "Jane Whitfield (COO)",
    lean: "direct",
    energy: {
      ideation: 4, problem_solving: 3, analysis: 3, foresight: 4, judgment: 3,
      mobilizing: 4, communication: 4, direction: 5, connecting: 4,
      follow_through: 5, organizing: 4, ownership: 5,
      developing_others: 2, empathy: 2, building_trust: 3, including: 3,
    },
    competence: {
      ideation: 3, problem_solving: 4, analysis: 4, foresight: 5, judgment: 4,
      mobilizing: 5, communication: 4, direction: 5, connecting: 4,
      follow_through: 5, organizing: 5, ownership: 5,
      developing_others: 3, empathy: 4, building_trust: 4, including: 3,
    },
  },
  {
    id: "aiden",
    name: "Aiden Park (VP Operations)",
    lean: "direct",
    energy: {
      ideation: 5, problem_solving: 4, analysis: 3, foresight: 3, judgment: 3,
      mobilizing: 3, communication: 3, direction: 3, connecting: 3,
      follow_through: 5, organizing: 5, ownership: 4,
      developing_others: 2, empathy: 2, building_trust: 3, including: 2,
    },
    competence: {
      ideation: 3, problem_solving: 4, analysis: 4, foresight: 3, judgment: 3,
      mobilizing: 3, communication: 3, direction: 4, connecting: 3,
      follow_through: 5, organizing: 5, ownership: 4,
      developing_others: 2, empathy: 3, building_trust: 3, including: 3,
    },
  },
  {
    id: "nora",
    name: "Nora Ellison (Dir of People)",
    lean: "facilitative",
    energy: {
      ideation: 5, problem_solving: 4, analysis: 3, foresight: 3, judgment: 4,
      mobilizing: 5, communication: 5, direction: 4, connecting: 4,
      follow_through: 3, organizing: 3, ownership: 3,
      developing_others: 5, empathy: 5, building_trust: 5, including: 4,
    },
    competence: {
      ideation: 3, problem_solving: 4, analysis: 3, foresight: 4, judgment: 4,
      mobilizing: 4, communication: 5, direction: 4, connecting: 4,
      follow_through: 3, organizing: 3, ownership: 4,
      developing_others: 5, empathy: 5, building_trust: 5, including: 4,
    },
  },
  {
    id: "mateo",
    name: "Mateo Reyes (Head of Sales)",
    lean: "direct",
    energy: {
      ideation: 4, problem_solving: 3, analysis: 2, foresight: 3, judgment: 4,
      mobilizing: 5, communication: 5, direction: 4, connecting: 5,
      follow_through: 4, organizing: 4, ownership: 4,
      developing_others: 4, empathy: 4, building_trust: 5, including: 4,
    },
    competence: {
      ideation: 4, problem_solving: 3, analysis: 3, foresight: 3, judgment: 4,
      mobilizing: 5, communication: 5, direction: 4, connecting: 5,
      follow_through: 4, organizing: 3, ownership: 4,
      developing_others: 3, empathy: 4, building_trust: 4, including: 4,
    },
  },
  {
    id: "priya",
    name: "Priya Shah (Finance Lead)",
    lean: "direct",
    energy: {
      ideation: 4, problem_solving: 5, analysis: 5, foresight: 4, judgment: 5,
      mobilizing: 2, communication: 3, direction: 2, connecting: 3,
      follow_through: 4, organizing: 4, ownership: 3,
      developing_others: 3, empathy: 3, building_trust: 3, including: 2,
    },
    competence: {
      ideation: 4, problem_solving: 5, analysis: 5, foresight: 5, judgment: 5,
      mobilizing: 3, communication: 4, direction: 3, connecting: 3,
      follow_through: 5, organizing: 4, ownership: 4,
      developing_others: 3, empathy: 3, building_trust: 4, including: 3,
    },
  },
];

const northwindRoster: Member[] = NORTHWIND.map((s) =>
  member(s.id, buildProfile({ energy: s.energy, competence: s.competence, lean: s.lean })),
);
const nameOf = new Map(NORTHWIND.map((s) => [s.id, s.name]));

function summariseSignals(s: TeamSignals): string {
  const lines: string[] = [];
  lines.push(`  band: ${s.band}`);
  lines.push(`  orientation_note: ${s.orientation_note}`);
  lines.push(`  dimensions:`);
  for (const d of s.dimensions) {
    lines.push(
      `    ${d.dimension.padEnd(9)} weight ${d.mission_weight.toFixed(2)}  coverage ${d.coverage_count}  depth ${d.depth.toFixed(2)}${d.gap ? "  GAP" : ""}`,
    );
  }
  const soleHolders = s.sub_strengths.filter((x) => x.state === "sole_holder");
  const uncovered = s.sub_strengths.filter((x) => x.state === "uncovered");
  lines.push(`  sole holders (${soleHolders.length}):`);
  for (const h of soleHolders) {
    lines.push(
      `    ${h.sub_strength.padEnd(20)} → ${nameOf.get(h.holder ?? "") ?? h.holder}`,
    );
  }
  lines.push(`  uncovered (${uncovered.length}):`);
  if (uncovered.length > 0) {
    lines.push(`    ${uncovered.map((u) => u.sub_strength).join(", ")}`);
  }
  lines.push(`  duplications (${s.duplications.length}):`);
  if (s.duplications.length > 0) {
    lines.push(`    ${s.duplications.join(", ")}`);
  }
  lines.push(`  draining warnings (${s.draining_warnings.length}):`);
  for (const w of s.draining_warnings) {
    lines.push(
      `    ${nameOf.get(w.profile_id) ?? w.profile_id} on ${w.sub_strength}`,
    );
  }
  lines.push(`  overallocated (${s.overallocated.length}):`);
  return lines.join("\n");
}

// -----------------------------------------------------------------------------
// Print results
// -----------------------------------------------------------------------------

console.log("=".repeat(80));
console.log("Unit tests");
console.log("=".repeat(80));
for (const r of results) {
  const mark = r.passed ? "PASS" : "FAIL";
  console.log(`  [${mark}]  ${r.name}`);
  if (!r.passed) console.log(`         ${r.error}`);
}
const failed = results.filter((r) => !r.passed).length;
console.log(
  `\n  ${results.length - failed} passed, ${failed} failed (${results.length} total)`,
);

console.log("\n" + "=".repeat(80));
console.log("Northwind roster — 5 seeded profiles, side-by-side");
console.log("=".repeat(80));
console.log("Mission weights:");
console.log(`  launch:    ${JSON.stringify(MISSION_WEIGHTS.launch)}`);
console.log(`  stabilize: ${JSON.stringify(MISSION_WEIGHTS.stabilize)}`);

for (const missionType of ["launch", "stabilize"] as MissionType[]) {
  const s = scoreTeam(northwindRoster, missionType);
  console.log("\n" + "-".repeat(80));
  console.log(`Full 5-person roster — ${missionType.toUpperCase()}`);
  console.log("-".repeat(80));
  console.log(summariseSignals(s));
}

// -----------------------------------------------------------------------------
// Subset dry run: Jane + Aiden + Priya. This trio covers Thinking, Influence,
// and Execution strongly but has no one with Relating energy >= 4. That gap
// should barely dent a launch team (Relating weight 0.15) but should be a
// dealbreaker on a stabilize team (Relating weight 0.25).
// -----------------------------------------------------------------------------

const gapSubset = northwindRoster.filter((m) =>
  ["jane", "aiden", "priya"].includes(m.profile_id),
);

console.log("\n" + "=".repeat(80));
console.log("Subset roster — Jane + Aiden + Priya (Relating gap by design)");
console.log("=".repeat(80));

for (const missionType of ["launch", "stabilize"] as MissionType[]) {
  const s = scoreTeam(gapSubset, missionType);
  console.log("\n" + "-".repeat(80));
  console.log(`Subset — ${missionType.toUpperCase()}`);
  console.log("-".repeat(80));
  console.log(summariseSignals(s));
}

if (failed > 0) process.exit(1);
