import { NextResponse } from "next/server";
import { isAdmin } from "@/lib/auth";
import { getAgreementBundle } from "@/lib/data";
import { sendCompletedAgreement, sendElectropicoCompletionConfirmation } from "@/lib/email";
import { getSupabaseAdmin } from "@/lib/supabase";

export async function POST(_: Request, context: { params: Promise<{ id: string }> }) {
  if (!(await isAdmin())) return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  try {
    const { id } = await context.params;
    const bundle = await getAgreementBundle(id);
    if (!bundle || bundle.status !== "completed" || !bundle.final_pdf_path) {
      return NextResponse.json({ error: "A completed PDF is required before email delivery." }, { status: 409 });
    }

    const supabase = getSupabaseAdmin();
    const { data, error } = await supabase.storage.from("completed-agreements").download(bundle.final_pdf_path);
    if (error || !data) throw error || new Error("Unable to load the completed PDF.");
    const pdf = Buffer.from(await data.arrayBuffer());
    await sendCompletedAgreement(bundle, pdf);
    await sendElectropicoCompletionConfirmation(bundle, pdf);
    await supabase
      .from("agreements")
      .update({ completion_email_sent_at: new Date().toISOString(), completion_email_error: null })
      .eq("id", id);
    return NextResponse.json({ sent: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to email the completed agreement.";
    const { id } = await context.params;
    try {
      await getSupabaseAdmin().from("agreements").update({ completion_email_error: message }).eq("id", id);
    } catch {}
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
