import { NextResponse } from "next/server";
import { createServerSupabase } from "@/lib/supabase/server";
import { createServiceSupabase } from "@/lib/supabase/admin";

export const runtime = "nodejs";

type Ctx = { params: Promise<{ id: string }> };

type ProfileRow = {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
  position: string | null;
  reports_to: string | null;
  position_start_date: string | null;
  hire_date: string | null;
  role: "system_admin" | "company_admin" | "team_member";
  company_id: string | null;
  invite_status: "invited" | "active";
};

// -----------------------------------------------------------------------------
// GET — returns the profile + a roster suitable for the reports_to dropdown
//       + a flag for whether the target is the only company_admin in the company.
// -----------------------------------------------------------------------------
export async function GET(_request: Request, { params }: Ctx) {
  const { id } = await params;
  const supabase = await createServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const { data: me } = await supabase
    .from("profiles")
    .select("id, role, company_id")
    .eq("id", user.id)
    .single();
  if (!me) return NextResponse.json({ error: "forbidden" }, { status: 403 });

  const { data: target } = await supabase
    .from("profiles")
    .select(
      "id, email, first_name, last_name, position, reports_to, position_start_date, hire_date, role, company_id, invite_status",
    )
    .eq("id", id)
    .single();
  if (!target) return NextResponse.json({ error: "not found" }, { status: 404 });

  const allowed = canView(me, target as ProfileRow);
  if (!allowed) return NextResponse.json({ error: "forbidden" }, { status: 403 });

  const { roster, isOnlyCompanyAdmin } = await buildRosterContext(
    supabase,
    target as ProfileRow,
  );

  return NextResponse.json({
    profile: target,
    roster,
    is_only_company_admin: isOnlyCompanyAdmin,
    is_self: user.id === target.id,
    caller_role: me.role,
  });
}

// -----------------------------------------------------------------------------
// PATCH — updates the profile. Validates permissions + reports_to server-side
//         regardless of what the UI allowed. Role changes are excluded from
//         self-edits and cannot demote the only company_admin.
// -----------------------------------------------------------------------------
export async function PATCH(request: Request, { params }: Ctx) {
  const { id } = await params;
  const body = (await request.json()) as {
    first_name?: string;
    last_name?: string;
    position?: string | null;
    reports_to?: string | null;
    position_start_date?: string | null;
    hire_date?: string | null;
    role?: "system_admin" | "company_admin" | "team_member";
  };

  const supabase = await createServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const { data: me } = await supabase
    .from("profiles")
    .select("id, role, company_id")
    .eq("id", user.id)
    .single();
  if (!me) return NextResponse.json({ error: "forbidden" }, { status: 403 });

  const { data: target } = await supabase
    .from("profiles")
    .select(
      "id, first_name, last_name, position, reports_to, position_start_date, hire_date, role, company_id",
    )
    .eq("id", id)
    .single();
  if (!target) return NextResponse.json({ error: "not found" }, { status: 404 });

  const targetRow = target as ProfileRow;
  const isSelf = user.id === targetRow.id;
  const isSystemAdmin = me.role === "system_admin";
  const isCompanyAdminOfTarget =
    me.role === "company_admin" && me.company_id === targetRow.company_id;

  if (!(isSelf || isSystemAdmin || isCompanyAdminOfTarget)) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  const fieldErrors: Record<string, string> = {};

  const update: Record<string, unknown> = {};
  if (body.first_name !== undefined) {
    if (!body.first_name.trim()) {
      fieldErrors.first_name = "First name can't be empty.";
    } else {
      update.first_name = body.first_name.trim();
    }
  }
  if (body.last_name !== undefined) {
    if (!body.last_name.trim()) {
      fieldErrors.last_name = "Last name can't be empty.";
    } else {
      update.last_name = body.last_name.trim();
    }
  }
  if (body.position !== undefined) {
    update.position = body.position?.trim() || null;
  }
  if (body.position_start_date !== undefined) {
    update.position_start_date = body.position_start_date || null;
  }
  if (body.hire_date !== undefined) {
    update.hire_date = body.hire_date || null;
  }

  // reports_to validation: same company, not self, not a downstream report.
  if (body.reports_to !== undefined) {
    if (body.reports_to === null || body.reports_to === "") {
      update.reports_to = null;
    } else {
      if (body.reports_to === targetRow.id) {
        fieldErrors.reports_to = "Someone can't report to themselves.";
      } else {
        const { data: newMgr } = await supabase
          .from("profiles")
          .select("id, company_id")
          .eq("id", body.reports_to)
          .single();
        if (!newMgr) {
          fieldErrors.reports_to = "That person can't be found.";
        } else if (newMgr.company_id !== targetRow.company_id) {
          fieldErrors.reports_to =
            "Reports-to must be someone in the same company.";
        } else {
          const downstream = await collectDownstream(
            supabase,
            targetRow.id,
            targetRow.company_id,
          );
          if (downstream.has(body.reports_to)) {
            fieldErrors.reports_to =
              "Can't set someone in this person's reporting chain as their manager.";
          } else {
            update.reports_to = body.reports_to;
          }
        }
      }
    }
  }

  // Role. Self-edits ignore the role field silently.
  if (body.role !== undefined && !isSelf) {
    if (!["system_admin", "company_admin", "team_member"].includes(body.role)) {
      fieldErrors.role = "Pick a valid role.";
    } else if (body.role === "system_admin" && !isSystemAdmin) {
      fieldErrors.role = "Only system admins can set that role.";
    } else if (body.role !== targetRow.role) {
      // If changing away from company_admin, ensure another admin exists.
      if (targetRow.role === "company_admin" && targetRow.company_id) {
        const { count } = await supabase
          .from("profiles")
          .select("id", { count: "exact", head: true })
          .eq("company_id", targetRow.company_id)
          .eq("role", "company_admin");
        if ((count ?? 0) <= 1) {
          fieldErrors.role =
            "Add another company admin before changing this role.";
        }
      }
      if (!fieldErrors.role) update.role = body.role;
    }
  }

  if (Object.keys(fieldErrors).length > 0) {
    return NextResponse.json({ field_errors: fieldErrors }, { status: 400 });
  }
  if (Object.keys(update).length === 0) {
    return NextResponse.json({ error: "Nothing to update." }, { status: 400 });
  }

  // Use service role for the write. RLS still holds on read via the caller's
  // context; write validation has already happened above.
  const admin = createServiceSupabase();
  const { data: updated, error } = await admin
    .from("profiles")
    .update(update)
    .eq("id", id)
    .select(
      "id, email, first_name, last_name, position, reports_to, position_start_date, hire_date, role, company_id, invite_status",
    )
    .single();

  if (error || !updated) {
    return NextResponse.json(
      { error: error?.message ?? "Update failed." },
      { status: 500 },
    );
  }

  return NextResponse.json({ profile: updated });
}

