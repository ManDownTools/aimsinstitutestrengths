"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createBrowserSupabase } from "@/lib/supabase/client";

export default function StartAssessmentButton({
  userId,
  companyId,
}: {
  userId: string;
  companyId: string | null;
}) {
  const router = useRouter();
  const [starting, setStarting] = useState(false);

  async function start() {
    if (!companyId) {
      alert("Your profile isn't fully set up yet. Reach out to your admin.");
      return;
    }
    setStarting(true);
    const supabase = createBrowserSupabase();
    const { error } = await supabase
      .from("assessments")
      .insert({ user_id: userId, company_id: companyId, version: 1 });
    if (error && !/duplicate/i.test(error.message)) {
      setStarting(false);
      alert("Couldn't start. Try refreshing.");
      return;
    }
    router.push("/assessment");
  }

  return (
    <button
      className="btn btn-primary lg"
      onClick={start}
      disabled={starting}
      style={{ alignSelf: "flex-start" }}
    >
      {starting ? "Getting things ready..." : "Start the assessment"}
    </button>
  );
}
