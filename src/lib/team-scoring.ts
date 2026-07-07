import {
  DIMENSION_LABELS,
  SUB_STRENGTH_LABELS,
  type Dimension,
  type ResultsProfile,
} from "./types.ts";

export type MissionType =
  | "launch"
  | "stabilize"
  | "turnaround"
  | "growth"
  | "general";

export type Band = "strong" | "workable" | "stretch";
export type OrientationNote = "direct_heavy" | "facilitative_heavy" | "balanced";

// Mission weight profiles. Weights are relative emphasis, sum to 1.0.
// Kept in one code constant so they can be tuned in one place.
export const MISSION_WEIGHTS: Record<MissionType, Record<Dimension, number>> = {
  launch: { thinking: 0.35, influence: 0.30, execution: 0.20, relating: 0.15 },
  stabilize: { thinking: 0.15, influence: 0.15, execution: 0.45, relating: 0.25 },
  turnaround: { thinking: 0.30, influence: 0.30, execution: 0.25, relating: 0.15 },
  growth: { thinking: 0.20, influence: 0.30, execution: 0.30, relating: 0.20 },
  general: { thinking: 0.25, influence: 0.25, execution: 0.25, relating: 0.25 },
};

const DIMENSIONS: Dimension[] = ["thinking", "influence", "execution", "relating"];

const SUB_STRENGTHS_BY_DIMENSION: Record<Dimension, string[]> = {
  thinking: ["ideation", "problem_solving", "analysis", "foresight", "judgment"],
  influence: ["mobilizing", "communication", "direction", "connecting"],
  execution: ["follow_through", "organizing", "ownership"],
  relating: ["developing_others", "empathy", "building_trust", "including"],
};

export type Member = {
  profile_id: string;
  results: ResultsProfile;
};

export type OverallocationInput = {
  profile_id: string;
  other_active_teams: number;
};

export type DimensionSignal = {
  dimension: Dimension;
  coverage_count: number;
  depth: number;
  gap: boolean;
  mission_weight: number;
};

export type SubStrengthSignal = {
  sub_strength: string;
  state: "covered" | "sole_holder" | "uncovered";
  holder: string | null;
};

export type DrainingWarning = {
  profile_id: string;
  sub_strength: string;
};

export type OverallocatedSignal = {
  profile_id: string;
  other_active_teams: number;
};

export type TeamSignals = {
  band: Band;
  dimensions: DimensionSignal[];
  sub_strengths: SubStrengthSignal[];
  duplications: string[];
  draining_warnings: DrainingWarning[];
  orientation_note: OrientationNote;
  overallocated: OverallocatedSignal[];
};

