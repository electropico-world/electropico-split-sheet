"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import SignaturePad from "./SignaturePad";

export default function SignAgreementForm({ token, legalName }: { token: string; legalName: string }) {
  const router = useRouter();
  const [signedName, setSignedName] = useState(legalName);
  const [signatureData, setSignatureData] = useState("");
  const [accepted, setAccepted] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setError("");
    setSaving(true);
    try {
      const response = await fetch(`/api/sign/${token}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ signedName, signatureData, accepted }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Unable to save signature.");
      router.refresh();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Unable to save signature.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={submit} className="grid">
      <div className="field">
        <label>Full legal name</label>
        <input required value={signedName} onChange={(e) => setSignedName(e.target.value)} />
      </div>
      <div className="field">
        <label>Signature</label>
        <SignaturePad onChange={setSignatureData} />
      </div>
      <label className="notice" style={{ display: "flex", gap: ".7rem", alignItems: "flex-start" }}>
        <input style={{ width: "auto", marginTop: ".2rem" }} type="checkbox" checked={accepted} onChange={(e) => setAccepted(e.target.checked)} />
        <span>I have reviewed the agreement, confirm the information assigned to me, and agree to sign electronically.</span>
      </label>
      {error && <div className="notice danger">{error}</div>}
      <button className="btn btn-accent" type="submit" disabled={!accepted || !signatureData || saving}>
        {saving ? "Signing…" : "Sign agreement"}
      </button>
    </form>
  );
}
