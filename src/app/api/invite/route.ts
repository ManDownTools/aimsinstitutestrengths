import { NextResponse } from "next/server";
import { createServerSupabase } from "@/lib/supabase/server";
import { createServiceSupabase } from "@/lib/supabase/admin";
import { sendInvite, resendInvite } from "@/lib/email";

export const runtime = "nodejs";

type Body = {
  email: string;
  first_name: string;
  last_name: string;
  position?: string;
  reports_to?: string | null;
  position_start_date?: string;
  hire_date?: string;
  role: "company_admin" | "team_member" | "system_admin";
  company_id?: string;
  action?: "invite" | "resend";
  profile_id?: string;
};

export async function POST(request: Request) {
  const body = (await request.json()) as Body;
  const supabase = await createServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const { data: me } = await supabase
    .from("profiles")
    .select("role, company_id, first_name")
    .eq("id", user.id)
    .single();
  if (!me) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  // Determine target company + role authority
  let targetCompanyId: string | undefined;
  if (me.role === "system_admin") {
    targetCompanyId = body.company_id ?? undefined;
  } else if (me.role === "company_admin") {
    targetCompanyId = me.company_id ?? undefined;
  } else {
    return NextResponse.json({ error: "unauthorized" }, { status: 403 });
  }
  if (!targetCompanyId) {
    return NextResponse.json({ error: "company_id required" }, { status: 400 });
  }

  // company_admin can't invite system_admin
  if (me.role === "company_admin" && body.role === "system_admin") {
    return NextResponse.json({ error: "unauthorized" }, { status: 403 });
  }

  const admin = createServiceSupabase();

  if (body.action === "resend" && body.profile_id) {
    const { data: existingProfile } = await admin
      .from("profiles")
      .select("email, first_name, company_id, invite_status")
      .eq("id", body.profile_id)
      .single();
    if (!existingProfile) {
      return NextResponse.json({ error: "not found" }, { status: 404 });
    }
    if (
      me.role === "company_admin" &&
      existingProfile.company_id !== me.company_id
    ) {
      return NextResponse.json({ error: "unauthorized" }, { status: 403 });
    }
    try {
      await resendInvite(existingProfile.email);
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "resend failed";
      return NextResponse.json({ error: message }, { status: 500 });
    }
    return NextResponse.json({ ok: true });
  }

  // New invite
  if (!body.email || !body.first_name || !body.last_name || !body.role) {
    return NextResponse.json(
      { error: "email, first_name, last_name, role required" },
      { status: 400 },
    );
  }

  let invited;
  try {
    invited = await sendInvite({
      email: body.email,
      firstName: body.first_name,
      lastName: body.last_name,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "invite failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }

  const { error: profErr } = await admin.from("profiles").insert({
    id: invited.userId,
    company_id: targetCompanyId,
    email: body.email,
    first_name: body.first_name,
    last_name: body.last_name,
    position: body.position ?? null,
    reports_to: body.reports_to ?? null,
    position_start_date: body.position_start_date || null,
    hire_date: body.hire_date || null,
    role: body.role,
    invite_status: "invited",
  });
  if (profErr) {
    return NextResponse.json({ error: profErr.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true, profile_id: invited.userId });
}
