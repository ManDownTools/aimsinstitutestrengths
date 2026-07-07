import { NextResponse } from "next/server";
import { createServerSupabase } from "@/lib/supabase/server";
import { createServiceSupabase } from "@/lib/supabase/admin";
import { anthropic, ANTHROPIC_MODEL } from "@/lib/anthropic";
import { VOICE_RULES } from "@/lib/voice-rules";
import {
  scoreTeam,
  type Member,
  type MissionType,
  type OverallocationInput,
  type TeamSignals,
} from "@/lib/team-scoring";
import { rosterHash } from "@/lib/team-labels";
import { SUB_STRENGTH_LABELS, type ResultsProfile } from "@/lib/types";

export const runtime = "nodejs";
export const maxDuration = 60;

const SYSTEM_PROMPT = `You write the Team Evaluation narrative for a team being assembled for a specific mission in the AiMS Strengths Assessment app.

You receive:
- The mission type and any mission notes
- The roster (people, positions)
- Each member's top energy sub-strengths and their orientation lean
- Precomputed team signals: overall band, per-dimension coverage with mission weights and tier strength, sub-strength coverage (each entry tagged covered_signature, covered_emerging, sole_holder, or uncovered, plus a tier of signature or emerging), sole holders, duplications, draining warnings, orientation note, overallocation

Coverage tiers matter and must be respected:
- Signature coverage means the person is competent AND has energy for it. Describe it as a strength the team can rely on now.
- Emerging coverage means the person has energy but is still developing competence. Describe it as energy the team is developing, not as proven strength. If a sub-strength this mission depends on heavily is covered only by an emerging strength, name that plainly.
- Draining zones are never coverage. Members flagged draining_warnings can do the work but it costs them, so structural reliance is a risk.

Write a single team-level narrative of roughly 200 to 300 words.

Requirements:
- Frame everything as configuration for this mission, never ranking or judgment of people. Never call a person weak, missing, or a problem. Gaps belong to the team's configuration, not to individuals.
- Name specific people by first name and specific sub-strengths by their labels.
- Say what each member most brings to this mission in one sentence each, honestly distinguishing signature strengths from emerging energy. Don't invent scores or strengths not in the input.
- State plainly what the team lacks and where its risks are, including sole holders, draining warnings, over-reliance on emerging coverage in mission-critical dimensions, and the orientation note if present.
- Close with one or two concrete suggestions, a pairing, a watch-out, or where a future addition would most help.
- Never invent numeric scores. Never mention percentages.
- No headings. No bullet lists. Two to four paragraphs, natural rhythm.

${VOICE_RULES}

Return ONLY a single JSON object of shape { "narrative": string }. No prose before or after. No code fences.`;

type Ctx = { params: Promise<{ id: string }> };

