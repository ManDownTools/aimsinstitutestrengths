import Link from "next/link";
import InviteForm from "./InviteForm";
import ResendInviteButton from "./ResendInviteButton";
import DeletePersonButton from "./DeletePersonButton";
import CompanyStructure from "./CompanyStructure";
import EditProfileButton from "./EditProfileButton";
import GenerateTeamInsightsIfMissing from "./GenerateTeamInsightsIfMissing";
import TeamGrid from "./TeamGrid";
import {
  DIMENSION_LABELS,
  SUB_STRENGTH_LABELS,
  type Dimension,
  type ResultsProfile,
} from "@/lib/types";
import { createServerSupabase } from "@/lib/supabase/server";
import { computeTeamSignals, type TeamMember } from "@/lib/team-signals";

type Row = {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  position: string | null;
  reports_to: string | null;
  invite_status: string;
  role: string;
  assessment?: {
    id: string;
    completed_at: string | null;
    status: string;
  };
  results_profile?: ResultsProfile | null;
};

export default async function AdminDashboard({
  companyId,
  callerRole,
  allowCompanyAdmin,
  allowSystemAdmin,
}: {
  companyId: string;
  companyName: string;
  callerRole: "company_admin" | "system_admin";
  allowCompanyAdmin: boolean;
  allowSystemAdmin: boolean;
}) {
  const supabase = await createServerSupabase();
  const {
    data: { user: currentUser },
  } = await supabase.auth.getUser();
  const callerId = currentUser?.id ?? null;

  const { data: people } = await supabase
    .from("profiles")
    .select(
      "id, first_name, last_name, email, position, reports_to, invite_status, role",
    )
    .eq("company_id", companyId)
    .order("last_name", { ascending: true });

  const peopleList = (people ?? []) as Row[];

  // Load one latest assessment per person (simple N+1, small dataset)
  await Promise.all(
    peopleList.map(async (p) => {
      const { data: a } = await supabase
        .from("assessments")
        .select("id, status, completed_at")
        .eq("user_id", p.id)
        .order("version", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (a) {
        p.assessment = a;
        if (a.status === "completed") {
          const { data: r } = await supabase
            .from("results")
            .select("profile")
            .eq("assessment_id", a.id)
            .maybeSingle();
          p.results_profile = (r?.profile as ResultsProfile | undefined) ?? null;
        }
      }
    }),
  );

  const teamForSignals: TeamMember[] = peopleList
    .filter((p) => p.results_profile)
    .map((p) => ({
      id: p.id,
      first_name: p.first_name,
      last_name: p.last_name,
      position: p.position,
      reports_to: p.reports_to,
      profile: p.results_profile as ResultsProfile,
    }));

  const signals =
    teamForSignals.length > 0 ? computeTeamSignals(teamForSignals) : null;

  const sourceMaxCompletedAt =
    peopleList
      .map((p) => p.assessment?.completed_at ?? null)
      .filter((t): t is string => !!t)
      .sort()
      .reverse()[0] ?? null;

  const { data: cachedInsight } = await supabase
    .from("team_insights")
    .select("narrative, source_max_completed_at, generated_at")
    .eq("company_id", companyId)
    .maybeSingle();

  const insightIsFresh =
    !!cachedInsight &&
    !!sourceMaxCompletedAt &&
    !!cachedInsight.source_max_completed_at &&
    new Date(cachedInsight.source_max_completed_at).getTime() ===
      new Date(sourceMaxCompletedAt).getTime();

  const reportsToOptions = peopleList
    .filter((p) => p.invite_status === "active")
    .map((p) => ({
      id: p.id,
      label: `${p.first_name} ${p.last_name}${p.position ? ` — ${p.position}` : ""}`,
    }));

  const activeCount = peopleList.filter((p) => p.invite_status === "active").length;
  const completedCount = peopleList.filter(
    (p) => p.assessment?.status === "completed",
  ).length;

  return (
    <div className="stack-5">
      <section className="card">
        <div className="card-header">
          <h2>People</h2>
          <span className="caption tabular">
            {peopleList.length}{" "}
            {peopleList.length === 1 ? "person" : "people"} · {completedCount} completed
          </span>
        </div>
        {peopleList.length === 0 ? (
          <div
            className="muted"
            style={{ textAlign: "center", padding: "40px 0" }}
          >
            Nobody here yet. Invite your first person below and their
            assessment will appear here.
          </div>
        ) : (
            <table className="table">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Position</th>
                  <th>Role</th>
                  <th>Status</th>
                  <th>Assessment</th>
                  <th className="action-cell"></th>
                </tr>
              </thead>
              <tbody>
                {peopleList.map((p) => {
                  const status = p.assessment?.status;
                  const personLink =
                    callerRole === "system_admin"
                      ? `/system/company/${companyId}/person/${p.id}`
                      : `/admin/person/${p.id}`;
                  return (
                    <tr key={p.id}>
                      <td>
                        <Link href={personLink}>
                          {p.first_name} {p.last_name}
                        </Link>
                      </td>
                      <td className="muted">{p.position ?? ""}</td>
                      <td className="muted">
                        {p.role === "company_admin" ? "Admin" : "Team member"}
                      </td>
                      <td>
                        <span
                          className={`chip ${p.invite_status === "active" ? "chip-success" : "chip-muted"}`}
                        >
                          {p.invite_status === "active" ? "Active" : "Invited"}
                        </span>
                      </td>
                      <td>
                        <span
                          className={`chip ${
                            status === "completed"
                              ? "chip-primary"
                              : status === "in_progress"
                                ? "chip-sky"
                                : "chip-muted"
                          }`}
                        >
                          {status === "completed"
                            ? "Completed"
                            : status === "in_progress"
                              ? "In progress"
                              : "Not started"}
                        </span>
                      </td>
                      <td className="action-cell">
                        <div className="row" style={{ justifyContent: "flex-end", gap: 4 }}>
                          {p.invite_status === "invited" && (
                            <ResendInviteButton profileId={p.id} />
                          )}
                          <EditProfileButton personId={p.id} />
                          <Link
                            href={personLink}
                            className="btn btn-ghost sm"
                          >
                            Open
                          </Link>
                          {p.id !== callerId && p.role !== "system_admin" && (
                            <DeletePersonButton
                              profileId={p.id}
                              personName={`${p.first_name} ${p.last_name}`.trim()}
                            />
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </section>

      <CompanyStructure
        people={peopleList.map((p) => ({
          id: p.id,
          first_name: p.first_name,
          last_name: p.last_name,
          position: p.position,
          reports_to: p.reports_to,
          results_profile: p.results_profile ?? null,
        }))}
        personLinkPrefix={
          callerRole === "system_admin"
            ? `/system/company/${companyId}/person`
            : "/admin/person"
        }
      />

      {signals && signals.roster_size > 0 && (
        insightIsFresh && cachedInsight ? (
          <TeamInsightsSection
            narrative={cachedInsight.narrative as string}
            signals={signals}
            names={peopleList.flatMap((p) => {
              const full = `${p.first_name} ${p.last_name}`.trim();
              return full === p.first_name ? [p.first_name] : [full, p.first_name];
            })}
          />
        ) : (
          <GenerateTeamInsightsIfMissing companyId={companyId} />
        )
      )}

      <section className="card">
        <div className="card-header">
          <h2>Team view</h2>
          <span className="caption">
            {activeCount} active · {completedCount} with results
          </span>
        </div>
        <p className="muted" style={{ margin: 0, marginBottom: 16 }}>
          Where the team's energy sits across sub-strengths. This is here to help
          configure strengths into coordinated action, not to rank people.
        </p>
        <TeamGrid people={peopleList} />
      </section>

      <section className="card">
        <div className="card-header">
          <h2>Invite someone</h2>
        </div>
        <InviteForm
          companyId={companyId}
          companyLocked={true}
          reportsToOptions={reportsToOptions}
          allowSystemAdmin={allowSystemAdmin}
          allowCompanyAdmin={allowCompanyAdmin}
        />
      </section>
    </div>
  );
}

function TeamInsightsSection({
  narrative,
  signals,
  names,
}: {
  narrative: string;
  signals: ReturnType<typeof computeTeamSignals>;
  names: string[];
}) {
  const paragraphs = narrative
    .replace(/\\n/g, "\n")
    .split(/\n+/)
    .map((p) => p.trim())
    .filter(Boolean);

  const highlights = Array.from(
    new Set([
      ...names,
      ...Object.values(SUB_STRENGTH_LABELS),
      ...Object.values(DIMENSION_LABELS),
    ]),
  ).filter(Boolean);

  return (
    <section className="card stack-3">
      <div className="card-header">
        <h2>Team insights</h2>
        <span className="caption">
          {signals.roster_size} {signals.roster_size === 1 ? "profile" : "profiles"}
        </span>
      </div>
      <p className="muted" style={{ margin: 0 }}>
        Insights describe energy configuration, not performance.
      </p>
      <div style={{ lineHeight: 1.7 }}>
        {paragraphs.map((p, i) => (
          <p key={i} style={{ margin: i === 0 ? 0 : "1.5em 0 0" }}>
            {boldMatches(p, highlights)}
          </p>
        ))}
      </div>
      {(signals.sole_holders.length > 0 || signals.energy_gaps.length > 0) && (
        <div className="stack-3" style={{ marginTop: "var(--space-5)" }}>
          {signals.sole_holders.length > 0 && (
            <div className="stack-2">
              <div className="subhead">Held by only one person</div>
              <p className="caption" style={{ margin: 0 }}>
                Only one person on the team has high energy for this. Worth
                naming who backs them up.
              </p>
              <div className="row-wrap">
                {signals.sole_holders.map((h) => (
                  <span
                    key={`sole-${h.sub_strength}-${h.person.id}`}
                    className="chip chip-warning"
                    title="Only one person on the team has high energy here."
                  >
                    {h.person.first_name} · {SUB_STRENGTH_LABELS[h.sub_strength] ?? h.sub_strength}
                  </span>
                ))}
              </div>
            </div>
          )}
          {signals.energy_gaps.length > 0 && (
            <div className="stack-2">
              <div className="subhead">Capable but draining</div>
              <p className="caption" style={{ margin: 0 }}>
                Strong competence, low energy. They can do it, but the
                assessment says it costs them.
              </p>
              <div className="row-wrap">
                {signals.energy_gaps.map((g) => (
                  <span
                    key={`gap-${g.sub_strength}-${g.person.id}`}
                    className="chip chip-sky"
                    title={`Competence ${g.competence} · Energy ${g.energy}`}
                  >
                    {g.person.first_name} · {SUB_STRENGTH_LABELS[g.sub_strength] ?? g.sub_strength}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </section>
  );
}

// Wraps every occurrence of a known name / sub-strength / dimension label in
// <strong>. Match is case-insensitive but the original casing is preserved.
// Longer keywords match first so "Nora Ellison" wins over "Nora".
function boldMatches(text: string, keywords: string[]): React.ReactNode[] {
  const cleaned = keywords.filter((k) => k && k.trim().length > 0);
  if (cleaned.length === 0) return [text];
  const escaped = cleaned
    .slice()
    .sort((a, b) => b.length - a.length)
    .map((k) => k.replace(/[-\\/\\^$*+?.()|[\]{}]/g, "\\$&"));
  const re = new RegExp(`(${escaped.join("|")})`, "gi");
  const parts = text.split(re);
  return parts.map((part, i) =>
    i % 2 === 1 ? <strong key={i}>{part}</strong> : part,
  );
}
