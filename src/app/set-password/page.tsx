import Image from "next/image";
import { createServerSupabase } from "@/lib/supabase/server";
import SetPasswordForm from "./SetPasswordForm";
import SetPasswordAuthGate from "./SetPasswordAuthGate";

export default async function SetPasswordPage() {
  const supabase = await createServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  let heading = "Create your password to get started.";
  let sub =
    "You'll use this the next time you sign in.";
  let email: string | null = null;
  let firstName: string | null = null;
  let isInvite = false;

  if (user) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("first_name, email, invite_status")
      .eq("id", user.id)
      .single();
    email = (profile?.email as string | null) ?? user.email ?? null;
    firstName = (profile?.first_name as string | null) ?? null;
    isInvite = profile?.invite_status === "invited";
    heading = isInvite
      ? "Create your password to get started."
      : "Set a new password for your account.";
    sub = isInvite
      ? `Welcome${firstName ? `, ${firstName}` : ""}. You'll use this the next time you sign in.`
      : "You'll use it the next time you sign in.";
  }

  return (
    <main className="auth-hero-page">
      <div className="auth-hero-column fade-up">
        <Image
          src="/logo-white.png"
          alt="AiMS Institute"
          width={56}
          height={56}
          priority
          className="brand-logo"
        />
        <h1 className="display">{heading}</h1>
        <div className="auth-hero-bar" aria-hidden="true" />
        <p className="auth-hero-sub">{sub}</p>
        <div className="auth-hero-card">
          {user ? (
            <SetPasswordForm email={email} />
          ) : (
            <SetPasswordAuthGate />
          )}
        </div>
      </div>
    </main>
  );
}
