"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { MASTER_OWNERSHIP_LABEL_RELEASE_TEXT } from "@/lib/agreementText";
import type { AgreementBundle, AgreementInput, MasterOwnerInput, SongwriterInput } from "@/lib/types";

const blankWriter = (): SongwriterInput => ({
  legalName: "",
  professionalName: "",
  email: "",
  address: "",
  ipiCae: "",
  pro: "",
  publisher: "",
  contribution: "",
  compositionPercent: 0,
});

const blankMasterOwner = (): MasterOwnerInput => ({
  ownerName: "",
  ownershipPercent: 100,
  isrc: "",
  email: "",
  address: "",
  linkedSongwriterPosition: null,
});

function toInitial(bundle?: AgreementBundle): AgreementInput {
  if (!bundle) {
    return {
      songTitle: "",
      releaseName: "",
      artistName: "",
      effectiveDate: new Date().toISOString().slice(0, 10),
      governingState: "Florida",
      songwriters: [blankWriter(), blankWriter()],
      masterOwners: [blankMasterOwner()],
    };
  }
  return {
    songTitle: bundle.song_title,
    releaseName: bundle.release_name || "",
    artistName: bundle.artist_name,
    effectiveDate: bundle.effective_date.slice(0, 10),
    governingState: bundle.governing_state,
    songwriters: bundle.songwriters.map((writer) => ({
      legalName: writer.legal_name,
      professionalName: writer.professional_name || "",
      email: writer.email,
      address: writer.address,
      ipiCae: writer.ipi_cae || "",
      pro: writer.pro || "",
      publisher: writer.publisher || "",
      contribution: writer.contribution,
      compositionPercent: Number(writer.composition_percent),
    })),
    masterOwners: bundle.master_owners.map((owner) => ({
      ownerName: owner.owner_name,
      ownershipPercent: Number(owner.ownership_percent),
      isrc: owner.isrc || "",
      email: owner.email || "",
      address: owner.address || "",
      linkedSongwriterPosition: owner.linked_songwriter_position || null,
    })),
  };
}

