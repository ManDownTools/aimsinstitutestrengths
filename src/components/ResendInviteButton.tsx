"use client";

import { useState } from "react";

export default function ResendInviteButton({ profileId }: { profileId: string }) {
  const [status, setStatus] = useState<"idle" | "sending" | "sent" | "error">(
    "idle",
  );
  return (
    <button
      className="btn btn-ghost sm"
      onClick={async () => {
        setStatus("sending");
        const res = await fetch("/api/invite", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ action: "resend", profile_id: profileId }),
        });
        setStatus(res.ok ? "sent" : "error");
        setTimeout(() => setStatus("idle"), 2500);
      }}
      disabled={status === "sending"}
    >
      {status === "sending" ? "Sending..." : status === "sent" ? "Sent" : status === "error" ? "Failed" : "Resend invite"}
    </button>
  );
}
