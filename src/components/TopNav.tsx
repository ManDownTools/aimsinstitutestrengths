import Link from "next/link";
import Image from "next/image";
import { createServerSupabase } from "@/lib/supabase/server";
import SignOutButton from "./SignOutButton";
import MyProfileButton from "./MyProfileButton";

export default async function TopNav() {
  const supabase = await createServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  let profile: {
    role: string;
    first_name: string;
    last_name: string;
  } | null = null;

  if (user) {
    const { data } = await supabase
      .from("profiles")
      .select("role, first_name, last_name")
      .eq("id", user.id)
      .single();
    profile = data;
  }

  return (
    <nav className="topnav">
      <div className="topnav-inner">
        <Link href="/" className="logo" aria-label="AiMS home">
          <Image
            src="/logo-white.png"
            alt="AiMS Institute"
            width={32}
            height={32}
            priority
          />
        </Link>
        <div className="row">
          {profile?.role === "team_member" && (
            <>
              <Link href="/results" className="btn btn-ghost sm">
                Your results
              </Link>
              <Link href="/coach" className="btn btn-ghost sm">
                Coaching
              </Link>
            </>
          )}
          {profile?.role === "company_admin" && (
            <>
              <Link href="/admin" className="btn btn-ghost sm">
                Dashboard
              </Link>
              <Link href="/admin/teams" className="btn btn-ghost sm">
                Teams
              </Link>
            </>
          )}
          {profile?.role === "system_admin" && (
            <>
              <Link href="/system" className="btn btn-ghost sm">
                Companies
              </Link>
              <Link href="/admin/teams" className="btn btn-ghost sm">
                Teams
              </Link>
            </>
          )}
          {profile && user && <MyProfileButton userId={user.id} />}
          {profile && <SignOutButton />}
        </div>
      </div>
    </nav>
  );
}
