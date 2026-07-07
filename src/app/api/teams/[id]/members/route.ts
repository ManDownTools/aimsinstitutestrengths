import { NextResponse } from "next/server";
import { createServerSupabase } from "@/lib/supabase/server";

export const runtime = "nodejs";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const { profile_id, pinned } = (await request.json()) as {
    profile_id?: string;
    pinned?: boolean;
  };
  if (!profile_id) {
    return NextResponse.json({ error: "profile_id required" }, { status: 400 });
  }

  const supabase = await createServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  // The member being added must be in the same company as the team.
  // Enforced via RLS on both teams and profiles, plus a defensive check here.
  const { data: team } = await supabase
    .from("teams")
    .select("company_id")
    .eq("id", id)
    .single();
  if (!team) return NextResponse.json({ error: "not found" }, { status: 404 });

  const { data: profile } = await supabase
    .from("profiles")
    .select("company_id")
    .eq("id", profile_id)
    .single();
  if (!profile || profile.company_id !== team.company_id) {
    return NextResponse.json(
      { error: "Person is not in this company." },
      { status: 400 },
    );
  }

  const { error } = await supabase
    .from("team_members")
    .insert({
      team_id: id,
      profile_id,
      pinned: pinned ?? false,
    });

  if (error) {
    // Unique violation = already on the team, treat as success.
    if (error.code === "23505") {
      return NextResponse.json({ ok: true, already: true });
    }
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const { profile_id } = (await request.json()) as { profile_id?: string };
  if (!profile_id) {
    return NextResponse.json({ error: "profile_id required" }, { status: 400 });
  }

  const supabase = await createServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const { error } = await supabase
    .from("team_members")
    .delete()
    .eq("team_id", id)
    .eq("profile_id", profile_id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