export default function AgreementForm({ bundle }: { bundle?: AgreementBundle }) {
  const router = useRouter();
  const [form, setForm] = useState<AgreementInput>(() => toInitial(bundle));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const compositionTotal = useMemo(
    () => form.songwriters.reduce((sum, writer) => sum + Number(writer.compositionPercent || 0), 0),
    [form.songwriters],
  );
  const masterTotal = useMemo(
    () => form.masterOwners.reduce((sum, owner) => sum + Number(owner.ownershipPercent || 0), 0),
    [form.masterOwners],
  );

  function setWriterCount(count: number) {
    setForm((current) => {
      const writers = [...current.songwriters];
      while (writers.length < count) writers.push(blankWriter());
      return {
        ...current,
        songwriters: writers.slice(0, count),
        masterOwners: current.masterOwners.map((owner) => ({
          ...owner,
          linkedSongwriterPosition:
            owner.linkedSongwriterPosition && owner.linkedSongwriterPosition <= count ? owner.linkedSongwriterPosition : null,
        })),
      };
    });
  }

  function updateWriter(index: number, key: keyof SongwriterInput, value: string | number) {
    setForm((current) => ({
      ...current,
      songwriters: current.songwriters.map((writer, i) => (i === index ? { ...writer, [key]: value } : writer)),
    }));
  }

  function updateOwner(index: number, key: keyof MasterOwnerInput, value: string | number | null) {
    setForm((current) => ({
      ...current,
      masterOwners: current.masterOwners.map((owner, i) => (i === index ? { ...owner, [key]: value } : owner)),
    }));
  }

  function addOwner() {
    if (form.masterOwners.length >= 4) return;
    setForm((current) => ({ ...current, masterOwners: [...current.masterOwners, { ...blankMasterOwner(), ownershipPercent: 0 }] }));
  }

  function removeOwner(index: number) {
    if (form.masterOwners.length === 1) return;
    setForm((current) => ({ ...current, masterOwners: current.masterOwners.filter((_, i) => i !== index) }));
  }

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setSaving(true);
    setError("");
    try {
      const url = bundle ? `/api/agreements/${bundle.id}` : "/api/agreements";
      const response = await fetch(url, {
        method: bundle ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Unable to save agreement.");
      router.push(`/agreements/${result.id}`);
      router.refresh();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Unable to save agreement.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={submit} className="grid">
      {bundle?.status === "pending" && (
        <div className="notice danger">
          Saving changes will invalidate every existing signature, create fresh private signing links, and return the agreement to Draft.
        </div>
      )}

      <section className="card">
        <span className="eyebrow">Step 1</span>
        <h2>Release information</h2>
        <div className="grid grid-2">
          <div className="field">
            <label>Song title *</label>
            <input required value={form.songTitle} onChange={(e) => setForm({ ...form, songTitle: e.target.value })} />
          </div>
          <div className="field">
            <label>Release / project name</label>
            <input value={form.releaseName || ""} onChange={(e) => setForm({ ...form, releaseName: e.target.value })} />
          </div>
          <div className="field">
            <label>Primary artist(s) *</label>
            <input required value={form.artistName} onChange={(e) => setForm({ ...form, artistName: e.target.value })} />
          </div>
          <div className="field">
            <label>Effective date *</label>
            <input type="date" required value={form.effectiveDate} onChange={(e) => setForm({ ...form, effectiveDate: e.target.value })} />
          </div>
          <div className="field">
            <label>Governing state / commonwealth *</label>
            <input required value={form.governingState} onChange={(e) => setForm({ ...form, governingState: e.target.value })} />
          </div>
        </div>
      </section>

      <section className="card">
        <span className="eyebrow">Step 2</span>
        <h2>Songwriter profiles</h2>
        <p className="meta">Choose the exact number of songwriters. The app creates one private signing profile for each person.</p>
        <div className="actions">
          {[2, 3, 4].map((count) => (
            <button
              type="button"
              key={count}
              className={`btn ${form.songwriters.length === count ? "btn-accent" : "btn-secondary"}`}
              onClick={() => setWriterCount(count)}
            >
              {count} songwriters
            </button>
          ))}
        </div>

        <div style={{ marginTop: "1.2rem" }}>
          {form.songwriters.map((writer, index) => (
            <div className="writer-card" key={index}>
              <div className="writer-head"><h3>Songwriter {index + 1}</h3><span className="status">Signer {index + 1}</span></div>
              <div className="grid grid-3">
                <div className="field"><label>Legal name *</label><input required value={writer.legalName} onChange={(e) => updateWriter(index, "legalName", e.target.value)} /></div>
                <div className="field"><label>Artist / stage name</label><input value={writer.professionalName || ""} onChange={(e) => updateWriter(index, "professionalName", e.target.value)} /></div>
                <div className="field"><label>Email *</label><input type="email" required value={writer.email} onChange={(e) => updateWriter(index, "email", e.target.value)} /></div>
                <div className="field"><label>IPI / CAE</label><input value={writer.ipiCae || ""} onChange={(e) => updateWriter(index, "ipiCae", e.target.value)} /></div>
                <div className="field"><label>PRO</label><input placeholder="BMI, ASCAP, SESAC…" value={writer.pro || ""} onChange={(e) => updateWriter(index, "pro", e.target.value)} /></div>
                <div className="field"><label>Publisher / administrator</label><input value={writer.publisher || ""} onChange={(e) => updateWriter(index, "publisher", e.target.value)} /></div>
                <div className="field"><label>Composition share % *</label><input type="number" min="0" max="100" step="0.001" required value={writer.compositionPercent} onChange={(e) => updateWriter(index, "compositionPercent", Number(e.target.value))} /></div>
                <div className="field" style={{ gridColumn: "span 2" }}><label>Contribution *</label><input required placeholder="Lyrics, melody, music production…" value={writer.contribution} onChange={(e) => updateWriter(index, "contribution", e.target.value)} /></div>
                <div className="field" style={{ gridColumn: "1 / -1" }}><label>Mailing address *</label><textarea required value={writer.address} onChange={(e) => updateWriter(index, "address", e.target.value)} /></div>
              </div>
            </div>
          ))}
        </div>
        <div className={`total-line ${Math.abs(compositionTotal - 100) < 0.001 ? "total-good" : "total-bad"}`}>
          Composition total: {compositionTotal}% {Math.abs(compositionTotal - 100) < 0.001 ? "✓" : "— must equal 100%"}
        </div>
      </section>

      <section className="card">
        <span className="eyebrow">Step 3</span>
        <h2>Sound recording ownership</h2>
        <p className="meta">Each master owner / copyright claimant must sign. If they are already one of the songwriters, link them below so they do not sign twice.</p>
        <div className="notice" style={{ marginBottom: "1rem" }}>
          <strong>Master Ownership / Label Release.</strong> {MASTER_OWNERSHIP_LABEL_RELEASE_TEXT}
        </div>
        {form.masterOwners.map((owner, index) => {
          const linked = owner.linkedSongwriterPosition || null;
          return (
            <div className="writer-card" key={index}>
              <div className="writer-head">
                <h3>Master owner {index + 1}</h3>
                {form.masterOwners.length > 1 && <button className="btn btn-danger" type="button" onClick={() => removeOwner(index)}>Remove</button>}
              </div>
              <div className="grid grid-3">
                <div className="field"><label>Owner / copyright claimant *</label><input required value={owner.ownerName} onChange={(e) => updateOwner(index, "ownerName", e.target.value)} /></div>
                <div className="field"><label>Ownership % *</label><input type="number" min="0" max="100" step="0.001" required value={owner.ownershipPercent} onChange={(e) => updateOwner(index, "ownershipPercent", Number(e.target.value))} /></div>
                <div className="field"><label>ISRC</label><input value={owner.isrc || ""} onChange={(e) => updateOwner(index, "isrc", e.target.value)} /></div>
                <div className="field" style={{ gridColumn: "1 / -1" }}>
                  <label>Signing role *</label>
                  <select value={linked || ""} onChange={(e) => updateOwner(index, "linkedSongwriterPosition", e.target.value ? Number(e.target.value) : null)}>
                    <option value="">Separate master owner signer</option>
                    {form.songwriters.map((writer, writerIndex) => (
                      <option value={writerIndex + 1} key={writerIndex}>
                        Same person as Songwriter {writerIndex + 1}{writer.legalName ? ` — ${writer.legalName}` : ""}
                      </option>
                    ))}
                  </select>
                </div>
                {!linked ? (
                  <>
                    <div className="field"><label>Master owner email *</label><input type="email" required value={owner.email || ""} onChange={(e) => updateOwner(index, "email", e.target.value)} /></div>
                    <div className="field" style={{ gridColumn: "span 2" }}><label>Master owner mailing address *</label><textarea required value={owner.address || ""} onChange={(e) => updateOwner(index, "address", e.target.value)} /></div>
                  </>
                ) : (
                  <div className="notice" style={{ gridColumn: "1 / -1" }}>
                    This master owner will be covered by Songwriter {linked}'s signature and will not receive a duplicate signing link.
                  </div>
                )}
              </div>
            </div>
          );
        })}
        <div className="actions"><button type="button" className="btn btn-secondary" onClick={addOwner} disabled={form.masterOwners.length >= 4}>Add master owner</button></div>
        <div className={`total-line ${Math.abs(masterTotal - 100) < 0.001 ? "total-good" : "total-bad"}`}>
          Master total: {masterTotal}% {Math.abs(masterTotal - 100) < 0.001 ? "✓" : "— must equal 100%"}
        </div>
      </section>

      {error && <div className="notice danger">{error}</div>}
      <div className="actions">
        <button
          className="btn btn-accent"
          type="submit"
          disabled={saving || Math.abs(compositionTotal - 100) >= 0.001 || Math.abs(masterTotal - 100) >= 0.001}
        >
          {saving ? "Saving…" : bundle ? "Save and reset signatures" : "Create agreement"}
        </button>
      </div>
    </form>
  );
}