export function scoreTeam(
  roster: Member[],
  missionType: MissionType,
  overallocation: OverallocationInput[] = [],
): TeamSignals {
  const weights = MISSION_WEIGHTS[missionType];

  // 1. Arc coverage per dimension.
  const dimensions: DimensionSignal[] = DIMENSIONS.map((dim) => {
    const coverage_count = roster.filter((m) =>
      m.results.sub_strengths.some(
        (s) => s.dimension === dim && s.energy >= 4,
      ),
    ).length;

    // Depth: mean of each member's best energy sub-strength within this dim.
    const bestEnergies = roster.map((m) => {
      const dimSubs = m.results.sub_strengths.filter((s) => s.dimension === dim);
      return dimSubs.length === 0
        ? 0
        : Math.max(...dimSubs.map((s) => s.energy));
    });
    const depth =
      bestEnergies.length === 0
        ? 0
        : bestEnergies.reduce((a, b) => a + b, 0) / bestEnergies.length;

    return {
      dimension: dim,
      coverage_count,
      depth: Number(depth.toFixed(2)),
      gap: coverage_count === 0,
      mission_weight: weights[dim],
    };
  });

  // 2. Sub-strength coverage map. Energy >= 4 counts as a holder.
  const sub_strengths: SubStrengthSignal[] = [];
  for (const dim of DIMENSIONS) {
    for (const sub of SUB_STRENGTHS_BY_DIMENSION[dim]) {
      const holders = roster.filter((m) =>
        m.results.sub_strengths.some(
          (s) => s.sub_strength === sub && s.energy >= 4,
        ),
      );
      let state: SubStrengthSignal["state"];
      let holder: string | null = null;
      if (holders.length === 0) {
        state = "uncovered";
      } else if (holders.length === 1) {
        state = "sole_holder";
        holder = holders[0].profile_id;
      } else {
        state = "covered";
      }
      sub_strengths.push({ sub_strength: sub, state, holder });
    }
  }

  // 3. Duplications: sub-strengths where 3+ members have energy >= 4.
  const duplications: string[] = [];
  for (const dim of DIMENSIONS) {
    for (const sub of SUB_STRENGTHS_BY_DIMENSION[dim]) {
      const count = roster.filter((m) =>
        m.results.sub_strengths.some(
          (s) => s.sub_strength === sub && s.energy >= 4,
        ),
      ).length;
      if (count >= 3) duplications.push(sub);
    }
  }

  // 4. Draining warnings.
  // A member is flagged when they have competence >= 4 and energy <= 2 on a
  // sub-strength that:
  //   (a) sits in one of the mission's top-2 weighted dimensions, and
  //   (b) the team otherwise lacks (no other member has energy >= 4 for it).
  const topDimSet = new Set(
    DIMENSIONS.map((d) => ({ dim: d, w: weights[d] }))
      .sort((a, b) => b.w - a.w)
      .slice(0, 2)
      .map((x) => x.dim),
  );
  const draining_warnings: DrainingWarning[] = [];
  for (const m of roster) {
    for (const s of m.results.sub_strengths) {
      if (
        s.competence >= 4 &&
        s.energy <= 2 &&
        topDimSet.has(s.dimension)
      ) {
        const othersHaveIt = roster.some(
          (m2) =>
            m2.profile_id !== m.profile_id &&
            m2.results.sub_strengths.some(
              (s2) => s2.sub_strength === s.sub_strength && s2.energy >= 4,
            ),
        );
        if (!othersHaveIt) {
          draining_warnings.push({
            profile_id: m.profile_id,
            sub_strength: s.sub_strength,
          });
        }
      }
    }
  }

  // 5. Orientation mix. 75% threshold on either extreme, else balanced.
  const total = roster.length;
  let direct = 0;
  let facilitative = 0;
  for (const m of roster) {
    const lean = m.results.orientation.lean;
    if (lean === "direct") direct++;
    else if (lean === "facilitative") facilitative++;
  }
  let orientation_note: OrientationNote = "balanced";
  if (total > 0) {
    if (direct / total >= 0.75) orientation_note = "direct_heavy";
    else if (facilitative / total >= 0.75) orientation_note = "facilitative_heavy";
  }

  // 6. Overallocation. Pass-through of input, filtered to roster members with count > 0.
  const overallocated: OverallocatedSignal[] = overallocation
    .filter(
      (o) =>
        o.other_active_teams > 0 &&
        roster.some((m) => m.profile_id === o.profile_id),
    )
    .map((o) => ({
      profile_id: o.profile_id,
      other_active_teams: o.other_active_teams,
    }));

  // 7. Overall band.
  //   weightedDepth   = Σ weight * depth      (range 0..5)
  //   gapPenalty      = Σ weight where gap    (range 0..1)
  // - gapPenalty >= 0.25 forces stretch. Threshold picked so a gap in a mission's
  //   primary or secondary weighted dimension (0.25 to 0.45) fails the team, but
  //   a gap in an under-weighted dimension (0.15 to 0.20) is only a cap on strong.
  // - Otherwise weightedDepth drives the band; any residual gap caps strong to workable.
  const weightedDepth = dimensions.reduce(
    (acc, d) => acc + d.mission_weight * d.depth,
    0,
  );
  const gapPenalty = dimensions.reduce(
    (acc, d) => acc + (d.gap ? d.mission_weight : 0),
    0,
  );
  let band: Band;
  if (roster.length === 0) {
    band = "stretch";
  } else if (gapPenalty >= 0.25) {
    band = "stretch";
  } else if (weightedDepth >= 4.0 && gapPenalty === 0) {
    band = "strong";
  } else if (weightedDepth >= 3.0) {
    band = "workable";
  } else {
    band = "stretch";
  }

  return {
    band,
    dimensions,
    sub_strengths,
    duplications,
    draining_warnings,
    orientation_note,
    overallocated,
  };
}

// -----------------------------------------------------------------------------
// Recommend mode: greedy roster selection.
// -----------------------------------------------------------------------------

export type Candidate = Member & { other_active_teams: number };

export type RecommendedPick = {
  profile_id: string;
  pinned: boolean;
  reason: string;
};

export type RecommendationResult = {
  roster: RecommendedPick[];
  signals: TeamSignals;
};

// Score improvement for a candidate: weighted depth delta.
function weightedDepthOf(
  members: Member[],
  missionType: MissionType,
): number {
  const s = scoreTeam(members, missionType);
  return s.dimensions.reduce((acc, d) => acc + d.mission_weight * d.depth, 0);
}

function uncoveredCountOf(
  members: Member[],
  missionType: MissionType,
): number {
  const s = scoreTeam(members, missionType);
  return s.sub_strengths.filter((x) => x.state === "uncovered").length;
}

function drainingCountOf(
  members: Member[],
  missionType: MissionType,
): number {
  const s = scoreTeam(members, missionType);
  return s.draining_warnings.length;
}

