# Team Builder — Feature Specification (addition to the main build spec)

This document extends assessment-app-build-spec.md. Everything in the main spec still applies: the voice rules, the branding system, the RLS model, the design patterns already established for authenticated pages, and the rule that Anthropic calls happen server-side only. Read the main spec first.

## What this feature is

Company admins can assemble teams from people who have completed the assessment, see a live evaluation of the mix, get recommendations, and ask the system to propose a team for a stated purpose. The framing throughout is configuration for a mission, never ranking of people. The system proposes and explains; the admin decides and confirms.

There are two modes, and they share one screen and one scoring engine.

**Build mode:** the admin composes a team by adding and removing people, and the evaluation panel re-scores live as the roster changes.

**Recommend mode:** the admin describes the team's purpose and size, optionally pins must-include people, and the system proposes a roster with a written rationale. The admin can then swap any proposed member for an alternative, and the evaluation re-scores live, so recommend mode flows into build mode rather than being separate.

## Schema

```sql
teams (
  id uuid pk default gen_random_uuid(),
  company_id uuid not null references companies(id),
  name text not null,
  mission_type text not null check (mission_type in ('launch','stabilize','turnaround','growth','general')),
  mission_notes text,                    -- optional free text from the admin
  status text not null default 'draft' check (status in ('draft','active','archived')),
  created_by uuid not null references profiles(id),
  created_at timestamptz default now()
)

team_members (
  id uuid pk default gen_random_uuid(),
  team_id uuid not null references teams(id),
  profile_id uuid not null references profiles(id),
  pinned boolean not null default false,  -- true if the admin required this person in recommend mode
  added_at timestamptz default now(),
  unique (team_id, profile_id)
)

team_evaluations (
  id uuid pk default gen_random_uuid(),
  team_id uuid not null references teams(id),
  roster_hash text not null,             -- hash of sorted member ids + mission_type, for cache invalidation
  signals jsonb not null,                -- computed scoring output, shape below
  narrative text,                        -- Claude-written rationale, cached
  model text,
  generated_at timestamptz default now()
)
```

A person can belong to multiple teams. Do not prevent it; surface it (see overallocation below).

RLS follows the existing model: company admins read and write teams in their company, system admins everywhere, team members have no access to the team builder in this version. Do not show team compositions or evaluations to team members.

## Mission types and weights

The right mix depends on what the team is for. Each mission type carries a weight profile over the four dimensions, applied in scoring. Weights are relative emphasis, not requirements.

- **launch** (new product, initiative, or market): Thinking 0.35, Influence 0.30, Execution 0.20, Relating 0.15
- **stabilize** (operations, process, reliability): Thinking 0.15, Influence 0.15, Execution 0.45, Relating 0.25
- **turnaround** (fixing something failing): Thinking 0.30, Influence 0.30, Execution 0.25, Relating 0.15
- **growth** (scaling what works): Thinking 0.20, Influence 0.30, Execution 0.30, Relating 0.20
- **general** (standing team, no dominant phase): 0.25 each

Store these in one code constant so they are easy to tune. The mission_notes free text is passed to the narrative call for context but does not affect deterministic scoring.

## Scoring engine (deterministic, server-side, no model involved)

All scoring uses the **energy** scores from each member's latest completed assessment, plus competence only for the draining check. People without a completed assessment cannot be added to a team; show them greyed out with an "awaiting assessment" note.

Compute the following signals for any roster and mission type:

1. **Arc coverage.** For each of the four dimensions, the team's coverage is the count of members with energy >= 4 on at least one sub-strength in that dimension, and the dimension's depth is the mean of each member's best energy sub-strength within it. A dimension with zero members at energy >= 4 is a gap. Weight gaps by the mission profile: a Relating gap on a stabilize team matters more than on a launch team.

2. **Sub-strength coverage map.** For each of the sixteen sub-strengths: covered (anyone >= 4), sole holder (exactly one person >= 4, flag that person), or uncovered.

3. **Duplication.** Sub-strengths where three or more members have energy >= 4. Not inherently bad, but flagged so the admin can see where the team is spending multiple people on the same strength while other teams or sub-strengths go without.

4. **Draining assignments.** Members whose likely role on this team leans on a capable-but-draining zone: competence >= 4 and energy <= 2 on a sub-strength that the mission profile weights heavily and that the team otherwise lacks. These get an explicit warning naming the person and the sub-strength, because assembling a team that structurally depends on someone's draining zone violates the regenerative principle.

