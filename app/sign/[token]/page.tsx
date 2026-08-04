import { notFound } from "next/navigation";
import SignAgreementForm from "@/components/SignAgreementForm";
import { getAgreementBySigningToken } from "@/lib/data";

export const dynamic = "force-dynamic";

function dateLabel(value: string | null) {
  if (!value) return "—";
  const date = value.length <= 10 ? new Date(`${value}T12:00:00`) : new Date(value);
  return new Intl.DateTimeFormat("en-US", { year: "numeric", month: "long", day: "numeric" }).format(date);
}

export default async function SigningPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const bundle = await getAgreementBySigningToken(token);
  if (!bundle) notFound();
  const writer = bundle.songwriters.find((item) => item.signing_token === token);
  if (!writer) notFound();
  const signedCount = bundle.songwriters.filter((item) => item.signed_at).length;

  return (
    <main className="narrow">
      <div className="brand" style={{ marginBottom: "2rem" }}><span className="brand-mark">EP</span><span>ELECTROPICO SPLITS</span></div>

      {writer.signed_at ? (
        <section className="card">
          <span className="eyebrow">Signature received</span>
          <h1 style={{ fontSize: "3rem", letterSpacing: "-.05em", margin: ".6rem 0" }}>Thank you, {writer.legal_name}.</h1>
          {bundle.status === "completed" ? (
            <div className="notice success">All songwriters have signed. The completed PDF has been emailed to everyone.</div>
          ) : (
            <div className="notice">Your signature is recorded. The agreement currently has {signedCount} of {bundle.songwriters.length} signatures. You will receive the final PDF by email after everyone signs.</div>
          )}
        </section>
      ) : (
        <>
          <section className="card">
            <span className="eyebrow">Signature requested</span>
            <h1 style={{ fontSize: "3rem", letterSpacing: "-.05em", margin: ".6rem 0" }}>{bundle.song_title}</h1>
            <p className="meta">Prepared for {writer.legal_name} · {bundle.artist_name} · Effective {dateLabel(bundle.effective_date)}</p>
          </section>

          <section className="card legal-copy">
            <h2>Song & Sound Recording Split Agreement</h2>
            <p>Each undersigned songwriter, whether independently or jointly, has contributed to the authorship of the original musical composition identified above (the “Composition”) and, where applicable, to the associated sound recording (the “Master”). Ownership and administration of the Master shall be as stated below. Rights in the Master include, without limitation, reproduction, manufacturing, monetization, licensing, distribution, and other commercial exploitation of the Master.</p>
            <p>The undersigned intend that all music and lyrics in the Composition be merged into a single joint work. The Composition shall be registered with the applicable performing rights organizations and/or publishing administrators according to the shares below.</p>

            <h3>Composition ownership</h3>
            <div className="table-wrap" style={{ fontFamily: "Arial, sans-serif" }}>
              <table>
                <thead><tr><th>Songwriter</th><th>Share</th><th>IPI / CAE</th><th>PRO</th><th>Publisher</th><th>Contribution</th></tr></thead>
                <tbody>{bundle.songwriters.map((item) => <tr key={item.id}><td>{item.legal_name}</td><td>{item.composition_percent}%</td><td>{item.ipi_cae || "—"}</td><td>{item.pro || "—"}</td><td>{item.publisher || "—"}</td><td>{item.contribution}</td></tr>)}</tbody>
              </table>
            </div>

            <h3>Sound recording ownership</h3>
            <div className="table-wrap" style={{ fontFamily: "Arial, sans-serif" }}>
              <table>
                <thead><tr><th>Owner / copyright claimant</th><th>Ownership</th><th>ISRC</th></tr></thead>
                <tbody>{bundle.master_owners.map((owner) => <tr key={owner.id}><td>{owner.owner_name}</td><td>{owner.ownership_percent}%</td><td>{owner.isrc || "—"}</td></tr>)}</tbody>
              </table>
            </div>

            <p>Each undersigned warrants that they have disclosed all samples, interpolations, replays, or other third-party copyrighted material supplied by them. Unless otherwise agreed in writing, any clearance cost, claim, or reduction of rights attributable to undisclosed third-party material shall be borne by the party who supplied it, and no other contributor’s share shall be reduced solely because of material supplied by another contributor.</p>
            <p>This Agreement may be signed in counterparts and electronically and shall be governed by the laws of the State/Commonwealth of {bundle.governing_state}.</p>
          </section>

          <section className="card">
            <span className="eyebrow">Your confirmation</span>
            <h2>Review and sign</h2>
            <div className="notice" style={{ marginBottom: "1rem" }}>
              Your assigned composition share is <strong>{writer.composition_percent}%</strong>. Your contribution is listed as <strong>{writer.contribution}</strong>.
            </div>
            <SignAgreementForm token={token} legalName={writer.legal_name} />
          </section>
        </>
      )}

      <p className="footer-note">This is a private signing link assigned to {writer.email}. Do not forward it.</p>
    </main>
  );
}
