import { NextResponse } from "next/server";
import { createServerSupabase } from "@/lib/supabase/server";
import { anthropic, ANTHROPIC_MODEL } from "@/lib/anthropic";
import { VOICE_RULES } from "@/lib/voice-rules";
import {
  recommendTeam,
  scoreTeam,
  MISSION_WEIGHTS,
  type Candidate,
  type MissionType,
  type OverallocationInput,
} from "@/lib/team-scoring";
import { SUB_STRENGTH_LABELS, type ResultsProfile } from "@/lib/types";

export const runtime = "nodejs";
export const maxDuration = 60;

const SYSTEM_PROMPT = `You write the Team Evaluation narrative for a proposed team the system is recommending for a specific mission in the AiMS Strengths Assessment app.

You receive:
- The mission type and any mission notes
- The proposed roster (people, positions, why each was picked)
- Each member's top energy sub-strengths and their orientation lean
- Precomputed team signals: overall band, per-dimension coverage with mission weights, sub-strength coverage, sole holders, duplications, draining warnings, orientation note, overallocation

Write a single team-level narrative of roughly 200 to 300 words.

Requirements:
- Frame everything as configuration for this mission, never ranking or judgment of people. Never call a person weak, missing, or a problem. Gaps belong to the team's configuration.
- Name specific people by first name and specific sub-strengths by their labels.
- Say what each member brings to this mission in one sentence each, grounded in their top energy sub-strengths.
- IMPORTANT: state plainly what this team still lacks. Every real team lacks something. Naming it plainly builds trust. Cover any sole holders, draining warnings, orientation note, or coverage gaps.
- Close with one or two concrete suggestions — a pairing, a watch-out, or where a future addition would most help.
- Never invent numeric scores. Never mention percentages.
- No headings. No bullet lists. Two to four paragraphs, natural rhythm.

${VOICE_RULES}

Return ONLY a single JSON object of shape { "narrative": string }. No prose before or after. No code fences.`;

