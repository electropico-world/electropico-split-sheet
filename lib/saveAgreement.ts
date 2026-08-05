import { randomBytes } from "crypto";
import { getSupabaseAdmin } from "./supabase";
import type { AgreementInput } from "./types";

function clean(value?: string) {
  const trimmed = value?.trim() || "";
  return trimmed.length ? trimmed : null;
}

function lowerEmail(value?: string) {
  const trimmed = clean(value);
  return trimmed ? trimmed.toLowerCase() : null;
}

export function errorMessage(error: unknown, fallback = "Unable to save agreement.") {
  if (error instanceof Error) return error.message;

  if (typeof error === "object" && error !== null) {
    const e = error as { message?: unknown; details?: unknown; hint?: unknown; code?: unknown };
    return [e.message, e.details, e.hint, e.code].filter(Boolean).map(String).join(" | ") || JSON.stringify(error);
  }

  return fallback;
}

export async function saveAgreement(input: AgreementInput, agreementId?: string | null) {
  const supabase = getSupabaseAdmin();
  let id = agreementId || null;
  let created = false;

  try {
    if (id) {
      const { data: existing, error: existingError } = await supabase
        .from("agreements")
        .select("status")
        .eq("id", id)
        .single();
      if (existingError || !existing) throw existingError || new Error("Agreement not found.");
      if (existing.status === "completed") throw new Error("Completed agreements are locked.");

      const { error } = await supabase
        .from("agreements")
        .update({
          song_title: input.songTitle,
          release_name: clean(input.releaseName),
          artist_name: input.artistName,
          effective_date: input.effectiveDate,
          governing_state: input.governingState,
          status: "draft",
          invitations_sent_at: null,
          completed_at: null,
          final_pdf_path: null,
          completion_email_sent_at: null,
          completion_email_error: null,
        })
        .eq("id", id);
      if (error) throw error;

      await supabase.from("songwriters").delete().eq("agreement_id", id);
      await supabase.from("master_owners").delete().eq("agreement_id", id);
    } else {
      const { data: agreement, error } = await supabase
        .from("agreements")
        .insert({
          song_title: input.songTitle,
          release_name: clean(input.releaseName),
          artist_name: input.artistName,
          effective_date: input.effectiveDate,
          governing_state: input.governingState,
          status: "draft",
        })
        .select("id")
        .single();
      if (error) throw error;
      if (!agreement?.id) throw new Error("Agreement was not created.");
      id = agreement.id;
      created = true;
    }

    const songwriterRows = input.songwriters.map((writer, index) => ({
      agreement_id: id,
      position: index + 1,
      legal_name: writer.legalName,
      professional_name: clean(writer.professionalName),
      email: writer.email.toLowerCase(),
      address: writer.address,
      ipi_cae: clean(writer.ipiCae),
      pro: clean(writer.pro),
      publisher: clean(writer.publisher),
      contribution: writer.contribution,
      composition_percent: writer.compositionPercent,
      signing_token: randomBytes(32).toString("hex"),
    }));

    const { error: songwriterError } = await supabase.from("songwriters").insert(songwriterRows);
    if (songwriterError) throw songwriterError;

    const masterOwnerRows = input.masterOwners.map((owner, index) => {
      const linkedPosition = owner.linkedSongwriterPosition || null;
      return {
        agreement_id: id,
        position: index + 1,
        owner_name: owner.ownerName,
        ownership_percent: owner.ownershipPercent,
        isrc: clean(owner.isrc),
        email: linkedPosition ? null : lowerEmail(owner.email),
        address: linkedPosition ? null : clean(owner.address),
        linked_songwriter_position: linkedPosition,
        signing_token: linkedPosition ? null : randomBytes(32).toString("hex"),
      };
    });

    const { error: masterOwnerError } = await supabase.from("master_owners").insert(masterOwnerRows);
    if (masterOwnerError) throw masterOwnerError;

    return id;
  } catch (error) {
    if (created && id) {
      await supabase.from("agreements").delete().eq("id", id);
    }
    throw error;
  }
}
