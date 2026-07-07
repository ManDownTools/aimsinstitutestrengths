import { redirect } from "next/navigation";
import TopNav from "@/components/TopNav";
import ResultsView from "@/components/ResultsView";
import CoachingSummaryCard from "@/components/CoachingSummaryCard";
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

  // Summarize the coaching thread for the dashboard banner. RLS restricts
  // coaching_conversations / coaching_messages to the owner, so admins can
  // never see this data even if they viewed a team member's results (which
  // uses ResultsView too — but /results is only ever the team member's own).
  const { data: conversation } = await supabase
    .from("coaching_conversations")
    .select("id")
    .eq("user_id", user.id)
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();

  let exchangeCount = 0;
  let lastActivity: string | null = null;
  let lastAssistantMessage: string | null = null;
  if (conversation?.id) {
    const { data: msgs } = await supabase
      .from("coaching_messages")
      .select("role, content, created_at")
      .eq("conversation_id", conversation.id)
      .order("created_at", { ascending: true });
    const list = msgs ?? [];
    exchangeCount = list.filter((m) => m.role === "user").length;
    const lastMsg = list.at(-1);
    lastActivity = (lastMsg?.created_at as string | null) ?? null;
    const lastAssistant = [...list]
      .reverse()
      .find((m) => m.role === "assistant");
    lastAssistantMessage =
      (lastAssistant?.content as string | null) ?? null;
  }

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
            showCoachingLink={false}
            banner={
              <CoachingSummaryCard
                firstName={profile?.first_name ?? ""}
                summary={{
                  hasConversation: !!conversation,
                  exchangeCount,
                  lastActivity,
                  lastAssistantMessage,
                }}
              />
            }
          />
        )}
      </main>
    </>
  );
}
