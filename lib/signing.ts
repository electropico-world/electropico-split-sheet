import type { AgreementBundle, MasterOwner, Songwriter } from "./types";

export type SigningParty = {
  role: "songwriter" | "master_owner";
  id: string;
  name: string;
  email: string;
  address: string;
  signingToken: string;
  signedAt: string | null;
  signatureData: string | null;
  signedName: string | null;
  roleLabel: string;
  shareLabel: string;
};

export function writerByPosition(bundle: AgreementBundle, position: number | null | undefined) {
  if (!position) return null;
  return bundle.songwriters.find((writer) => writer.position === position) || null;
}

export function isMasterOwnerLinked(owner: MasterOwner) {
  return Boolean(owner.linked_songwriter_position);
}

export function masterOwnerSignatureSource(bundle: AgreementBundle, owner: MasterOwner) {
  const linkedWriter = writerByPosition(bundle, owner.linked_songwriter_position);
  if (linkedWriter) {
    return {
      name: owner.owner_name,
      email: linkedWriter.email,
      address: linkedWriter.address,
      signedAt: linkedWriter.signed_at,
      signatureData: linkedWriter.signature_data,
      signedName: linkedWriter.signed_name,
      note: `Signed through Songwriter ${linkedWriter.position}: ${linkedWriter.legal_name}`,
    };
  }

  return {
    name: owner.owner_name,
    email: owner.email || "",
    address: owner.address || "",
    signedAt: owner.signed_at,
    signatureData: owner.signature_data,
    signedName: owner.signed_name,
    note: "Signed directly as sound recording owner / copyright claimant",
  };
}

export function isMasterOwnerSigned(bundle: AgreementBundle, owner: MasterOwner) {
  return Boolean(masterOwnerSignatureSource(bundle, owner).signedAt);
}

export function getRequiredSigningParties(bundle: AgreementBundle): SigningParty[] {
  const songwriterParties: SigningParty[] = bundle.songwriters.map((writer) => ({
    role: "songwriter",
    id: writer.id,
    name: writer.legal_name,
    email: writer.email,
    address: writer.address,
    signingToken: writer.signing_token,
    signedAt: writer.signed_at,
    signatureData: writer.signature_data,
    signedName: writer.signed_name,
    roleLabel: "Songwriter",
    shareLabel: `${writer.composition_percent}% composition share`,
  }));

  const masterOwnerParties: SigningParty[] = bundle.master_owners
    .filter((owner) => !owner.linked_songwriter_position)
    .map((owner) => ({
      role: "master_owner",
      id: owner.id,
      name: owner.owner_name,
      email: owner.email || "",
      address: owner.address || "",
      signingToken: owner.signing_token || "",
      signedAt: owner.signed_at,
      signatureData: owner.signature_data,
      signedName: owner.signed_name,
      roleLabel: "Sound Recording Owner / Copyright Claimant",
      shareLabel: `${owner.ownership_percent}% master ownership`,
    }))
    .filter((party) => Boolean(party.email && party.signingToken));

  return [...songwriterParties, ...masterOwnerParties];
}

export function getPendingSigningParties(bundle: AgreementBundle) {
  return getRequiredSigningParties(bundle).filter((party) => !party.signedAt);
}

export function countRequiredSignatures(bundle: AgreementBundle) {
  const parties = getRequiredSigningParties(bundle);
  const signed = parties.filter((party) => party.signedAt).length;
  return { signed, total: parties.length };
}

export function isAgreementFullySigned(bundle: AgreementBundle) {
  return getRequiredSigningParties(bundle).every((party) => party.signedAt && party.signatureData);
}

export function getSigningPartyByToken(bundle: AgreementBundle, token: string): SigningParty | null {
  return getRequiredSigningParties(bundle).find((party) => party.signingToken === token) || null;
}

export function uniqueFinalRecipientEmails(bundle: AgreementBundle) {
  const emails = new Set<string>();
  for (const party of getRequiredSigningParties(bundle)) {
    if (party.email) emails.add(party.email.toLowerCase());
  }
  return Array.from(emails);
}
