"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function SendInvitationsButton({ agreementId, resend = false }: { agreementId: string; resend?: boolean }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function send() {
    setLoading(true);
    setError("");
    try {
      const response = await fetch(`/api/agreements/${agreementId}/send`, { method: "POST" });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Unable to send invitations.");
      router.refresh();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Unable to send invitations.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div>
      <button className="btn btn-accent" type="button" onClick={send} disabled={loading}>
        {loading ? "Sending…" : resend ? "Resend pending invitations" : "Send signature requests"}
      </button>
      {error && <div className="notice danger" style={{ marginTop: ".6rem" }}>{error}</div>}
    </div>
  );
}
