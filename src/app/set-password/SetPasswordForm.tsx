"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import PasswordInput from "@/components/PasswordInput";
import { createBrowserSupabase } from "@/lib/supabase/client";

const MIN_LENGTH = 8;

export default function SetPasswordForm({
  email,
}: {
  email: string | null;
}) {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [status, setStatus] = useState<"idle" | "saving" | "error">("idle");
  const [error, setError] = useState<string | null>(null);

  // Safety net: if this form mounted with an implicit-flow invite hash in the
  // URL, the server couldn't see it and rendered the form for whatever session
  // cookie happened to be live. Redirect through the auth gate so it can sign
  // out the wrong session and establish the invitee's before we ever show a
  // password field.
  useEffect(() => {
    if (typeof window === "undefined") return;
    const hash = window.location.hash;
    if (hash.startsWith("#") && hash.includes("access_token=")) {
      window.location.replace("/set-password?fresh=1" + hash);
    }
  }, []);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (password.length < MIN_LENGTH) {
      setStatus("error");
      setError(`Your password needs at least ${MIN_LENGTH} characters.`);
      return;
    }
    if (password !== confirm) {
      setStatus("error");
      setError("The two passwords don't match.");
      return;
    }

    setStatus("saving");
    const res = await fetch("/api/set-password", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ password }),
    });
    if (!res.ok) {
      setStatus("error");
      const data = await res.json().catch(() => ({}));
      setError(
        data?.error ??
          "We couldn't save your password. Try again in a moment.",
      );
      return;
    }

    // Password change through the admin API invalidates the current session,
    // so sign in fresh with the new password before we navigate away.
    const { email: signInEmail } = (await res
      .json()
      .catch(() => ({ email: null }))) as { email: string | null };
    const effectiveEmail = email ?? signInEmail;
    if (effectiveEmail) {
      const supabase = createBrowserSupabase();
      const { error: signInErr } = await supabase.auth.signInWithPassword({
        email: effectiveEmail,
        password,
      });
      if (signInErr) {
        setStatus("error");
        setError(
          "Password saved, but couldn't sign you in automatically. Try the login page.",
        );
        return;
      }
    }
    router.replace("/");
    router.refresh();
  }

  return (
    <form onSubmit={onSubmit} className="stack-4">
      {email && (
        <div className="field-modern">
          <label htmlFor="setpw-email">Email</label>
          <input
            id="setpw-email"
            className="input-lg"
            type="email"
            value={email}
            readOnly
            aria-readonly="true"
          />
        </div>
      )}
      <PasswordInput
        id="new-password"
        label="Password"
        value={password}
        onChange={setPassword}
        autoComplete="new-password"
        minLength={MIN_LENGTH}
        helpText={`At least ${MIN_LENGTH} characters.`}
        variant="lg"
      />
      <PasswordInput
        id="confirm-password"
        label="Confirm password"
        value={confirm}
        onChange={setConfirm}
        autoComplete="new-password"
        minLength={MIN_LENGTH}
        variant="lg"
      />
      {error && <div className="field-error">{error}</div>}
      <button
        type="submit"
        className="btn-hero"
        style={{ width: "100%" }}
        disabled={status === "saving"}
      >
        {status === "saving" ? "Saving..." : "Save and continue"}
      </button>
    </form>
  );
}
