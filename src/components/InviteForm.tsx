"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type ReportsToOption = { id: string; label: string };

export default function InviteForm({
  companyId,
  companyLocked,
  companies,
  reportsToOptions,
  allowSystemAdmin,
  allowCompanyAdmin,
}: {
  companyId?: string;
  companyLocked: boolean;
  companies?: { id: string; name: string }[];
  reportsToOptions: ReportsToOption[];
  allowSystemAdmin: boolean;
  allowCompanyAdmin: boolean;
}) {
  const router = useRouter();
  const [status, setStatus] = useState<"idle" | "sending" | "sent" | "error">(
    "idle",
  );
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState({
    email: "",
    first_name: "",
    last_name: "",
    position: "",
    reports_to: "",
    position_start_date: "",
    hire_date: "",
    role: "team_member" as "team_member" | "company_admin" | "system_admin",
    company_id: companyId ?? "",
  });

  function update<K extends keyof typeof form>(k: K, v: (typeof form)[K]) {
    setForm((f) => ({ ...f, [k]: v }));
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setStatus("sending");
    setError(null);
    const res = await fetch("/api/invite", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        ...form,
        reports_to: form.reports_to || null,
        position_start_date: form.position_start_date || null,
        hire_date: form.hire_date || null,
        company_id: form.company_id || companyId,
      }),
    });
    const data = await res.json();
    if (!res.ok) {
      setStatus("error");
      setError(data.error ?? "Something went wrong.");
      return;
    }
    setStatus("sent");
    setForm({
      email: "",
      first_name: "",
      last_name: "",
      position: "",
      reports_to: "",
      position_start_date: "",
      hire_date: "",
      role: "team_member",
      company_id: companyId ?? "",
    });
    router.refresh();
    setTimeout(() => setStatus("idle"), 2000);
  }

  return (
    <form onSubmit={submit} className="stack-4">
      {!companyLocked && companies && (
        <div className="field-labeled">
          <label htmlFor="i-company">Company</label>
          <select
            id="i-company"
            className="select-lg"
            value={form.company_id}
            onChange={(e) => update("company_id", e.target.value)}
            required
          >
            <option value="">Choose a company</option>
            {companies.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>
      )}
      <div className="form-grid form-grid-2">
        <div className="field-labeled">
          <label htmlFor="i-first">First name</label>
          <input
            id="i-first"
            className="input-lg"
            required
            value={form.first_name}
            onChange={(e) => update("first_name", e.target.value)}
          />
        </div>
        <div className="field-labeled">
          <label htmlFor="i-last">Last name</label>
          <input
            id="i-last"
            className="input-lg"
            required
            value={form.last_name}
            onChange={(e) => update("last_name", e.target.value)}
          />
        </div>
        <div className="field-labeled">
          <label htmlFor="i-email">Email</label>
          <input
            id="i-email"
            className="input-lg"
            type="email"
            required
            value={form.email}
            onChange={(e) => update("email", e.target.value)}
            placeholder="them@company.com"
          />
        </div>
        <div className="field-labeled">
          <label htmlFor="i-position">Position</label>
          <input
            id="i-position"
            className="input-lg"
            value={form.position}
            onChange={(e) => update("position", e.target.value)}
            placeholder="e.g. Head of Operations"
          />
        </div>
        <div className="field-labeled">
          <label htmlFor="i-reports">Reports to</label>
          <select
            id="i-reports"
            className="select-lg"
            value={form.reports_to}
            onChange={(e) => update("reports_to", e.target.value)}
          >
            <option value="">Nobody yet</option>
            {reportsToOptions.map((opt) => (
              <option key={opt.id} value={opt.id}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>
        <div className="field-labeled">
          <label htmlFor="i-role">Role</label>
          <select
            id="i-role"
            className="select-lg"
            value={form.role}
            onChange={(e) =>
              update("role", e.target.value as typeof form.role)
            }
          >
            <option value="team_member">Team member</option>
            {allowCompanyAdmin && (
              <option value="company_admin">Company admin</option>
            )}
            {allowSystemAdmin && (
              <option value="system_admin">System admin</option>
            )}
          </select>
        </div>
        <div className="field-labeled">
          <label htmlFor="i-start">Position start date</label>
          <input
            id="i-start"
            className="input-lg"
            type="date"
            value={form.position_start_date}
            onChange={(e) => update("position_start_date", e.target.value)}
          />
        </div>
        <div className="field-labeled">
          <label htmlFor="i-hire">Hire date</label>
          <input
            id="i-hire"
            className="input-lg"
            type="date"
            value={form.hire_date}
            onChange={(e) => update("hire_date", e.target.value)}
          />
        </div>
      </div>
      {error && <div className="field-error">{error}</div>}
      <div>
        <button
          type="submit"
          className="btn btn-primary lg"
          disabled={status === "sending"}
        >
          {status === "sending"
            ? "Sending invite..."
            : status === "sent"
              ? "Invitation sent"
              : "Send invitation"}
        </button>
      </div>
    </form>
  );
}
