"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

const STATUS_MESSAGES = [
  "Reading each person's profile",
  "Mapping coverage across sub-strengths",
  "Finding sole holders and gaps",
  "Weighing the orientation mix",
  "Drafting the read",
  "Finalizing",
];

export default function GenerateTeamInsightsIfMissing({
  companyId,
}: {
  companyId: string;
}) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [statusIndex, setStatusIndex] = useState(0);

  useEffect(() => {
    const id = setInterval(() => {
      setStatusIndex((i) => Math.min(i + 1, STATUS_MESSAGES.length - 1));
    }, 2200);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/generate-team-insights", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ company_id: companyId }),
        });
        if (cancelled) return;
        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          setError(data.error ?? "Couldn't generate team insights.");
          return;
        }
        const data = await res.json().catch(() => ({}));
        if (!data.cached) router.refresh();
      } catch {
        if (!cancelled) setError("Couldn't reach the server.");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [companyId, router]);

  return (
    <section className="card stack-3">
      <div className="card-header">
        <h2>Team insights</h2>
      </div>
      <div className="stack-3">
        <div
          className="progress-status"
          key={statusIndex}
          aria-live="polite"
        >
          {STATUS_MESSAGES[statusIndex]}
        </div>
        <div
          className="progress-indeterminate"
          role="progressbar"
          aria-label="Generating team insights"
        />
      </div>
      {error && <div className="field-error">{error}</div>}
    </section>
  );
}
