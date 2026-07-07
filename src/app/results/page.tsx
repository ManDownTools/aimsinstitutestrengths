import { redirect } from "next/navigation";
import TopNav from "@/components/TopNav";
import ResultsView from "@/components/ResultsView";
import GenerateResultsIfMissing from "./GenerateResultsIfMissing";
import { createServerSupabase } from "@/lib/supabase/server";
import type { ResultsProfile } from "@/lib/types";

export default async function ResultsPage() {
  const supabase = await createServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("first_name")
    .eq("id", user.id)
    .single();

  const { data: assessment } = await supabase
    .from("assessments")
    .select("id, status")
    .eq("user_id", user.id)
    .order("version", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!assessment) redirect("/welcome");
  if (assessment.status !== "completed") redirect("/assessment");

  const { data: results } = await supabase
    .from("results")
    .select("profile, summary")
    .eq("assessment_id", assessment.id)
    .maybeSingle();

  return (
    <>
      <TopNav />
      <main className="container">
        {!results ? (
          <GenerateResultsIfMissing assessmentId={assessment.id} />
        ) : (
          <ResultsView
            firstName={profile?.first_name ?? ""}
            results={{
              profile: results.profile as ResultsProfile,
              summary: results.summary,
            }}
            showCoachingLink
          />
        )}
      </main>
    </>
  );
}
