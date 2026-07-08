"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createBrowserSupabase } from "@/lib/supabase/client";

type Status = "trying" | "recovered" | "no-link" | "error" | "expired";

// Completes the auth flow from the URL when the server-rendered page had no
// session yet. Handles both variants Supabase can send:
//   PKCE flow     → ?code=xxx in the query
//   Implicit flow → #access_token=xxx&refresh_token=yyy in the URL fragment
// On success, reload so the page re-renders as the authenticated view.
export default function SetPasswordAuthGate() {
  const router = useRouter();
  const [status, setStatus] = useState<Status>("trying");
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    const supabase = createBrowserSupabase();

    (async () => {
      const url = new URL(window.location.href);
      const code = url.searchParams.get("code");
      const hash = window.location.hash?.startsWith("#")
        ? window.location.hash.slice(1)
        : "";
      const hashParams = new URLSearchParams(hash);
      const accessToken = hashParams.get("access_token");
      const refreshToken = hashParams.get("refresh_token");
      const errorDescription =
        url.searchParams.get("error_description") ??
        hashParams.get("error_description");
      const errorCode =
        url.searchParams.get("error_code") ??
        hashParams.get("error_code");

      if (errorDescription || errorCode) {
        if (cancelled) return;
        // Sign out the stale session so we don't confuse the caller with
        // signals from whoever happened to be logged in already.
        await supabase.auth.signOut({ scope: "local" });
        if (
          errorCode === "otp_expired" ||
          /expired|invalid/i.test(errorDescription ?? "")
        ) {
          setStatus("expired");
        } else {
          setStatus("error");
          setMessage(errorDescription ?? errorCode ?? "Unknown error");
        }
        // Clean the URL so a browser back doesn't reopen the same error.
        window.history.replaceState({}, "", window.location.pathname);
        return;
      }

      const hasInviteParams = !!(code || (accessToken && refreshToken));

      // If we're handling an invite/recovery link, sign out any existing
      // session first. Otherwise an admin who clicks their own invite link
      // while signed in would keep their admin session, and the server
      // render would show the admin's email/user — leading to the wrong
      // account being updated.
      if (hasInviteParams) {
        await supabase.auth.signOut({ scope: "local" });
      }

      // PKCE flow: exchange the code for a session.
      if (code) {
        const { error } = await supabase.auth.exchangeCodeForSession(code);
        if (cancelled) return;
        if (error) {
          setStatus("error");
          setMessage(error.message);
          return;
        }
        // Full reload so the server re-renders /set-password against the
        // freshly-established session (correct email, correct user id).
        window.location.replace("/set-password");
        return;
      }

      // Implicit flow: set the session directly from the fragment tokens.
      if (accessToken && refreshToken) {
        const { error } = await supabase.auth.setSession({
          access_token: accessToken,
          refresh_token: refreshToken,
        });
        if (cancelled) return;
        if (error) {
          setStatus("error");
          setMessage(error.message);
          return;
        }
        window.location.replace("/set-password");
        return;
      }

      // No auth material in the URL and no server session — the person
      // arrived here without a valid link.
      if (cancelled) return;
      setStatus("no-link");
    })();

    return () => {
      cancelled = true;
    };
  }, [router]);

  if (status === "trying" || status === "recovered") {
    return (
      <p className="muted" style={{ textAlign: "center" }}>
        Preparing your account...
      </p>
    );
  }

  return (
    <div className="stack-3" style={{ textAlign: "center" }}>
      {status === "expired" ? (
        <p>
          This invitation link has expired. Ask your admin to resend the
          invitation, then click the newest link in your inbox.
        </p>
      ) : status === "no-link" ? (
        <p>
          This page needs a valid invitation or reset link. Ask your admin to
          resend your invitation, or use the forgot-password flow if you
          already have an account.
        </p>
      ) : (
        <>
          <p>Your link couldn't be verified.</p>
          {message && <p className="field-error">{message}</p>}
        </>
      )}
      <div className="row" style={{ justifyContent: "center", gap: 12 }}>
        <Link href="/login" className="btn btn-ghost lg">
          Sign in
        </Link>
        <Link href="/forgot-password" className="btn btn-primary lg">
          Send me a link
        </Link>
      </div>
    </div>
  );
}
