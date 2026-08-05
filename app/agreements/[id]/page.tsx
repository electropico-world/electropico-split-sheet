import Link from "next/link";
import { notFound } from "next/navigation";
import Header from "@/components/Header";
import StatusBadge from "@/components/StatusBadge";
import SendInvitationsButton from "@/components/SendInvitationsButton";
import CopySigningLink from "@/components/CopySigningLink";
import RetryFinalEmailButton from "@/components/RetryFinalEmailButton";
import { requireAdmin } from "@/lib/auth";
import { getAgreementBundle } from "@/lib/data";
import { countRequiredSignatures, isMasterOwnerSigned, masterOwnerSignatureSource } from "@/lib/signing";

export const dynamic = "force-dynamic";

function dateLabel(value: string | null) {
  if (!value) return "—";
  const date = value.length <= 10 ? new Date(`${value}T12:00:00`) : new Date(value);
  return new Intl.DateTimeFormat("en-US", { year: "numeric", month: "short", day: "numeric" }).format(date);
}

export default async function AgreementDetailPage({ params }: { params: Promise<{ id: string }> }) {
  await requireAdmin();
  const { id } = await params;
  const bundle = await getAgreementBundle(id);
  if (!bundle) notFound();
  const signatures = countRequiredSignatures(bundle);
  const allSigned = signatures.signed === signatures.total;

  return (
    <div className="shell">
      <Header />
      <main className="container">
        <section className="hero">
          <div>
            <span className="eyebrow">Agreement</span>
            <h1 className="page-title">{bundle.song_title}</h1>
            <p>{bundle.artist_name} · {bundle.release_name || "No release / project name"}</p>
          </div>
          <StatusBadge status={bundle.status} />
        </section>

        <section className="kpis">
          <div className="card kpi"><strong>{signatures.signed}/{signatures.total}</strong><span>Required signatures received</span></div>
          <div className="card kpi"><strong>100%</strong><span>Composition accounted for</span></div>
          <div className="card kpi"><strong>100%</strong><span>Master accounted for</span></div>
        </section>

        {bundle.status === "completed" && (
          <div className="notice success">
            Everyone signed. The final PDF was locked and emailed to all signers and Electropico{bundle.completion_email_sent_at ? ` on ${dateLabel(bundle.completion_email_sent_at)}` : ""}.
            {bundle.completion_email_error && <div style={{ marginTop: ".5rem" }}>Email warning: {bundle.completion_email_error}<RetryFinalEmailButton agreementId={bundle.id} /></div>}
          </div>
        )}

        <section className="card">
          <div className="writer-head">
            <div><span className="eyebrow">Project</span><h2>Agreement details</h2></div>
            <div className="actions" style={{ marginTop: 0 }}>
              {bundle.status !== "completed" && <Link className="btn btn-secondary" href={`/agreements/${bundle.id}/edit`}>Edit</Link>}
              {bundle.status === "completed" && <a className="btn btn-accent" href={`/api/agreements/${bundle.id}/download`}>Download final PDF</a>}
            </div>
          </div>
          <div className="grid grid-3">
            <div><span className="eyebrow">Effective date</span><p>{dateLabel(bundle.effective_date)}</p></div>
            <div><span className="eyebrow">Primary artist</span><p>{bundle.artist_name}</p></div>
            <div><span className="eyebrow">Governing law</span><p>{bundle.governing_state}</p></div>
          </div>
        </section>

        <section className="card">
          <div className="writer-head"><div><span className="eyebrow">Composition</span><h2>Songwriters and signing status</h2></div></div>
          <div className="table-wrap">
            <table>
              <thead><tr><th>Songwriter</th><th>Share</th><th>IPI / CAE</th><th>PRO</th><th>Publisher</th><th>Contribution</th><th>Status</th><th>Private link</th></tr></thead>
              <tbody>
                {bundle.songwriters.map((writer) => (
                  <tr key={writer.id}>
                    <td><strong>{writer.legal_name}</strong><div className="meta">{writer.professional_name || writer.email}</div></td>
                    <td>{writer.composition_percent}%</td>
                    <td>{writer.ipi_cae || "—"}</td>
                    <td>{writer.pro || "—"}</td>
                    <td>{writer.publisher || "—"}</td>
                    <td>{writer.contribution}</td>
                    <td>{writer.signed_at ? <span className="status completed">Signed {dateLabel(writer.signed_at)}</span> : <span className="status pending">Pending</span>}</td>
                    <td>{!writer.signed_at && bundle.status !== "completed" ? <CopySigningLink token={writer.signing_token} /> : "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <section className="card">
          <div className="writer-head"><div><span className="eyebrow">Master</span><h2>Sound recording ownership and signing status</h2></div></div>
          <div className="table-wrap">
            <table>
              <thead><tr><th>Owner / copyright claimant</th><th>Ownership</th><th>ISRC</th><th>Signer</th><th>Status</th><th>Private link</th></tr></thead>
              <tbody>{bundle.master_owners.map((owner) => {
                const source = masterOwnerSignatureSource(bundle, owner);
                const signed = isMasterOwnerSigned(bundle, owner);
                return (
                  <tr key={owner.id}>
                    <td>{owner.owner_name}<div className="meta">{owner.email || source.email || "Linked signer"}</div></td>
                    <td>{owner.ownership_percent}%</td>
                    <td>{owner.isrc || "—"}</td>
                    <td>{source.note}</td>
                    <td>{signed ? <span className="status completed">Signed {dateLabel(source.signedAt)}</span> : <span className="status pending">Pending</span>}</td>
                    <td>{!signed && !owner.linked_songwriter_position && owner.signing_token && bundle.status !== "completed" ? <CopySigningLink token={owner.signing_token} /> : "—"}</td>
                  </tr>
                );
              })}</tbody>
            </table>
          </div>
        </section>

        {bundle.status !== "completed" && !allSigned && (
          <section className="card">
            <span className="eyebrow">Next action</span>
            <h2>{bundle.status === "draft" ? "Send the private signing links." : "Follow up with pending signers."}</h2>
            <p className="meta">The final PDF is generated only after every required songwriter and master owner / copyright claimant signs. At that moment, it is automatically emailed to all signers and Electropico.</p>
            <div className="actions"><SendInvitationsButton agreementId={bundle.id} resend={bundle.status === "pending"} /></div>
          </section>
        )}

        <p className="footer-note">Electropico Split Sheet is an administrative workflow tool. The agreement template should be reviewed for the needs of each release and jurisdiction.</p>
      </main>
    </div>
  );
}
