import { randomBytes } from "crypto";
import { NextResponse } from "next/server";
import { isAdmin } from "@/lib/auth";
import { getSupabaseAdmin } from "@/lib/supabase";
import { agreementSchema } from "@/lib/validation";

export const runtime = "nodejs";

function clean(value?: string) {
  const trimmed = value?.trim() || "";
  return trimmed.length ? trimmed : null;
}

function errorMessage(error: unknown) {
  if (error instanceof Error) return error.message;

  if (typeof error === "object" && error !== null) {
    const e = error as { message?: unknown; details?: unknown; hint?: unknown; code?: unknown };
    return [e.message, e.details, e.hint, e.code].filter(Boolean).map(String).join(" | ") || JSON.stringify(error);
  }

  return "Unable to create agreement.";
}

export async function POST(request: Request) {
  if (!(await isAdmin())) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const supabase = getSupabaseAdmin();
  let agreementId: string | null = null;

  try {
    const input = agreementSchema.parse(await request.json());

    const { data: agreement, error: agreementError } = await supabase
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

    if (agreementError) throw agreementError;
    if (!agreement?.id) throw new Error("Agreement was not created.");

    agreementId = agreement.id;

    const songwriterRows = input.songwriters.map((writer, index) => ({
      agreement_id: agreementId,
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

    const masterOwnerRows = input.masterOwners.map((owner, index) => ({
      agreement_id: agreementId,
      position: index + 1,
      owner_name: owner.ownerName,
      ownership_percent: owner.ownershipPercent,
      isrc: clean(owner.isrc),
    }));

    const { error: masterOwnerError } = await supabase.from("master_owners").insert(masterOwnerRows);
    if (masterOwnerError) throw masterOwnerError;

    return NextResponse.json({ id: agreementId }, { status: 201 });
  } catch (error) {
    if (agreementId) {
      await supabase.from("agreements").delete().eq("id", agreementId);
    }

    console.error("Create agreement error:", error);

    return NextResponse.json(
      { error: errorMessage(error) },
      { status: 400 },
    );
  }
}
