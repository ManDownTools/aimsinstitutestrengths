import { redirect } from "next/navigation";
import TopNav from "@/components/TopNav";
import ResultsView from "@/components/ResultsView";
import AdminNavBar from "@/components/AdminNavBar";
import { createServerSupabase } from "@/lib/supabase/server";
import type { ResultsProfile } from "@/lib/types";

export default async function SystemPersonPage({
  params,
}: {
  params: Promise<{ id: string; personId: string }>;
}) {
  const { id: companyId, personId } = await params;
  const supabase = await createServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: me } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();
  if (me?.role !== "system_admin") redirect("/");

  const { data: person } = await supabase
    .from("profiles")
    .select("first_name, last_name, position, company_id")
    .eq("id", personId)
    .single();
  if (!person) redirect("/system");

  const backCompanyId = person.company_id ?? companyId;
  const { data: company } = backCompanyId
    ? await supabase
        .from("companies")
        .select("name")
        .eq("id", backCompanyId)
        .single()
    : { data: null };

  const { data: assessment } = await supabase
    .from("assessments")
    .select("id, status")
    .eq("user_id", personId)
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
          backHref={`/system/company/${backCompanyId}`}
          companyName={company?.name ?? "the company"}
          personName={`${person.first_name} ${person.last_name}`.trim()}
          personPosition={person.position ?? null}
        />
        {!results ? (
          <div className="card">
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
