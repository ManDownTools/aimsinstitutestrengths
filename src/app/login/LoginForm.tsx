"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createBrowserSupabase } from "@/lib/supabase/client";
import PasswordInput from "@/components/PasswordInput";

export default function LoginForm() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [status, setStatus] = useState<"idle" | "signing" | "error">("idle");
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setStatus("signing");
    setError(null);
    const supabase = createBrowserSupabase();
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    if (error) {
      setStatus("error");
      setError("That email and password don't match anything on file.");
      return;
    }
    router.replace("/");
    router.refresh();
  }

  return (
    <form onSubmit={onSubmit} className="stack-4">
      <div className="field-modern">
        <label htmlFor="email">Email</label>
        <input
          id="email"
          type="email"
          required
          className="input-lg"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="you@company.com"
          autoComplete="email"
        />
      </div>
      <PasswordInput
        id="password"
        label="Password"
        value={password}
        onChange={setPassword}
        autoComplete="current-password"
        variant="lg"
      />
      {error && <div className="field-error">{error}</div>}
      <button
        type="submit"
        className="btn-hero"
        style={{ width: "100%" }}
        disabled={status === "signing"}
      >
        {status === "signing" ? "Signing in..." : "Sign in"}
      </button>
    </form>
  );
}
