"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function RetryFinalEmailButton({ agreementId }: { agreementId: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function retry() {
    setLoading(true);
    setError("");
    try {
      const response = await fetch(`/api/agreements/${agreementId}/retry-email`, { method: "POST" });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Unable to send email.");
      router.refresh();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Unable to send email.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="actions">
      <button className="btn btn-secondary" type="button" onClick={retry} disabled={loading}>
        {loading ? "Sending…" : "Retry final email"}
      </button>
      {error && <span className="meta" style={{ color: "var(--danger)" }}>{error}</span>}
    </div>
  );
}
