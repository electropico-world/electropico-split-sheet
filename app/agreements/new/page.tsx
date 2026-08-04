import Header from "@/components/Header";
import AgreementForm from "@/components/AgreementForm";
import { requireAdmin } from "@/lib/auth";

export const dynamic = "force-dynamic";

export default async function NewAgreementPage() {
  await requireAdmin();
  return (
    <div className="shell">
      <Header />
      <main className="container">
        <div className="hero"><div><span className="eyebrow">New agreement</span><h1 className="page-title">Build the split.</h1><p>Enter the final credits and percentages before sending the private signature requests.</p></div></div>
        <AgreementForm />
      </main>
    </div>
  );
}