export async function POST(request: Request, { params }: Ctx) {
  const { id } = await params;
  const body = (await request.json().catch(() => ({}))) as {
    force?: boolean;
  };

  const supabase = await createServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const { data: team } = await supabase
    .from("teams")
    .select("id, company_id, mission_type, mission_notes")
    .eq("id", id)
    .single();
  if (!team) return NextResponse.json({ error: "not found" }, { status: 404 });

  const { data: members } = await supabase
    .from("team_members")
    .select("profile_id, pinned")
    .eq("team_id", id);

  if (!members || members.length === 0) {
    return NextResponse.json(
      { error: "Add at least one person before running an evaluation." },
      { status: 400 },
    );
  }

  const memberIds = members.map((m) => m.profile_id as string);

  const { data: profiles } = await supabase
    .from("profiles")
    .select("id, first_name, last_name, position")
    .in("id", memberIds);
  const profileById = new Map<
    string,
    { id: string; first_name: string; last_name: string; position: string | null }
  >(
    (profiles ?? []).map((p) => [
      p.id as string,
      p as {
        id: string;
        first_name: string;
        last_name: string;
        position: string | null;
      },
    ]),
  );

  // Latest completed assessment per member.
  const { data: assessments } = await supabase
    .from("assessments")
    .select("id, user_id, status, completed_at")
    .eq("status", "completed")
    .in("user_id", memberIds);
  const latestAssessment = new Map<string, string>();
  for (const a of assessments ?? []) {
    const existing = latestAssessment.get(a.user_id as string);
    if (
      !existing ||
      (a.completed_at &&
        new Date(a.completed_at as string).getTime() >
          new Date(existing).getTime())
    ) {
      latestAssessment.set(a.user_id as string, a.id as string);
    }
  }

  const assessmentIds = Array.from(latestAssessment.values());
  const { data: results } = await supabase
    .from("results")
    .select("assessment_id, profile")
    .in("assessment_id", assessmentIds);
  const resultsByAssessment = new Map<string, ResultsProfile>(
    (results ?? []).map((r) => [
      r.assessment_id as string,
      r.profile as ResultsProfile,
    ]),
  );

  const roster: Member[] = [];
  for (const m of members) {
    const assessId = latestAssessment.get(m.profile_id as string);
    const profile = assessId ? resultsByAssessment.get(assessId) : null;
    if (profile) {
      roster.push({ profile_id: m.profile_id as string, results: profile });
    }
  }

  if (roster.length === 0) {
    return NextResponse.json(
      { error: "Nobody on the roster has a completed assessment." },
      { status: 400 },
    );
  }

  // Overallocation: for each roster member, count other active teams they're on.
  const { data: otherMembership } = await supabase
    .from("team_members")
    .select("profile_id, team_id, teams!inner(status)")
    .in("profile_id", memberIds);
  const otherCount = new Map<string, number>();
  for (const row of otherMembership ?? []) {
    const rowTeamStatus = (row as { teams?: { status?: string } }).teams
      ?.status;
    if (rowTeamStatus === "active" && (row.team_id as string) !== id) {
      const pid = row.profile_id as string;
      otherCount.set(pid, (otherCount.get(pid) ?? 0) + 1);
    }
  }
  const overallocationInput: OverallocationInput[] = memberIds.map((pid) => ({
    profile_id: pid,
    other_active_teams: otherCount.get(pid) ?? 0,
  }));

  const missionType = team.mission_type as MissionType;
  const signals = scoreTeam(roster, missionType, overallocationInput);
  const hash = rosterHash(
    roster.map((m) => m.profile_id),
    missionType,
  );

  // Cache lookup
  const { data: cached } = await supabase
    .from("team_evaluations")
    .select("id, roster_hash, narrative, signals, model, generated_at")
    .eq("team_id", id)
    .order("generated_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (
    !body.force &&
    cached &&
    cached.roster_hash === hash &&
    cached.narrative
  ) {
    return NextResponse.json({
      cached: true,
      signals: cached.signals ?? signals,
      narrative: cached.narrative,
      roster_hash: hash,
    });
  }

  // Build LLM payload
  const rosterForModel = roster.map((m) => {
    const p = profileById.get(m.profile_id);
    const topEnergy = [...m.results.sub_strengths]
      .sort((a, b) => b.energy - a.energy)
      .slice(0, 4)
      .map((s) => ({
        sub_strength: SUB_STRENGTH_LABELS[s.sub_strength] ?? s.sub_strength,
        energy: s.energy,
        competence: s.competence,
        flag: s.flag,
      }));
    return {
      first_name: p?.first_name ?? "",
      last_name: p?.last_name ?? "",
      position: p?.position ?? null,
      orientation: m.results.orientation.lean,
      top_energy: topEnergy,
    };
  });

  const signalsForModel: TeamSignals & {
    duplications_labeled?: string[];
    sole_holders_named?: { sub_strength: string; person: string }[];
    draining_warnings_named?: { sub_strength: string; person: string }[];
  } = {
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
          "Team data. Produce the JSON output as specified.\n\n" +
          JSON.stringify(
            {
              mission_type: missionType,
              mission_notes: team.mission_notes ?? null,
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

  const admin = createServiceSupabase();
  await admin.from("team_evaluations").insert({
    team_id: id,
    roster_hash: hash,
    signals: signals,
    narrative: parsed.narrative,
    model: ANTHROPIC_MODEL,
  });

  return NextResponse.json({
    cached: false,
    signals,
    narrative: parsed.narrative,
    roster_hash: hash,
  });
}

function stripFences(t: string) {
  return t.replace(/^```(?:json)?\s*/i, "").replace(/```\s*$/i, "").trim();
}
