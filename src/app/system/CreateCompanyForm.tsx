"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function CreateCompanyForm() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [status, setStatus] = useState<"idle" | "sending" | "error">("idle");
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setStatus("sending");
    setError(null);
    const res = await fetch("/api/companies", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ name }),
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.error ?? "Couldn't create the company.");
      setStatus("error");
      return;
    }
    setName("");
    setStatus("idle");
    router.refresh();
  }

  return (
    <form onSubmit={submit} className="stack-4">
      <div className="field-labeled">
        <label htmlFor="company-name">Company name</label>
        <input
          id="company-name"
          className="input-lg"
          required
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="e.g. Northwind Logistics"
        />
      </div>
      {error && <div className="field-error">{error}</div>}
      <button
        type="submit"
        className="btn-cta"
        disabled={status === "sending"}
      >
        {status === "sending" ? "Creating..." : "Create company"}
      </button>
    </form>
  );
}