5. **Orientation mix.** The spread of members' orientation leans. A team of all strongly-direct people gets a note about collaboration friction; a team of all strongly-facilitative people gets a note about decision speed. Balanced mixes pass silently.

6. **Overallocation.** Members who are already on other active teams. Flag with a count ("also on 2 other active teams"). This is a warning chip, never a block.

7. **Overall fit band.** Roll the weighted dimension coverage into one band: Strong, Workable, or Stretch. Never a percentage. The band always renders alongside its component signals, never alone.

Output shape for `team_evaluations.signals`:

```json
{
  "band": "strong | workable | stretch",
  "dimensions": [
    { "dimension": "thinking", "coverage_count": 0, "depth": 0.0, "gap": false, "mission_weight": 0.0 }
  ],
  "sub_strengths": [
    { "sub_strength": "ideation", "state": "covered | sole_holder | uncovered", "holder": "profile_id or null" }
  ],
  "duplications": ["sub_strength"],
  "draining_warnings": [ { "profile_id": "...", "sub_strength": "..." } ],
  "orientation_note": "direct_heavy | facilitative_heavy | balanced",
  "overallocated": [ { "profile_id": "...", "other_active_teams": 0 } ]
}
```

## Recommend mode logic

The candidate pool is everyone in the company with a completed assessment, minus anyone the admin excluded. Given a target size and mission type, and any pinned members:

1. Start with pinned members.
2. Greedily add the candidate whose addition most improves weighted arc coverage, breaking ties by covering uncovered sub-strengths, then by lowest overallocation, then by avoiding draining dependence.
3. Stop at target size. Do not run any heavier optimization; company sizes in this product are small and greedy selection with clear explanations beats opaque optimization.
4. Score the result with the engine above and generate the narrative.

Every recommended roster must include, in the narrative, what the team still lacks. Every real team lacks something, and stating it plainly builds trust in the recommendations.

## The narrative (Claude call)

One server-side call per evaluation, cached in team_evaluations keyed by roster_hash, regenerated only when the roster or mission changes.

Input: the computed signals, the roster with names and positions, each member's top energy sub-strengths, the mission type and mission_notes.

System prompt requirements: embed the voice rules and banned words from voice-and-tone.md; frame everything as configuration for this mission, never ranking or judgment of people; name specific people and sub-strengths; explain why each member is on the roster in one sentence each (recommend mode) or what each member most brings (build mode); state plainly what the team lacks and where its risks are, including any sole holders, draining warnings, and orientation notes; close with one or two concrete suggestions, such as a pairing, a watch-out, or where a future addition would help most; 200 to 300 words; never invent scores; contractions, no em-dashes, no jargon.

## UI

One page per team at `/admin/teams/[id]`, plus a teams list at `/admin/teams` with a create form (name, mission type, optional mission notes, mode choice). Follow the established authenticated-page pattern: gradient nav and hero, 1140px container, first card overlapping the hero, cards stacking full width unless heights are comparable.

**Layout:** two regions. The roster region shows current members as cards or rows with name, position, their top two energy sub-strengths as chips, and a remove control, plus an "add person" control opening a searchable list of eligible people showing the same chips. In recommend mode each proposed member also shows a one-line reason and a swap control; swapping opens the same eligible list, and pinned members are marked. The evaluation region shows the band, a four-dimension coverage bar group weighted-labeled by mission, warning chips (sole holders, draining, overallocation, orientation note), and the narrative.

**Live behavior:** any roster change re-runs the scoring engine immediately client-visible (the engine is cheap), and debounce the narrative regeneration behind an explicit "Update narrative" affordance or a 2-second settle, so the admin can swap freely without burning a model call per click.

**Saving:** teams save as drafts and can be marked active. Archived teams keep their last evaluation for reference.

**Framing line:** the page carries one caption, consistent with the team view: "This shows how energy configures for this mission. It's not a ranking, and the final call is yours."

## Guardrails

- Nothing on this page is visible to team members; it is admin-only in this version.
- The band never renders without its components. No percentages anywhere.
- People without completed assessments are visible but not addable, with a gentle note, so the admin sees who is missing rather than wondering.
- The system never auto-saves a recommended roster; the admin confirms every composition.
- Copy never describes a person as weak, missing, or a problem. Gaps belong to the team's configuration, not to people.
