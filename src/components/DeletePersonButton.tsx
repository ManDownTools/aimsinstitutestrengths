"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function DeletePersonButton({
  profileId,
  personName,
}: {
  profileId: string;
  personName: string;
}) {
  const router = useRouter();
  const [status, setStatus] = useState<"idle" | "deleting" | "error">("idle");

  async function onClick() {
    const ok = window.confirm(
      `Delete ${personName}? This removes them from the company along with any assessment responses, results, and coaching history. This can't be undone.`,
    );
    if (!ok) return;

    setStatus("deleting");
    const res = await fetch(`/api/people/${profileId}`, { method: "DELETE" });
    if (!res.ok) {
      setStatus("error");
      const data = await res.json().catch(() => ({}));
      window.alert(data?.error ?? "Couldn't delete this person.");
      setTimeout(() => setStatus("idle"), 1500);
      return;
    }
    router.refresh();
  }

  return (
    <button
      type="button"
      className="btn btn-ghost sm btn-ghost-danger"
      onClick={onClick}
      disabled={status === "deleting"}
      aria-label={`Delete ${personName}`}
    >
      {status === "deleting" ? "Deleting..." : "Delete"}
    </button>
  );
}
