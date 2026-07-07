import Link from "next/link";
import { redirect } from "next/navigation";
import TopNav from "@/components/TopNav";
import { createServerSupabase } from "@/lib/supabase/server";
import CreateCompanyForm from "./CreateCompanyForm";

export default async function SystemPage() {
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

  const { data: companies } = await supabase
    .from("companies")
    .select("id, name, created_at")
    .order("name", { ascending: true });

  const list = companies ?? [];

  return (
    <>
      <div className="hero-shell">
        <TopNav />
        <div className="hero-body">
          <div className="container-wide">
            <div className="eyebrow">System admin</div>
            <h1 className="hero-title">Companies</h1>
            <div className="hero-bar" aria-hidden="true" />
            <p className="hero-sub">
              Everything the AiMS team can see and manage across companies.
            </p>
          </div>
        </div>
      </div>

      <div className="container-wide content-shell">
        <div className="grid-2-1">
          <section className="card">
            <div className="card-header">
              <h2>All companies</h2>
              <span className="caption tabular">
                {list.length} {list.length === 1 ? "company" : "companies"}
              </span>
            </div>
            {list.length === 0 ? (
              <p className="muted" style={{ margin: 0 }}>
                No companies yet. Add your first one on the right.
              </p>
            ) : (
              <table className="table">
                <thead>
                  <tr>
                    <th>Name</th>
                    <th className="date-cell">Created</th>
                    <th className="action-cell"></th>
                  </tr>
                </thead>
                <tbody>
                  {list.map((c) => (
                    <tr key={c.id}>
                      <td>
                        <Link href={`/system/company/${c.id}`}>{c.name}</Link>
                      </td>
                      <td className="date-cell">
                        {new Date(c.created_at).toLocaleDateString()}
                      </td>
                      <td className="action-cell">
                        <Link
                          href={`/system/company/${c.id}`}
                          className="btn btn-ghost sm"
                        >
                          Open
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </section>

          <section className="card">
            <div className="card-header">
              <h2>Add a company</h2>
            </div>
            <CreateCompanyForm />
          </section>
        </div>
      </div>
    </>
  );
}
