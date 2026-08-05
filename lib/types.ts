export type AgreementStatus = "draft" | "pending" | "completed";

export type Songwriter = {
  id: string;
  agreement_id: string;
  position: number;
  legal_name: string;
  professional_name: string | null;
  email: string;
  address: string;
  ipi_cae: string | null;
  pro: string | null;
  publisher: string | null;
  contribution: string;
  composition_percent: number;
  signing_token: string;
  signed_name: string | null;
  signature_data: string | null;
  signed_at: string | null;
};

export type MasterOwner = {
  id: string;
  agreement_id: string;
  position: number;
  owner_name: string;
  ownership_percent: number;
  isrc: string | null;
  email: string | null;
  address: string | null;
  linked_songwriter_position: number | null;
  signing_token: string | null;
  signed_name: string | null;
  signature_data: string | null;
  signed_at: string | null;
};

export type Agreement = {
  id: string;
  song_title: string;
  release_name: string | null;
  artist_name: string;
  effective_date: string;
  governing_state: string;
  status: AgreementStatus;
  created_at: string;
  updated_at: string;
  completed_at: string | null;
  final_pdf_path: string | null;
  invitations_sent_at: string | null;
  completion_email_sent_at: string | null;
  completion_email_error: string | null;
};

export type AgreementBundle = Agreement & {
  songwriters: Songwriter[];
  master_owners: MasterOwner[];
};

export type SongwriterInput = {
  legalName: string;
  professionalName?: string;
  email: string;
  address: string;
  ipiCae?: string;
  pro?: string;
  publisher?: string;
  contribution: string;
  compositionPercent: number;
};

export type MasterOwnerInput = {
  ownerName: string;
  ownershipPercent: number;
  isrc?: string;
  email?: string;
  address?: string;
  linkedSongwriterPosition?: number | null;
};

export type AgreementInput = {
  songTitle: string;
  releaseName?: string;
  artistName: string;
  effectiveDate: string;
  governingState: string;
  songwriters: SongwriterInput[];
  masterOwners: MasterOwnerInput[];
};