export async function POST(request: Request) {
  const body = (await request.json()) as {
    company_id?: string;
    mission_type?: MissionType;
    mission_notes?: string | null;
    target_size?: number;
    pinned_ids?: string[];
    selected_ids?: string[];
  };

  const missionType = body.mission_type;
  const targetSize = Math.max(1, Math.min(20, body.target_size ?? 4));
  const pinnedIds = body.pinned_ids ?? [];
  const selectedIds = body.selected_ids;

  if (!missionType || !(missionType in MISSION_WEIGHTS)) {
    return NextResponse.json({ error: "Pick a mission type." }, { status: 400 });
  }

  const supabase = await createServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const { data: me } = await supabase
    .from("profiles")
    .select("role, company_id")
    .eq("id", user.id)
    .single();
  if (!me) return NextResponse.json({ error: "forbidden" }, { status: 403 });

  let companyId = body.company_id;
  if (me.role === "company_admin") companyId = me.company_id ?? undefined;
  if (me.role === "team_member" || !companyId) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  const { data: people } = await supabase
    .from("profiles")
    .select("id, first_name, last_name, position")
    .eq("company_id", companyId);

  const peopleList =
    (people ?? []) as {
      id: string;
      first_name: string;
      last_name: string;
      position: string | null;
    }[];
  const profileById = new Map(peopleList.map((p) => [p.id, p]));

  // Load the latest completed assessment per person
  const { data: assessments } = await supabase
    .from("assessments")
    .select("id, user_id, status, completed_at")
    .eq("status", "completed")
    .in(
      "user_id",
      peopleList.map((p) => p.id),
    );

  const latestByUser = new Map<string, string>();
  for (const a of assessments ?? []) {
    const uid = a.user_id as string;
    const prev = latestByUser.get(uid);
    if (
      !prev ||
      (a.completed_at &&
        new Date(a.completed_at as string).getTime() >
          new Date(prev).getTime())
    ) {
      latestByUser.set(uid, a.id as string);
    }
  }
  const assessmentIds = Array.from(latestByUser.values());
  const { data: results } = assessmentIds.length
    ? await supabase
        .from("results")
        .select("assessment_id, profile")
        .in("assessment_id", assessmentIds)
    : { data: [] as { assessment_id: string; profile: ResultsProfile }[] };

  const profileByAssessment = new Map<string, ResultsProfile>(
    (results ?? []).map((r) => [
      r.assessment_id as string,
      r.profile as ResultsProfile,
    ]),
  );

  // Overallocation
  const { data: memberships } = await supabase
    .from("team_members")
    .select("profile_id, team_id, teams!inner(status)")
    .in(
      "profile_id",
      peopleList.map((p) => p.id),
    );
  const otherActiveCount = new Map<string, number>();
  for (const row of memberships ?? []) {
    const status = (row as { teams?: { status?: string } }).teams?.status;
    if (status === "active") {
      const pid = row.profile_id as string;
      otherActiveCount.set(pid, (otherActiveCount.get(pid) ?? 0) + 1);
    }
  }

  const candidates: Candidate[] = [];
  for (const p of peopleList) {
    const aid = latestByUser.get(p.id);
    if (!aid) continue;
    const profile = profileByAssessment.get(aid);
    if (!profile) continue;
    candidates.push({
      profile_id: p.id,
      results: profile,
      other_active_teams: otherActiveCount.get(p.id) ?? 0,
    });
  }

  if (candidates.length === 0) {
    return NextResponse.json(
      { error: "No one in this company has a completed assessment yet." },
      { status: 400 },
    );
  }

  // If the caller supplied selected_ids (e.g. after a swap), score that exact
  // roster. Otherwise run greedy selection.
  let roster: { profile_id: string; pinned: boolean; reason: string }[];
  if (selectedIds && selectedIds.length > 0) {
    const pinnedSet = new Set(pinnedIds);
    roster = selectedIds
      .filter((id) => candidates.some((c) => c.profile_id === id))
      .map((id) => ({
        profile_id: id,
        pinned: pinnedSet.has(id),
        // Reason is regenerated by the incremental "why" logic. For a caller-
        // supplied roster we can't reliably reconstruct pick-order reasons,
        // so fall back to a top-energy description.
        reason: (() => {
          const c = candidates.find((x) => x.profile_id === id)!;
          const top = [...c.results.sub_strengths]
            .sort((a, b) => b.energy - a.energy)
            .slice(0, 2)
            .map((s) => SUB_STRENGTH_LABELS[s.sub_strength] ?? s.sub_strength);
          return pinnedSet.has(id)
            ? "Pinned by you."
            : `Brings ${top.join(" and ")} at high energy.`;
        })(),
      }));
  } else {
    const rec = recommendTeam(candidates, missionType, targetSize, pinnedIds);
    roster = rec.roster;
  }

  const members = roster
    .map((r) => {
      const c = candidates.find((x) => x.profile_id === r.profile_id);
      return c ? { profile_id: r.profile_id, results: c.results } : null;
    })
    .filter((m): m is { profile_id: string; results: ResultsProfile } => !!m);

  const overallocation: OverallocationInput[] = members.map((m) => ({
    profile_id: m.profile_id,
    other_active_teams:
      candidates.find((c) => c.profile_id === m.profile_id)
        ?.other_active_teams ?? 0,
  }));
  const signals = scoreTeam(members, missionType, overallocation);

  // Build LLM payload
  const rosterForModel = roster.map((r) => {
    const p = profileById.get(r.profile_id);
    const c = candidates.find((x) => x.profile_id === r.profile_id);
    const topEnergy = c
      ? [...c.results.sub_strengths]
          .sort((a, b) => b.energy - a.energy)
          .slice(0, 4)
          .map((s) => ({
            sub_strength: SUB_STRENGTH_LABELS[s.sub_strength] ?? s.sub_strength,
            energy: s.energy,
            competence: s.competence,
            flag: s.flag,
          }))
      : [];
    return {
      first_name: p?.first_name ?? "",
      last_name: p?.last_name ?? "",
      position: p?.position ?? null,
      pinned: r.pinned,
      reason: r.reason,
      orientation: c?.results.orientation.lean ?? "balanced",
      top_energy: topEnergy,
    };
  });

  const signalsForModel = {
    ...signals,
    duplications_labeled: signals.duplications.map(
      (s) => SUB_STRENGTH_LABELS[s] ?? s,
    ),
    sole_holders_named: signals.sub_strengths
      .filter((x) => x.state === "sole_holder" && x.holder)
      .map((x) => {
        const p = profileById.get(x.holder!);
        return {
          sub_strength: SUB_STRENGTH_LABELS[x.sub_strength] ?? x.sub_strength,
          person: p ? `${p.first_name} ${p.last_name}` : "",
        };
      }),
    draining_warnings_named: signals.draining_warnings.map((w) => {
      const p = profileById.get(w.profile_id);
      return {
        sub_strength: SUB_STRENGTH_LABELS[w.sub_strength] ?? w.sub_strength,
        person: p ? `${p.first_name} ${p.last_name}` : "",
      };
    }),
    uncovered_sub_strengths: signals.sub_strengths
      .filter((x) => x.state === "uncovered")
      .map((x) => SUB_STRENGTH_LABELS[x.sub_strength] ?? x.sub_strength),
  };

  const client = anthropic();
  const response = await client.messages.create({
    model: ANTHROPIC_MODEL,
    max_tokens: 2000,
    system: SYSTEM_PROMPT,
    messages: [
      {
        role: "user",
        content:
          "Proposed team data. Produce the JSON output as specified.\n\n" +
          JSON.stringify(
            {
              mission_type: missionType,
              mission_notes: body.mission_notes ?? null,
              target_size: targetSize,
              roster: rosterForModel,
              signals: signalsForModel,
            },
            null,
            2,
          ),
      },
    ],
  });

  const text = response.content
    .filter((c): c is { type: "text"; text: string } => c.type === "text")
    .map((c) => c.text)
    .join("\n")
    .trim();

  let parsed: { narrative: string };
  try {
    parsed = JSON.parse(stripFences(text));
  } catch {
    return NextResponse.json(
      { error: "model returned invalid JSON" },
      { status: 502 },
    );
  }

  return NextResponse.json({
    roster,
    signals,
    narrative: parsed.narrative,
  });
}

function stripFences(t: string) {
  return t.replace(/^```(?:json)?\s*/i, "").replace(/```\s*$/i, "").trim();
}
