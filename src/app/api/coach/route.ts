import { NextResponse } from "next/server";
import { createServerSupabase } from "@/lib/supabase/server";
import { anthropic, ANTHROPIC_MODEL } from "@/lib/anthropic";
import { VOICE_RULES } from "@/lib/voice-rules";
import { tenurePhrase } from "@/lib/tenure";

export const runtime = "nodejs";
export const maxDuration = 60;

function buildSystemPrompt(context: {
  first_name?: string;
  position?: string | null;
  tenure?: string | null;
  results_profile: unknown;
  results_summary: string;
  narrative_transcript: string;
}) {
  return `You are a strengths coach working within the AiMS approach.

You're talking with ${context.first_name ?? "the person"}${context.position ? `, whose current position is ${context.position}` : ""}${context.tenure ? `, ${context.tenure}` : ""}. Ground everything in their actual results, which are attached below. Never invent scores or strengths they don't have.

Coaching stance:
- Lead with questions more than answers. Inquiry creates movement.
- Focus on what's working and what's possible, not fixing deficits.
- Treat capable-but-draining areas with care. The goal is configuring their energy, not pushing through.
- Where their story and their scores diverge, that's the interesting territory. Explore it, don't resolve it too quickly.
- Keep responses conversational in length, not essays. Two to five sentences is often right.
- You may reference their narrative story if one exists. You may not reveal internal scoring numbers unprompted, but you can name the shape of what you're seeing (for example, "a signature strength" or "capable but draining").
- Don't repeat their results back to them like a report. Talk to them.

Voice for questions and invitations:
- Always be generative and inviting, never confrontational. Open doors rather than push through them.
- When you invite the person to share what's next, do it warmly and forward-facing: "What's alive for you here?", "Where would you like to start?", "What's calling for your attention right now?", "Which of these threads is most useful to pull on?"
- Never phrase an invitation as a preference against what you were doing. Do not say things like "I'd rather hear X than keep doing Y", "instead of unpacking more", or "rather than analyzing further". Those framings sound like you're closing something down. Just open the next door.
- When your reflection has landed and it's time to hand the turn back, one warm forward-facing question is enough. No apology, no critique of the exchange so far.

Their profile (structured):
${JSON.stringify(context.results_profile)}

Their written summary:
${context.results_summary}

Their best-self narrative transcript (may be empty or marked skipped):
${context.narrative_transcript}

${VOICE_RULES}`;
}

export async function POST(request: Request) {
  const { conversation_id, message } = await request.json();
  if (!conversation_id || typeof message !== "string" || !message.trim()) {
    return NextResponse.json({ error: "bad request" }, { status: 400 });
  }

  const supabase = await createServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const { data: conv } = await supabase
    .from("coaching_conversations")
    .select("id, user_id")
    .eq("id", conversation_id)
    .single();
  if (!conv || conv.user_id !== user.id) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("first_name, position, position_start_date")
    .eq("id", user.id)
    .single();

  // Load latest completed assessment + results + narrative for context
  const { data: assessment } = await supabase
    .from("assessments")
    .select("id, status")
    .eq("user_id", user.id)
    .eq("status", "completed")
    .order("version", { ascending: false })
    .limit(1)
    .single();
  if (!assessment) {
    return NextResponse.json(
      { error: "no completed assessment" },
      { status: 400 },
    );
  }
  const { data: results } = await supabase
    .from("results")
    .select("profile, summary")
    .eq("assessment_id", assessment.id)
    .single();

  const { data: narrative } = await supabase
    .from("narrative_messages")
    .select("role, content")
    .eq("assessment_id", assessment.id)
    .order("created_at", { ascending: true });

  const { data: history } = await supabase
    .from("coaching_messages")
    .select("role, content")
    .eq("conversation_id", conversation_id)
    .order("created_at", { ascending: true });

  // Persist the user message first
  await supabase.from("coaching_messages").insert({
    conversation_id,
    role: "user",
    content: message,
  });

  const systemPrompt = buildSystemPrompt({
    first_name: profile?.first_name,
    position: profile?.position,
    tenure: tenurePhrase(profile?.position_start_date),
    results_profile: results?.profile ?? {},
    results_summary: results?.summary ?? "",
    narrative_transcript:
      narrative
        ?.map((m) => `${m.role.toUpperCase()}: ${m.content}`)
        .join("\n") ?? "",
  });

  const messages = [
    ...(history ?? []).map((m) => ({
      role: m.role === "assistant" ? ("assistant" as const) : ("user" as const),
      content: m.content,
    })),
    { role: "user" as const, content: message },
  ];

  const client = anthropic();
  const response = await client.messages.create({
    model: ANTHROPIC_MODEL,
    max_tokens: 800,
    system: systemPrompt,
    messages,
  });

  const reply = response.content
    .filter((c): c is { type: "text"; text: string } => c.type === "text")
    .map((c) => c.text)
    .join("\n")
    .trim();

  await supabase.from("coaching_messages").insert({
    conversation_id,
    role: "assistant",
    content: reply,
  });

  return NextResponse.json({ reply });
}
