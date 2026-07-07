"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createBrowserSupabase } from "@/lib/supabase/client";

type Status = "trying" | "recovered" | "no-link" | "error";

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

      if (errorDescription) {
        if (cancelled) return;
        setStatus("error");
        setMessage(errorDescription);
        return;
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
        // Clean the URL and reload the server view.
        window.history.replaceState({}, "", window.location.pathname);
        setStatus("recovered");
        router.refresh();
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
        window.history.replaceState({}, "", window.location.pathname);
        setStatus("recovered");
        router.refresh();
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
      {status === "no-link" ? (
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
