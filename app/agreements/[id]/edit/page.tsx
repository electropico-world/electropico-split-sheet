import { notFound, redirect } from "next/navigation";
import Header from "@/components/Header";
import AgreementForm from "@/components/AgreementForm";
import { requireAdmin } from "@/lib/auth";
import { getAgreementBundle } from "@/lib/data";

export const dynamic = "force-dynamic";

export default async function EditAgreementPage({ params }: { params: Promise<{ id: string }> }) {
  await requireAdmin();
  const { id } = await params;
  const bundle = await getAgreementBundle(id);
  if (!bundle) notFound();
  if (bundle.status === "completed") redirect(`/agreements/${id}`);
  return (
    <div className="shell">
      <Header />
      <main className="container">
        <div className="hero"><div><span className="eyebrow">Edit agreement</span><h1 className="page-title">{bundle.song_title}</h1><p>Any saved change resets all signatures and creates fresh signing links.</p></div></div>
        <AgreementForm bundle={bundle} />
      </main>
    </div>
  );
}