function reasonForPick(
  before: Member[],
  after: Member[],
  pick: Candidate,
  missionType: MissionType,
): string {
  const beforeScored = before.length > 0 ? scoreTeam(before, missionType) : null;
  const afterScored = scoreTeam(after, missionType);

  const beforeUncovered = new Set(
    beforeScored
      ? beforeScored.sub_strengths
          .filter((x) => x.state === "uncovered")
          .map((x) => x.sub_strength)
      : Object.values(SUB_STRENGTHS_BY_DIMENSION).flat(),
  );
  const nowCovered = afterScored.sub_strengths.filter(
    (x) =>
      (x.state === "covered" || x.state === "sole_holder") &&
      beforeUncovered.has(x.sub_strength),
  );

  const pickTopEnergy = [...pick.results.sub_strengths]
    .sort((a, b) => b.energy - a.energy)
    .slice(0, 2)
    .map((s) => SUB_STRENGTH_LABELS[s.sub_strength] ?? s.sub_strength);

  if (nowCovered.length > 0) {
    const newlyLabels = nowCovered
      .slice(0, 2)
      .map((c) => SUB_STRENGTH_LABELS[c.sub_strength] ?? c.sub_strength);
    return `Fills coverage on ${newlyLabels.join(" and ")}.`;
  }

  // If no new sub-strength coverage, look at whether the pick raised a
  // heavily-weighted dimension's depth by a meaningful amount.
  if (beforeScored) {
    const sortedByWeight = [...afterScored.dimensions].sort(
      (a, b) => b.mission_weight - a.mission_weight,
    );
    for (const dAfter of sortedByWeight) {
      const dBefore = beforeScored.dimensions.find(
        (x) => x.dimension === dAfter.dimension,
      );
      if (!dBefore) continue;
      if (dAfter.depth - dBefore.depth >= 0.5) {
        const dimLabel = DIMENSION_LABELS[dAfter.dimension];
        return `Deepens the ${dimLabel} side, ${pickTopEnergy.join(" and ")}.`;
      }
    }
  }

  return `Brings ${pickTopEnergy.join(" and ")} at high energy.`;
}

export function recommendTeam(
  candidates: Candidate[],
  missionType: MissionType,
  targetSize: number,
  pinnedIds: string[],
): RecommendationResult {
  const byId = new Map(candidates.map((c) => [c.profile_id, c]));
  const picked: RecommendedPick[] = [];
  const currentMembers: Member[] = [];

  // Start with pinned. If pinned > target, we still take them all — the admin
  // explicitly required them, and the greedy step will simply be a no-op.
  for (const id of pinnedIds) {
    const c = byId.get(id);
    if (!c) continue;
    picked.push({ profile_id: id, pinned: true, reason: "Pinned by you." });
    currentMembers.push({ profile_id: id, results: c.results });
  }

  const pickedIds = new Set(picked.map((p) => p.profile_id));

  while (picked.length < targetSize) {
    const remaining = candidates.filter((c) => !pickedIds.has(c.profile_id));
    if (remaining.length === 0) break;

    const baselineDepth = weightedDepthOf(currentMembers, missionType);
    const baselineDraining = drainingCountOf(currentMembers, missionType);

    let best: {
      candidate: Candidate;
      depthGain: number;
      uncoveredReduction: number;
      overallocation: number;
      drainingIntroduced: number;
    } | null = null;

    for (const cand of remaining) {
      const trial = [
        ...currentMembers,
        { profile_id: cand.profile_id, results: cand.results },
      ];
      const trialDepth = weightedDepthOf(trial, missionType);
      const beforeUncovered = uncoveredCountOf(currentMembers, missionType);
      const trialUncovered = uncoveredCountOf(trial, missionType);
      const trialDraining = drainingCountOf(trial, missionType);
      const candidate = {
        candidate: cand,
        depthGain: trialDepth - baselineDepth,
        uncoveredReduction: beforeUncovered - trialUncovered,
        overallocation: cand.other_active_teams,
        drainingIntroduced: Math.max(0, trialDraining - baselineDraining),
      };
      if (best === null) {
        best = candidate;
        continue;
      }
      // Tie-break chain per spec:
      // 1. depth gain (higher wins)
      // 2. uncovered sub-strengths reduced (higher wins)
      // 3. overallocation (lower wins)
      // 4. draining introduced (lower wins)
      if (candidate.depthGain > best.depthGain + 1e-9) {
        best = candidate;
      } else if (Math.abs(candidate.depthGain - best.depthGain) < 1e-9) {
        if (candidate.uncoveredReduction > best.uncoveredReduction) {
          best = candidate;
        } else if (candidate.uncoveredReduction === best.uncoveredReduction) {
          if (candidate.overallocation < best.overallocation) {
            best = candidate;
          } else if (candidate.overallocation === best.overallocation) {
            if (candidate.drainingIntroduced < best.drainingIntroduced) {
              best = candidate;
            }
          }
        }
      }
    }

    if (!best) break;

    const nextMembers = [
      ...currentMembers,
      { profile_id: best.candidate.profile_id, results: best.candidate.results },
    ];
    const reason = reasonForPick(
      currentMembers,
      nextMembers,
      best.candidate,
      missionType,
    );
    picked.push({
      profile_id: best.candidate.profile_id,
      pinned: false,
      reason,
    });
    currentMembers.push(nextMembers[nextMembers.length - 1]);
    pickedIds.add(best.candidate.profile_id);
  }

  const signals = scoreTeam(
    currentMembers,
    missionType,
    picked.map((p) => ({
      profile_id: p.profile_id,
      other_active_teams: byId.get(p.profile_id)?.other_active_teams ?? 0,
    })),
  );

  return { roster: picked, signals };
}
