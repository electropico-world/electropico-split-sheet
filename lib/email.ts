import { Resend } from "resend";
import { countRequiredSignatures, uniqueFinalRecipientEmails, type SigningParty } from "./signing";
import type { AgreementBundle } from "./types";

function getResend() {
  const key = process.env.RESEND_API_KEY;
  if (!key) throw new Error("RESEND_API_KEY is not configured.");
  return new Resend(key);
}

function fromAddress() {
  return process.env.EMAIL_FROM || "Electropico Splits <splits@agreements.electropico.world>";
}

function electropicoConfirmationEmail() {
  return process.env.ELECTROPICO_CONFIRMATION_EMAIL || "info@electropico.world";
}

function appUrl() {
  return (process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000").replace(/\/$/, "");
}

function resendErrorMessage(error: unknown) {
  if (!error) return "Unknown Resend email error.";
  if (typeof error === "string") return error;
  if (typeof error === "object" && error !== null) {
    const e = error as { message?: unknown; name?: unknown; statusCode?: unknown };
    return [e.name, e.message, e.statusCode].filter(Boolean).map(String).join(" | ");
  }
  return "Unknown Resend email error.";
}

async function sendOrThrow(payload: Parameters<Resend["emails"]["send"]>[0]) {
  const resend = getResend();
  const result = await resend.emails.send(payload);

  if (result.error) {
    throw new Error(resendErrorMessage(result.error));
  }

  return result.data;
}

export async function sendSignatureInvitation(bundle: AgreementBundle, party: SigningParty) {
  const signingUrl = `${appUrl()}/sign/${party.signingToken}`;

  return sendOrThrow({
    from: fromAddress(),
    to: party.email,
    subject: `Signature requested — ${bundle.song_title} split agreement`,
    html: `
      <div style="font-family:Arial,sans-serif;max-width:620px;margin:auto;color:#151515;line-height:1.6">
        <div style="height:12px;background:#f2d900;margin-bottom:28px"></div>
        <p style="font-size:12px;letter-spacing:.14em;font-weight:bold">ELECTROPICO RECORDS</p>
        <h1 style="font-size:30px;line-height:1.1">Your split agreement is ready.</h1>
        <p>Hello ${party.name},</p>
        <p>Please review and sign as <strong>${party.roleLabel}</strong> for <strong>${bundle.song_title}</strong> by ${bundle.artist_name}.</p>
        <p>Your listed share is <strong>${party.shareLabel}</strong>.</p>
        <p><a href="${signingUrl}" style="display:inline-block;background:#151515;color:#fff;text-decoration:none;padding:13px 20px;border-radius:30px;font-weight:bold">Review and sign</a></p>
        <p style="font-size:13px;color:#666">This private link is assigned to you. Please do not forward it.</p>
      </div>`,
  });
}

export async function sendCompletedAgreement(bundle: AgreementBundle, pdf: Buffer) {
  const recipients = uniqueFinalRecipientEmails(bundle);
  if (!recipients.length) throw new Error("No signer email recipients found for completed agreement.");

  return sendOrThrow({
    from: fromAddress(),
    to: recipients,
    subject: `Completed Split Agreement — ${bundle.song_title} by ${bundle.artist_name}`,
    html: `
      <div style="font-family:Arial,sans-serif;max-width:620px;margin:auto;color:#151515;line-height:1.6">
        <div style="height:12px;background:#f2d900;margin-bottom:28px"></div>
        <p style="font-size:12px;letter-spacing:.14em;font-weight:bold">ELECTROPICO RECORDS</p>
        <h1 style="font-size:30px;line-height:1.1">The agreement is complete.</h1>
        <p>All required parties have signed the Electropico split agreement for <strong>${bundle.song_title}</strong> by ${bundle.artist_name}.</p>
        <p>The fully executed agreement is attached for everyone’s records.</p>
        <p style="font-size:13px;color:#666">Please keep this document with your publishing and release records.</p>
      </div>`,
    attachments: [
      {
        filename: `${bundle.song_title.replace(/[^a-z0-9]+/gi, "_")}_Split_Agreement.pdf`,
        content: pdf,
      },
    ],
  });
}

export async function sendElectropicoCompletionConfirmation(bundle: AgreementBundle, pdf: Buffer) {
  const counts = countRequiredSignatures(bundle);

  return sendOrThrow({
    from: fromAddress(),
    to: electropicoConfirmationEmail(),
    subject: `Electropico Confirmation — Completed Split Agreement — ${bundle.song_title}`,
    html: `
      <div style="font-family:Arial,sans-serif;max-width:620px;margin:auto;color:#151515;line-height:1.6">
        <div style="height:12px;background:#f2d900;margin-bottom:28px"></div>
        <p style="font-size:12px;letter-spacing:.14em;font-weight:bold">ELECTROPICO INTERNAL CONFIRMATION</p>
        <h1 style="font-size:30px;line-height:1.1">Split agreement completed.</h1>
        <p>The split agreement for <strong>${bundle.song_title}</strong> by <strong>${bundle.artist_name}</strong> has been fully signed.</p>
        <p><strong>Required signatures completed:</strong> ${counts.signed}/${counts.total}</p>
        <p>The final signed PDF is attached and saved in the Electropico Splits dashboard.</p>
      </div>`,
    attachments: [
      {
        filename: `${bundle.song_title.replace(/[^a-z0-9]+/gi, "_")}_Split_Agreement.pdf`,
        content: pdf,
      },
    ],
  });
}
