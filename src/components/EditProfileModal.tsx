"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { showToast } from "@/lib/toast";

type Profile = {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
  position: string | null;
  reports_to: string | null;
  position_start_date: string | null;
  hire_date: string | null;
  role: "system_admin" | "company_admin" | "team_member";
  company_id: string | null;
};

type RosterOption = {
  id: string;
  first_name: string;
  last_name: string;
  position: string | null;
};

type Context = {
  profile: Profile;
  roster: RosterOption[];
  is_only_company_admin: boolean;
  is_self: boolean;
  caller_role: "system_admin" | "company_admin" | "team_member";
};

export default function EditProfileModal({
  personId,
  onClose,
  hideRoleField,
}: {
  personId: string;
  onClose: () => void;
  hideRoleField: boolean;
}) {
  const router = useRouter();
  const [ctx, setCtx] = useState<Context | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [form, setForm] = useState({
    first_name: "",
    last_name: "",
    position: "",
    reports_to: "",
    position_start_date: "",
    hire_date: "",
    role: "team_member" as Profile["role"],
  });
  const [saving, setSaving] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [topError, setTopError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const res = await fetch(`/api/profile/${personId}`, {
        cache: "no-store",
      });
      if (cancelled) return;
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setLoadError(data.error ?? "Couldn't load this profile.");
        return;
      }
      const data = (await res.json()) as Context;
      setCtx(data);
      setForm({
        first_name: data.profile.first_name,
        last_name: data.profile.last_name,
        position: data.profile.position ?? "",
        reports_to: data.profile.reports_to ?? "",
        position_start_date: data.profile.position_start_date ?? "",
        hire_date: data.profile.hire_date ?? "",
        role: data.profile.role,
      });
    })();
    return () => {
      cancelled = true;
    };
  }, [personId]);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  function update<K extends keyof typeof form>(k: K, v: (typeof form)[K]) {
    setForm((f) => ({ ...f, [k]: v }));
    setFieldErrors((e) => {
      if (!e[k as string]) return e;
      const next = { ...e };
      delete next[k as string];
      return next;
    });
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!ctx) return;
    setSaving(true);
    setTopError(null);
    setFieldErrors({});

    const body: Record<string, unknown> = {
      first_name: form.first_name,
      last_name: form.last_name,
      position: form.position || null,
      reports_to: form.reports_to || null,
      position_start_date: form.position_start_date || null,
      hire_date: form.hire_date || null,
    };
    if (!hideRoleField && !ctx.is_self) {
      body.role = form.role;
    }

    const res = await fetch(`/api/profile/${personId}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      if (data.field_errors) {
        setFieldErrors(data.field_errors);
      } else {
        setTopError(data.error ?? "Couldn't save changes.");
      }
      setSaving(false);
      return;
    }

    showToast("Profile updated.");
    onClose();
    router.refresh();
  }

  return (
    <div
      className="modal-backdrop"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="modal-card" role="dialog" aria-modal="true" aria-labelledby="edit-profile-title">
        <h2 id="edit-profile-title" className="modal-title">
          Edit profile
        </h2>
        {!ctx ? (
          <div className="modal-loading">
            {loadError ? (
              <div className="field-error">{loadError}</div>
            ) : (
              <p className="muted">Loading...</p>
            )}
            <div className="modal-actions">
              <button
                type="button"
                className="btn btn-ghost lg"
                onClick={onClose}
              >
                Close
              </button>
            </div>
          </div>
        ) : (
          <form onSubmit={submit} className="stack-4">
            <p className="modal-email">{ctx.profile.email}</p>
            <div className="form-grid form-grid-2">
              <div className="field-labeled">
                <label htmlFor="ep-first">First name</label>
                <input
                  id="ep-first"
                  className="input-lg"
                  value={form.first_name}
                  onChange={(e) => update("first_name", e.target.value)}
                  required
                />
                {fieldErrors.first_name && (
                  <div className="field-error">{fieldErrors.first_name}</div>
                )}
              </div>
              <div className="field-labeled">
                <label htmlFor="ep-last">Last name</label>
                <input
                  id="ep-last"
                  className="input-lg"
                  value={form.last_name}
                  onChange={(e) => update("last_name", e.target.value)}
                  required
                />
                {fieldErrors.last_name && (
                  <div className="field-error">{fieldErrors.last_name}</div>
                )}
              </div>
              <div className="field-labeled">
                <label htmlFor="ep-position">Position</label>
                <input
                  id="ep-position"
                  className="input-lg"
                  value={form.position}
                  onChange={(e) => update("position", e.target.value)}
                />
                {fieldErrors.position && (
                  <div className="field-error">{fieldErrors.position}</div>
                )}
              </div>
              <div className="field-labeled">
                <label htmlFor="ep-reports">Reports to</label>
                <select
                  id="ep-reports"
                  className="select-lg"
                  value={form.reports_to}
                  onChange={(e) => update("reports_to", e.target.value)}
                >
                  <option value="">Nobody</option>
                  {ctx.roster.map((opt) => (
                    <option key={opt.id} value={opt.id}>
                      {opt.first_name} {opt.last_name}
                      {opt.position ? ` — ${opt.position}` : ""}
                    </option>
                  ))}
                </select>
                {fieldErrors.reports_to && (
                  <div className="field-error">{fieldErrors.reports_to}</div>
                )}
              </div>
              <div className="field-labeled">
                <label htmlFor="ep-start">Position start date</label>
                <input
                  id="ep-start"
                  className="input-lg"
                  type="date"
                  value={form.position_start_date}
                  onChange={(e) => update("position_start_date", e.target.value)}
                />
                {fieldErrors.position_start_date && (
                  <div className="field-error">
                    {fieldErrors.position_start_date}
                  </div>
                )}
              </div>
              <div className="field-labeled">
                <label htmlFor="ep-hire">Hire date</label>
                <input
                  id="ep-hire"
                  className="input-lg"
                  type="date"
                  value={form.hire_date}
                  onChange={(e) => update("hire_date", e.target.value)}
                />
                {fieldErrors.hire_date && (
                  <div className="field-error">{fieldErrors.hire_date}</div>
                )}
              </div>
              {!hideRoleField && !ctx.is_self && (
                <div className="field-labeled">
                  <label htmlFor="ep-role">Role</label>
                  <select
                    id="ep-role"
                    className="select-lg"
                    value={form.role}
                    onChange={(e) =>
                      update("role", e.target.value as Profile["role"])
                    }
                    disabled={ctx.is_only_company_admin}
                  >
                    <option value="team_member">Team member</option>
                    <option value="company_admin">Company admin</option>
                    {ctx.caller_role === "system_admin" && (
                      <option value="system_admin">System admin</option>
                    )}
                  </select>
                  {ctx.is_only_company_admin && (
                    <div className="modal-role-caption">
                      Add another company admin before changing this role.
                    </div>
                  )}
                  {fieldErrors.role && (
                    <div className="field-error">{fieldErrors.role}</div>
                  )}
                </div>
              )}
            </div>
            {topError && <div className="field-error">{topError}</div>}
            <div className="modal-actions">
              <button
                type="button"
                className="btn btn-ghost lg"
                onClick={onClose}
                disabled={saving}
              >
                Cancel
              </button>
              <button
                type="submit"
                className="btn btn-primary lg"
                disabled={saving}
              >
                {saving ? "Saving..." : "Save changes"}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
