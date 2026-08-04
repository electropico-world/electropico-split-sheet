import Link from "next/link";
import Header from "@/components/Header";
import StatusBadge from "@/components/StatusBadge";
import { requireAdmin } from "@/lib/auth";
import { getSupabaseAdmin } from "@/lib/supabase";
import type { Agreement, Songwriter } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  await requireAdmin();
  const supabase = getSupabaseAdmin();
  const [{ data: agreements }, { data: writers }] = await Promise.all([
    supabase.from("agreements").select("*").order("created_at", { ascending: false }),
    supabase.from("songwriters").select("agreement_id,signed_at"),
  ]);
  const rows = (agreements || []) as Agreement[];
  const signerRows = (writers || []) as Pick<Songwriter, "agreement_id" | "signed_at">[];
  const counts = new Map<string, { signed: number; total: number }>();
  for (const writer of signerRows) {
    const value = counts.get(writer.agreement_id) || { signed: 0, total: 0 };
    value.total += 1;
    if (writer.signed_at) value.signed += 1;
    counts.set(writer.agreement_id, value);
  }

  const draftCount = rows.filter((row) => row.status === "draft").length;
  const pendingCount = rows.filter((row) => row.status === "pending").length;
  const completedCount = rows.filter((row) => row.status === "completed").length;

  return (
    <div className="shell">
      <Header />
      <main className="container">
        <section className="hero">
          <div>
            <span className="eyebrow">Electropico Records</span>
            <h1>Split sheets,<br />without the chaos.</h1>
            <p>Create agreements for two to four songwriters, collect every signature, generate the final PDF, and automatically email it to the full writing team.</p>
          </div>
          <Link className="btn btn-accent" href="/agreements/new">Create new agreement</Link>
        </section>

        <section className="kpis">
          <div className="card kpi"><strong>{draftCount}</strong><span>Drafts</span></div>
          <div className="card kpi"><strong>{pendingCount}</strong><span>Waiting for signatures</span></div>
          <div className="card kpi"><strong>{completedCount}</strong><span>Completed</span></div>
        </section>

        <section className="card">
          <div className="writer-head"><div><span className="eyebrow">Library</span><h2>Agreements</h2></div></div>
          {!rows.length ? (
            <div className="empty">No agreements yet. Create the first Electropico split sheet.</div>
          ) : (
            <div className="agreement-list">
              {rows.map((agreement) => {
                const signers = counts.get(agreement.id) || { signed: 0, total: 0 };
                return (
                  <Link className="writer-card agreement-row" href={`/agreements/${agreement.id}`} key={agreement.id}>
                    <div>
                      <h3>{agreement.song_title}</h3>
                      <div className="meta">{agreement.artist_name} · {agreement.release_name || "No release name"}</div>
                    </div>
                    <div style={{ display: "flex", gap: ".7rem", alignItems: "center", flexWrap: "wrap" }}>
                      <span className="meta">{signers.signed} of {signers.total} signed</span>
                      <StatusBadge status={agreement.status} />
                    </div>
                  </Link>
                );
              })}
            </div>
          )}
        </section>
      </main>
    </div>
  );
}
