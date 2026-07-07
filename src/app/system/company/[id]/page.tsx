import { redirect } from "next/navigation";
import Link from "next/link";
import TopNav from "@/components/TopNav";
import AdminDashboard from "@/components/AdminDashboard";
import { createServerSupabase } from "@/lib/supabase/server";

export default async function SystemCompanyPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: me } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();
  if (me?.role !== "system_admin") redirect("/");

  const { data: company } = await supabase
    .from("companies")
    .select("id, name")
    .eq("id", id)
    .single();
  if (!company) redirect("/system");

  return (
    <>
      <div className="hero-shell">
        <TopNav />
        <div className="hero-body">
          <div className="container-wide">
            <div className="eyebrow">
              <Link
                href="/system"
                style={{ color: "inherit", textDecoration: "none" }}
              >
                System admin
              </Link>{" "}
              · {company.name}
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
          companyId={company.id}
          companyName={company.name}
          callerRole="system_admin"
          allowCompanyAdmin={true}
          allowSystemAdmin={true}
        />
      </div>
    </>
  );
}
