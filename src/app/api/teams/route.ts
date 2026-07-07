import { NextResponse } from "next/server";
import { createServerSupabase } from "@/lib/supabase/server";
import type { MissionType } from "@/lib/team-scoring";

export const runtime = "nodejs";

const MISSION_TYPES: MissionType[] = [
  "launch",
  "stabilize",
  "turnaround",
  "growth",
  "general",
];

export async function POST(request: Request) {
  const body = await request.json();
  const { name, mission_type, mission_notes, company_id } = body as {
    name?: string;
    mission_type?: string;
    mission_notes?: string | null;
    company_id?: string;
  };

  if (!name?.trim()) {
    return NextResponse.json({ error: "Name is required." }, { status: 400 });
  }
  if (!mission_type || !MISSION_TYPES.includes(mission_type as MissionType)) {
    return NextResponse.json(
      { error: "Pick a mission type." },
      { status: 400 },
    );
  }

  const supabase = await createServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const { data: me } = await supabase
    .from("profiles")
    .select("role, company_id")
    .eq("id", user.id)
    .single();
  if (!me) return NextResponse.json({ error: "forbidden" }, { status: 403 });

  let targetCompany = company_id;
  if (me.role === "company_admin") {
    if (!me.company_id) {
      return NextResponse.json({ error: "no company" }, { status: 403 });
    }
    targetCompany = me.company_id;
  } else if (me.role === "system_admin") {
    if (!targetCompany) {
      return NextResponse.json(
        { error: "Pick a company for this team." },
        { status: 400 },
      );
    }
  } else {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  const { data: inserted, error } = await supabase
    .from("teams")
    .insert({
      name: name.trim(),
      mission_type,
      mission_notes: mission_notes?.trim() || null,
      company_id: targetCompany,
      created_by: user.id,
      status: "draft",
    })
    .select("id")
    .single();

  if (error || !inserted) {
    return NextResponse.json(
      { error: error?.message ?? "Couldn't create team." },
      { status: 500 },
    );
  }

  return NextResponse.json({ id: inserted.id });
}
