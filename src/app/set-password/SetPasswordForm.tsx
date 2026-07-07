"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import PasswordInput from "@/components/PasswordInput";

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
