"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

export default function GenerateResultsIfMissing({
  assessmentId,
}: {
  assessmentId: string;
}) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/generate-results", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ assessment_id: assessmentId }),
        });
        if (!cancelled) {
          if (!res.ok) {
            const data = await res.json().catch(() => ({}));
            setError(data.error ?? "Something went wrong.");
          } else {
            router.refresh();
          }
        }
      } catch {
        if (!cancelled) setError("Couldn't reach the server.");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [assessmentId, router]);

  return (
    <div className="card stack-3" style={{ textAlign: "center" }}>
      <div className="subhead">Generating your results</div>
      <p>Give us a moment. This takes a few seconds.</p>
      {error && <div className="field-error">{error}</div>}
    </div>
  );
}
