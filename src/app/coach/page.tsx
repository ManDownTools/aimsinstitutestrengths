import { redirect } from "next/navigation";
import Link from "next/link";
import TopNav from "@/components/TopNav";
import CoachChat from "./CoachChat";
import { createServerSupabase } from "@/lib/supabase/server";

export default async function CoachPage() {
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

  if (!assessment || assessment.status !== "completed") {
    redirect("/assessment");
  }

  // Auto-create the single coaching conversation on first visit
  let { data: conversation } = await supabase
    .from("coaching_conversations")
    .select("id")
    .eq("user_id", user.id)
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();

  if (!conversation) {
    const { data: created } = await supabase
      .from("coaching_conversations")
      .insert({ user_id: user.id, title: "Coaching" })
      .select("id")
      .single();
    conversation = created;
  }

  if (!conversation) {
    throw new Error("Could not set up coaching conversation.");
  }

  const { data: history } = await supabase
    .from("coaching_messages")
    .select("role, content, created_at")
    .eq("conversation_id", conversation.id)
    .order("created_at", { ascending: true });

  return (
    <>
      <TopNav />
      <main className="container-wide" style={{ paddingTop: 32, paddingBottom: 32 }}>
        <nav className="admin-nav-bar" aria-label="Back to results">
          <Link href="/results" className="admin-nav-back">
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <line x1="19" y1="12" x2="5" y2="12" />
              <polyline points="12 19 5 12 12 5" />
            </svg>
            <span>Back to your results</span>
          </Link>
        </nav>
        <div className="stack-4">
          <div>
            <div className="subhead">Coaching</div>
            <h1 className="chartreuse-underline">Talk it through, {profile?.first_name ?? ""}</h1>
            <p className="muted">
              This chat is private to you. No admin can read it. Ask about anything in your results.
            </p>
          </div>
          <CoachChat
            conversationId={conversation.id}
            initialMessages={
              (history ?? []).map((m) => ({
                role: m.role as "assistant" | "user",
                content: m.content,
              }))
            }
          />
        </div>
      </main>
    </>
  );
}
