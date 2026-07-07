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
const STATUSES = ["draft", "active", "archived"] as const;

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const body = (await request.json()) as {
    name?: string;
    mission_type?: string;
    mission_notes?: string | null;
    status?: string;
  };

  const supabase = await createServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const update: Record<string, unknown> = {};
  if (body.name !== undefined) {
    if (!body.name.trim()) {
      return NextResponse.json({ error: "Name can't be empty." }, { status: 400 });
    }
    update.name = body.name.trim();
  }
  if (body.mission_type !== undefined) {
    if (!MISSION_TYPES.includes(body.mission_type as MissionType)) {
      return NextResponse.json({ error: "Invalid mission type." }, { status: 400 });
    }
    update.mission_type = body.mission_type;
  }
  if (body.mission_notes !== undefined) {
    update.mission_notes = body.mission_notes?.trim() || null;
  }
  if (body.status !== undefined) {
    if (!STATUSES.includes(body.status as (typeof STATUSES)[number])) {
      return NextResponse.json({ error: "Invalid status." }, { status: 400 });
    }
    update.status = body.status;
  }
  if (Object.keys(update).length === 0) {
    return NextResponse.json({ error: "Nothing to update." }, { status: 400 });
  }

  const { error } = await supabase.from("teams").update(update).eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const supabase = await createServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const { error } = await supabase.from("teams").delete().eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
