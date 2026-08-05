import { getAgreementBundle } from "./data";
import { sendCompletedAgreement, sendElectropicoCompletionConfirmation } from "./email";
import { generateAgreementPdf } from "./pdf";
import { isAgreementFullySigned } from "./signing";
import { getSupabaseAdmin } from "./supabase";

export async function completeAgreementIfReady(agreementId: string) {
  const bundle = await getAgreementBundle(agreementId);
  if (!bundle) throw new Error("Agreement not found.");
  if (bundle.status === "completed") return bundle;
  if (!isAgreementFullySigned(bundle)) return bundle;

  const pdf = await generateAgreementPdf(bundle);
  const supabase = getSupabaseAdmin();
  const path = `${bundle.id}/${Date.now()}-${bundle.song_title.replace(/[^a-z0-9]+/gi, "-").toLowerCase()}.pdf`;
  const upload = await supabase.storage.from("completed-agreements").upload(path, pdf, {
    contentType: "application/pdf",
    upsert: false,
  });
  if (upload.error) throw upload.error;

  const completedAt = new Date().toISOString();
  const { error: updateError } = await supabase
    .from("agreements")
    .update({ status: "completed", completed_at: completedAt, final_pdf_path: path, completion_email_error: null })
    .eq("id", bundle.id);
  if (updateError) throw updateError;

  const completedBundle = (await getAgreementBundle(bundle.id))!;
  try {
    await sendCompletedAgreement(completedBundle, pdf);
    await sendElectropicoCompletionConfirmation(completedBundle, pdf);
    await supabase.from("agreements").update({ completion_email_sent_at: new Date().toISOString() }).eq("id", bundle.id);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown email delivery error";
    await supabase.from("agreements").update({ completion_email_error: message }).eq("id", bundle.id);
  }

  return (await getAgreementBundle(bundle.id))!;
}
