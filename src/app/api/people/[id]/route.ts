import { NextResponse } from "next/server";
import { createServerSupabase } from "@/lib/supabase/server";
import { createServiceSupabase } from "@/lib/supabase/admin";

export const runtime = "nodejs";

// DELETE removes the auth user, which cascades through profiles → assessments
// → responses, narrative_messages, results, coaching_conversations and
// coaching_messages via the foreign-key ON DELETE CASCADE rules in the schema.
// A single delete on auth.users wipes everything for that person.
export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id: targetId } = await params;

  const supabase = await createServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const { data: me } = await supabase
    .from("profiles")
    .select("role, company_id")
    .eq("id", user.id)
    .single();
  if (!me) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  // Safety: no self-delete via this endpoint.
  if (targetId === user.id) {
    return NextResponse.json(
      { error: "Can't delete yourself from here." },
      { status: 400 },
    );
  }

  const admin = createServiceSupabase();
  const { data: target } = await admin
    .from("profiles")
    .select("id, role, company_id")
    .eq("id", targetId)
    .single();
  if (!target) {
    return NextResponse.json({ error: "not found" }, { status: 404 });
  }

  // Authorization:
  // - system_admin can delete anyone except other system_admins
  // - company_admin can delete team members and other company_admins in their own company
  if (me.role === "system_admin") {
    if (target.role === "system_admin") {
      return NextResponse.json(
        { error: "Can't delete another system admin." },
        { status: 403 },
      );
    }
  } else if (me.role === "company_admin") {
    if (target.company_id !== me.company_id) {
      return NextResponse.json({ error: "unauthorized" }, { status: 403 });
    }
    if (target.role === "system_admin") {
      return NextResponse.json({ error: "unauthorized" }, { status: 403 });
    }
  } else {
    return NextResponse.json({ error: "unauthorized" }, { status: 403 });
  }

  const { error } = await admin.auth.admin.deleteUser(targetId);
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
