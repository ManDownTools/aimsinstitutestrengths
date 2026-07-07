import { NextResponse } from "next/server";
import { createServerSupabase } from "@/lib/supabase/server";
import { createServiceSupabase } from "@/lib/supabase/admin";

export const runtime = "nodejs";

const MIN_LENGTH = 8;

export async function POST(request: Request) {
  const { password } = (await request.json().catch(() => ({}))) as {
    password?: string;
  };

  if (!password || password.length < MIN_LENGTH) {
    return NextResponse.json(
      { error: `Your password needs at least ${MIN_LENGTH} characters.` },
      { status: 400 },
    );
  }

  const supabase = await createServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "session_missing" }, { status: 401 });
  }

  const admin = createServiceSupabase();

  const { error: pwErr } = await admin.auth.admin.updateUserById(user.id, {
    password,
  });
  if (pwErr) {
    return NextResponse.json({ error: pwErr.message }, { status: 500 });
  }

  await admin
    .from("profiles")
    .update({ invite_status: "active" })
    .eq("id", user.id)
    .eq("invite_status", "invited");

  return NextResponse.json({ ok: true });
}