// -----------------------------------------------------------------------------
// Helpers
// -----------------------------------------------------------------------------

function canView(
  me: { id: string; role: string; company_id: string | null },
  target: ProfileRow,
): boolean {
  if (me.id === target.id) return true;
  if (me.role === "system_admin") return true;
  if (me.role === "company_admin" && me.company_id === target.company_id)
    return true;
  return false;
}

async function collectDownstream(
  supabase: Awaited<ReturnType<typeof createServerSupabase>>,
  rootId: string,
  companyId: string | null,
): Promise<Set<string>> {
  if (!companyId) return new Set();
  const { data: all } = await supabase
    .from("profiles")
    .select("id, reports_to")
    .eq("company_id", companyId);
  const childrenOf = new Map<string, string[]>();
  for (const p of all ?? []) {
    const parent = p.reports_to as string | null;
    if (!parent) continue;
    const arr = childrenOf.get(parent) ?? [];
    arr.push(p.id as string);
    childrenOf.set(parent, arr);
  }
  const result = new Set<string>();
  const stack: string[] = [rootId];
  while (stack.length) {
    const cur = stack.pop()!;
    for (const child of childrenOf.get(cur) ?? []) {
      if (!result.has(child)) {
        result.add(child);
        stack.push(child);
      }
    }
  }
  return result;
}

async function buildRosterContext(
  supabase: Awaited<ReturnType<typeof createServerSupabase>>,
  target: ProfileRow,
): Promise<{
  roster: {
    id: string;
    first_name: string;
    last_name: string;
    position: string | null;
  }[];
  isOnlyCompanyAdmin: boolean;
}> {
  if (!target.company_id) {
    return { roster: [], isOnlyCompanyAdmin: false };
  }
  const { data: all } = await supabase
    .from("profiles")
    .select("id, first_name, last_name, position, role")
    .eq("company_id", target.company_id);
  const downstream = await collectDownstream(
    supabase,
    target.id,
    target.company_id,
  );
  const roster = (all ?? [])
    .filter((p) => p.id !== target.id && !downstream.has(p.id as string))
    .map((p) => ({
      id: p.id as string,
      first_name: p.first_name as string,
      last_name: p.last_name as string,
      position: (p.position as string | null) ?? null,
    }))
    .sort((a, b) => a.last_name.localeCompare(b.last_name));

  const adminCount =
    (all ?? []).filter((p) => p.role === "company_admin").length;
  const isOnlyCompanyAdmin =
    target.role === "company_admin" && adminCount <= 1;

  return { roster, isOnlyCompanyAdmin };
}
