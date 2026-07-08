import { redirect } from "next/navigation";
import TopNav from "@/components/TopNav";
import AdminBackLink from "@/components/AdminBackLink";
import RecommendPage from "@/components/teams/RecommendPage";
import { createServerSupabase } from "@/lib/supabase/server";
import type { ResultsProfile } from "@/lib/types";

export default async function RecommendRoute() {
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
  if (me.role !== "company_admin" && me.role !== "system_admin") redirect("/");

  const { data: companies } = await supabase
    .from("companies")
    .select("id, name")
    .order("name", { ascending: true });

  const defaultCompanyId =
    me.role === "company_admin"
      ? (me.company_id ?? "")
      : (companies?.[0]?.id ?? "");

  // Load the candidate pool for the default company. If system_admin switches
  // company in the form, the client will refetch by hitting the recommend API.
  const eligible = defaultCompanyId
    ? await loadEligible(supabase, defaultCompanyId)
    : [];

  const isSystemAdmin = me.role === "system_admin";
  const defaultCompanyName =
    (companies ?? []).find((c) => c.id === defaultCompanyId)?.name ?? "";
  // Back link goes to the specific company being worked with. If a system
  // admin hasn't picked one yet, we omit the link entirely.
  const backHref = isSystemAdmin
    ? defaultCompanyId
      ? `/system/company/${defaultCompanyId}`
      : null
    : "/admin";
  const backLabel =
    isSystemAdmin && !defaultCompanyId
      ? null
      : `Back to ${defaultCompanyName || "company"}`;

  return (
    <>
      <div className="hero-shell">
        <TopNav />
        {backHref && backLabel && (
          <div className="container-wide">
            <AdminBackLink href={backHref} label={backLabel} />
          </div>
        )}
        <div className="hero-body">
          <div className="container-wide">
            <div className="eyebrow">Team builder</div>
            <h1 className="hero-title">Recommend a team</h1>
            <div className="hero-bar" aria-hidden="true" />
            <p className="hero-sub">
              Describe the mission and pick a size. The system proposes a
              roster and explains the reasoning. Nothing saves until you
              confirm. The final call is yours.
            </p>
          </div>
        </div>
      </div>
      <div className="container-wide content-shell">
        <RecommendPage
          isSystemAdmin={me.role === "system_admin"}
          defaultCompanyId={defaultCompanyId}
          companies={(companies ?? []).map((c) => ({
            id: c.id as string,
            name: c.name as string,
          }))}
          eligible={eligible}
        />
      </div>
    </>
  );
}

async function loadEligible(
  supabase: Awaited<ReturnType<typeof createServerSupabase>>,
  companyId: string,
) {
  const { data: people } = await supabase
    .from("profiles")
    .select("id, first_name, last_name, position")
    .eq("company_id", companyId)
    .order("last_name", { ascending: true });

  const list =
    (people ?? []) as {
      id: string;
      first_name: string;
      last_name: string;
      position: string | null;
    }[];

  const { data: assessments } = await supabase
    .from("assessments")
    .select("id, user_id, status, completed_at")
    .in(
      "user_id",
      list.map((p) => p.id),
    );
  const latest = new Map<string, { id: string; status: string }>();
  for (const a of assessments ?? []) {
    const uid = a.user_id as string;
    if (!latest.has(uid)) {
      latest.set(uid, { id: a.id as string, status: a.status as string });
    }
  }
  const completedIds = Array.from(latest.values())
    .filter((v) => v.status === "completed")
    .map((v) => v.id);
  const { data: results } = completedIds.length
    ? await supabase
        .from("results")
        .select("assessment_id, profile")
        .in("assessment_id", completedIds)
    : { data: [] as { assessment_id: string; profile: ResultsProfile }[] };
  const byAssess = new Map<string, ResultsProfile>(
    (results ?? []).map((r) => [
      r.assessment_id as string,
      r.profile as ResultsProfile,
    ]),
  );

  return list.map((p) => {
    const l = latest.get(p.id);
    const complete = l?.status === "completed";
    return {
      id: p.id,
      first_name: p.first_name,
      last_name: p.last_name,
      position: p.position,
      assessment_status: (l?.status ?? "not_started") as
        | "not_started"
        | "in_progress"
        | "completed",
      profile: complete && l ? (byAssess.get(l.id) ?? null) : null,
    };
  });
}
