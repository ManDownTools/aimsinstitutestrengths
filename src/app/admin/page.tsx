import { redirect } from "next/navigation";
import TopNav from "@/components/TopNav";
import AdminDashboard from "@/components/AdminDashboard";
import { createServerSupabase } from "@/lib/supabase/server";

export default async function AdminPage() {
  const supabase = await createServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: me } = await supabase
    .from("profiles")
    .select("role, company_id")
    .eq("id", user.id)
    .single();

  if (!me || me.role !== "company_admin") redirect("/");
  if (!me.company_id) redirect("/");

  const { data: company } = await supabase
    .from("companies")
    .select("name")
    .eq("id", me.company_id)
    .single();

  return (
    <>
      <div className="hero-shell">
        <TopNav />
        <div className="hero-body">
          <div className="container-wide">
            <div className="eyebrow">
              Company admin · {company?.name ?? ""}
            </div>
            <h1 className="hero-title">Company overview</h1>
            <div className="hero-bar" aria-hidden="true" />
            <p className="hero-sub">
              Roster, invites, and how strengths configure across the team.
            </p>
          </div>
        </div>
      </div>
      <div className="container-wide content-shell">
        <AdminDashboard
          companyId={me.company_id}
          companyName={company?.name ?? ""}
          callerRole="company_admin"
          allowCompanyAdmin={true}
          allowSystemAdmin={false}
        />
      </div>
    </>
  );
}
