import { redirect } from "next/navigation";
import TopNav from "@/components/TopNav";
import { createServerSupabase } from "@/lib/supabase/server";
import AssessmentFlow from "./AssessmentFlow";
import type { Item } from "@/lib/types";

export default async function AssessmentPage() {
  const supabase = await createServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("first_name, position, company_id")
    .eq("id", user.id)
    .single();
  if (!profile?.company_id) redirect("/welcome");

  const { data: assessment } = await supabase
    .from("assessments")
    .select("id, status")
    .eq("user_id", user.id)
    .maybeSingle();
  if (!assessment) redirect("/welcome");
  if (assessment.status === "completed") redirect("/results");

  const { data: items } = await supabase
    .from("items")
    .select("*")
    .order("sort_order", { ascending: true });

  const { data: responses } = await supabase
    .from("responses")
    .select("item_id, value")
    .eq("assessment_id", assessment.id);

  const { data: narrative } = await supabase
    .from("narrative_messages")
    .select("role, content, created_at")
    .eq("assessment_id", assessment.id)
    .order("created_at", { ascending: true });

  return (
    <>
      <TopNav />
      <main>
        <AssessmentFlow
          assessmentId={assessment.id}
          items={(items ?? []) as Item[]}
          existingResponses={responses ?? []}
          existingNarrative={narrative ?? []}
          firstName={profile.first_name}
        />
      </main>
    </>
  );
}
