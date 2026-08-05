import { NextResponse } from "next/server";
import { completeAgreementIfReady } from "@/lib/complete";
import { getAgreementBySigningToken } from "@/lib/data";
import { getSigningPartyByToken } from "@/lib/signing";
import { getSupabaseAdmin } from "@/lib/supabase";
import { signatureSchema } from "@/lib/validation";

export async function POST(request: Request, context: { params: Promise<{ token: string }> }) {
  try {
    const { token } = await context.params;
    const input = signatureSchema.parse(await request.json());
    const bundle = await getAgreementBySigningToken(token);
    if (!bundle) return NextResponse.json({ error: "This signing link is invalid." }, { status: 404 });
    if (bundle.status === "completed") return NextResponse.json({ error: "This agreement is already complete." }, { status: 409 });

    const party = getSigningPartyByToken(bundle, token);
    if (!party) return NextResponse.json({ error: "Signer not found." }, { status: 404 });
    if (party.signedAt) return NextResponse.json({ error: "You have already signed this agreement." }, { status: 409 });

    const supabase = getSupabaseAdmin();
    const table = party.role === "songwriter" ? "songwriters" : "master_owners";
    const { error } = await supabase
      .from(table)
      .update({ signed_name: input.signedName, signature_data: input.signatureData, signed_at: new Date().toISOString() })
      .eq("id", party.id)
      .is("signed_at", null);
    if (error) throw error;

    const result = await completeAgreementIfReady(bundle.id);
    return NextResponse.json({ signed: true, completed: result.status === "completed" });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to save signature.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
