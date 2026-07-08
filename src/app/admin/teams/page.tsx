import { redirect } from "next/navigation";
import Link from "next/link";
import TopNav from "@/components/TopNav";
import AdminBackLink from "@/components/AdminBackLink";
import CreateTeamForm from "@/components/teams/CreateTeamForm";
import { createServerSupabase } from "@/lib/supabase/server";
import { MISSION_LABELS } from "@/lib/team-labels";
import type { MissionType } from "@/lib/team-scoring";

type TeamRow = {
  id: string;
  name: string;
  mission_type: MissionType;
  status: "draft" | "active" | "archived";
  company_id: string;
  created_at: string;
};

export default async function TeamsListPage() {
  const supabase = await createServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: me } = await supabase
    .from("profiles")
    .select("role, company_id")
    .eq("id", user.id)
    .single();
  if (!me) redirect("/");
  if (me.role !== "company_admin" && me.role !== "system_admin") {
    redirect("/");
  }

  const { data: teams } = await supabase
    .from("teams")
    .select("id, name, mission_type, status, company_id, created_at")
    .order("created_at", { ascending: false });

  const teamRows = (teams ?? []) as TeamRow[];

  // Company info for system admin (badge on each team) and for the create form.
  const { data: companies } = await supabase
    .from("companies")
    .select("id, name")
    .order("name", { ascending: true });
  const companyById = new Map(
    (companies ?? []).map((c) => [c.id as string, c.name as string]),
  );

  const isSystemAdmin = me.role === "system_admin";

  // Back link destination:
  //  - company admin → their /admin company overview
  //  - system admin → the cross-company Companies list at /system
  const myCompanyName = me.company_id
    ? companyById.get(me.company_id) ?? ""
    : "";
  const backHref = isSystemAdmin ? "/system" : "/admin";
  const backLabel = isSystemAdmin
    ? "Back to Companies"
    : `Back to ${myCompanyName || "company"}`;

  return (
    <>
      <div className="hero-shell">
        <TopNav />
        <div className="container-wide">
          <AdminBackLink href={backHref} label={backLabel} />
        </div>
        <div className="hero-body">
          <div className="container-wide">
            <div className="eyebrow">Team builder</div>
            <h1 className="hero-title">Teams</h1>
            <div className="hero-bar" aria-hidden="true" />
            <p className="hero-sub">
              Assemble a team for a mission. This shows how energy configures
              for that mission. It's not a ranking, and the final call is
              yours.
            </p>
          </div>
        </div>
      </div>
      <div className="container-wide content-shell">
        <div className="stack-5">
          <section className="card">
            <div className="card-header">
              <h2>Your teams</h2>
              <div className="row" style={{ gap: 8 }}>
                <Link
                  href="/admin/teams/recommend"
                  className="btn btn-ghost sm"
                >
                  Recommend a team
                </Link>
                <span className="caption">
                  {teamRows.length} {teamRows.length === 1 ? "team" : "teams"}
                </span>
              </div>
            </div>
            {teamRows.length === 0 ? (
              <p className="muted" style={{ margin: 0 }}>
                No teams yet. Create one below and start composing.
              </p>
            ) : (
              <table className="table">
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>Mission</th>
                    <th>Status</th>
                    {isSystemAdmin && <th>Company</th>}
                    <th className="action-cell"></th>
                  </tr>
                </thead>
                <tbody>
                  {teamRows.map((t) => (
                    <tr key={t.id}>
                      <td>
                        <Link href={`/admin/teams/${t.id}`}>{t.name}</Link>
                      </td>
                      <td className="muted">
                        {MISSION_LABELS[t.mission_type] ?? t.mission_type}
                      </td>
                      <td>
                        <span
                          className={`chip ${
                            t.status === "active"
                              ? "chip-primary"
                              : t.status === "draft"
                                ? "chip-sky"
                                : "chip-muted"
                          }`}
                        >
                          {t.status[0].toUpperCase() + t.status.slice(1)}
                        </span>
                      </td>
                      {isSystemAdmin && (
                        <td className="muted">
                          {companyById.get(t.company_id) ?? ""}
                        </td>
                      )}
                      <td className="action-cell">
                        <Link
                          href={`/admin/teams/${t.id}`}
                          className="btn btn-ghost sm"
                        >
                          Open
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </section>

          <section className="card">
            <div className="card-header">
              <h2>Create a team</h2>
            </div>
            <CreateTeamForm
              lockedCompanyId={
                me.role === "company_admin" ? me.company_id : null
              }
              companies={
                isSystemAdmin
                  ? (companies ?? []).map((c) => ({
                      id: c.id as string,
                      name: c.name as string,
                    }))
                  : []
              }
            />
          </section>
        </div>
      </div>
    </>
  );
}
