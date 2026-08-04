import { redirect } from "next/navigation";
import { isAdmin } from "@/lib/auth";

export const dynamic = "force-dynamic";

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  if (await isAdmin()) redirect("/");
  const params = await searchParams;
  return (
    <main className="login-card card">
      <div className="brand"><span className="brand-mark">EP</span><span>ELECTROPICO SPLITS</span></div>
      <div style={{ margin: "2rem 0" }}>
        <span className="eyebrow">Private label portal</span>
        <h1 style={{ fontSize: "2.4rem", letterSpacing: "-.05em", marginBottom: ".6rem" }}>Welcome back.</h1>
        <p className="meta">Enter the Electropico admin password to manage split agreements.</p>
      </div>
      {params.error && <div className="notice danger" style={{ marginBottom: "1rem" }}>Incorrect password.</div>}
      <form action="/api/auth/login" method="post" className="grid">
        <div className="field"><label>Password</label><input name="password" type="password" required autoFocus /></div>
        <button className="btn btn-accent" type="submit">Open dashboard</button>
      </form>
    </main>
  );
}
