import { redirect } from "next/navigation";
import TopNav from "@/components/TopNav";
import ResultsView from "@/components/ResultsView";
import AdminNavBar from "@/components/AdminNavBar";
import { createServerSupabase } from "@/lib/supabase/server";
import type { ResultsProfile } from "@/lib/types";

export default async function PersonPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
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
  if (!me || (me.role !== "company_admin" && me.role !== "system_admin")) {
    redirect("/");
  }

  const { data: person } = await supabase
    .from("profiles")
    .select("first_name, last_name, position, company_id")
    .eq("id", id)
    .single();
  if (!person) redirect("/admin");
  if (
    me.role === "company_admin" &&
    person.company_id !== me.company_id
  ) {
    redirect("/admin");
  }

  const { data: company } = person.company_id
    ? await supabase
        .from("companies")
        .select("name")
        .eq("id", person.company_id)
        .single()
    : { data: null };

  const backHref =
    me.role === "system_admin"
      ? `/system/company/${person.company_id}`
      : "/admin";

  const { data: assessment } = await supabase
    .from("assessments")
    .select("id, status")
    .eq("user_id", id)
    .order("version", { ascending: false })
    .limit(1)
    .maybeSingle();

  const results = assessment?.id
    ? (
        await supabase
          .from("results")
          .select("profile, summary")
          .eq("assessment_id", assessment.id)
          .maybeSingle()
      ).data
    : null;

  return (
    <>
      <TopNav />
      <main className="container">
        <AdminNavBar
          backHref={backHref}
          companyName={company?.name ?? "the company"}
          personName={`${person.first_name} ${person.last_name}`.trim()}
          personPosition={person.position ?? null}
        />
        {!results ? (
          <div className="card stack-2">
            <div className="subhead">No results yet</div>
            <p>
              {person.first_name} {person.last_name} hasn't completed the assessment.
            </p>
          </div>
        ) : (
          <ResultsView
            firstName={`${person.first_name} ${person.last_name}`}
            results={{
              profile: results.profile as ResultsProfile,
              summary: results.summary,
            }}
            showCoachingLink={false}
          />
        )}
      </main>
    </>
  );
}
