import { Resend } from "resend";
import type { AgreementBundle, Songwriter } from "./types";

function getResend() {
  const key = process.env.RESEND_API_KEY;
  if (!key) throw new Error("RESEND_API_KEY is not configured.");
  return new Resend(key);
}

function fromAddress() {
  return process.env.EMAIL_FROM || "Electropico Records <onboarding@resend.dev>";
}

function appUrl() {
  return (process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000").replace(/\/$/, "");
}

export async function sendSignatureInvitation(bundle: AgreementBundle, writer: Songwriter) {
  const resend = getResend();
  const signingUrl = `${appUrl()}/sign/${writer.signing_token}`;
  return resend.emails.send({
    from: fromAddress(),
    to: writer.email,
    subject: `Signature requested — ${bundle.song_title} split agreement`,
    html: `
      <div style="font-family:Arial,sans-serif;max-width:620px;margin:auto;color:#151515;line-height:1.6">
        <div style="height:12px;background:#f2d900;margin-bottom:28px"></div>
        <p style="font-size:12px;letter-spacing:.14em;font-weight:bold">ELECTROPICO RECORDS</p>
        <h1 style="font-size:30px;line-height:1.1">Your split agreement is ready.</h1>
        <p>Hello ${writer.legal_name},</p>
        <p>Please review and sign the songwriter split agreement for <strong>${bundle.song_title}</strong> by ${bundle.artist_name}.</p>
        <p><a href="${signingUrl}" style="display:inline-block;background:#151515;color:#fff;text-decoration:none;padding:13px 20px;border-radius:30px;font-weight:bold">Review and sign</a></p>
        <p style="font-size:13px;color:#666">This private link is assigned to you. Please do not forward it.</p>
      </div>`,
  });
}

export async function sendCompletedAgreement(bundle: AgreementBundle, pdf: Buffer) {
  const resend = getResend();
  return resend.emails.send({
    from: fromAddress(),
    to: bundle.songwriters.map((writer) => writer.email),
    subject: `Completed Split Agreement — ${bundle.song_title} by ${bundle.artist_name}`,
    html: `
      <div style="font-family:Arial,sans-serif;max-width:620px;margin:auto;color:#151515;line-height:1.6">
        <div style="height:12px;background:#f2d900;margin-bottom:28px"></div>
        <p style="font-size:12px;letter-spacing:.14em;font-weight:bold">ELECTROPICO RECORDS</p>
        <h1 style="font-size:30px;line-height:1.1">The agreement is complete.</h1>
        <p>All songwriters have signed the Electropico split agreement for <strong>${bundle.song_title}</strong> by ${bundle.artist_name}.</p>
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
