import { redirect } from "next/navigation";
import { createServerSupabase } from "@/lib/supabase/server";

export default async function Home() {
  const supabase = await createServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("role, invite_status")
    .eq("id", user.id)
    .single();

  if (!profile) {
    redirect("/login");
  }

  if (profile.invite_status === "invited") {
    redirect("/set-password");
  }

  if (profile.role === "system_admin") {
    redirect("/system");
  }
  if (profile.role === "company_admin") {
    redirect("/admin");
  }

  // Team member: send to welcome/assessment/results depending on state.
  const { data: assessment } = await supabase
    .from("assessments")
    .select("id, status")
    .eq("user_id", user.id)
    .order("version", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!assessment) {
    redirect("/welcome");
  }
  if (assessment.status === "completed") {
    redirect("/results");
  }
  redirect("/assessment");
}
