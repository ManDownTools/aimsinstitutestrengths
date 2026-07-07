"use client";

import { useState } from "react";

export default function ForgotPasswordForm() {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "sending" | "sent">("idle");

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setStatus("sending");
    // Neutral response either way: we don't reveal whether the email exists.
    await fetch("/api/forgot-password", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ email }),
    }).catch(() => {});
    setStatus("sent");
  }

  if (status === "sent") {
    return (
      <div className="stack-3">
        <div className="chip chip-primary">Check your email</div>
        <p>
          If <strong>{email}</strong> is on file, we've sent a link to set a new password. It'll expire shortly, so open it on the device you'd like to use.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} className="stack-4">
      <div className="field">
        <label htmlFor="email">Email</label>
        <input
          id="email"
          type="email"
          required
          className="input"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="you@company.com"
          autoComplete="email"
        />
      </div>
      <button
        type="submit"
        className="btn btn-primary lg"
        disabled={status === "sending"}
      >
        {status === "sending" ? "Sending link..." : "Send reset link"}
      </button>
    </form>
  );
}
