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

  // email_confirm: true is required for the flow where an invited user sets
  // their password. The invite creates the auth user with a null
  // email_confirmed_at; without confirming here, a later signInWithPassword
  // fails with "email not confirmed" (which our login form masks as a
  // generic "email and password don't match" message).
  const { error: pwErr } = await admin.auth.admin.updateUserById(user.id, {
    password,
    email_confirm: true,
  });
  if (pwErr) {
    return NextResponse.json({ error: pwErr.message }, { status: 500 });
  }

  await admin
    .from("profiles")
    .update({ invite_status: "active" })
    .eq("id", user.id)
    .eq("invite_status", "invited");

  // Return the email so the client can immediately re-authenticate — the
  // password change through the admin API invalidates the current session,
  // so we need to hand back a fresh one before redirecting home.
  return NextResponse.json({ ok: true, email: user.email ?? null });
}
