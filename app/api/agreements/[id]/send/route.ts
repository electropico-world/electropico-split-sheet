import { NextResponse } from "next/server";
import { isAdmin } from "@/lib/auth";
import { getAgreementBundle } from "@/lib/data";
import { sendSignatureInvitation } from "@/lib/email";
import { getSupabaseAdmin } from "@/lib/supabase";

export async function POST(_: Request, context: { params: Promise<{ id: string }> }) {
  if (!(await isAdmin())) return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  try {
    const { id } = await context.params;
    const bundle = await getAgreementBundle(id);
    if (!bundle) return NextResponse.json({ error: "Agreement not found." }, { status: 404 });
    if (bundle.status === "completed") return NextResponse.json({ error: "Completed agreements are locked." }, { status: 409 });

    const pending = bundle.songwriters.filter((writer) => !writer.signed_at);
    const results = await Promise.allSettled(pending.map((writer) => sendSignatureInvitation(bundle, writer)));
    const failed = results.filter((result) => result.status === "rejected");
    if (failed.length) {
      const reason = failed.map((result) => (result.status === "rejected" ? String(result.reason) : "")).join(" | ");
      return NextResponse.json({ error: `Some invitation emails failed: ${reason}` }, { status: 502 });
    }

    const supabase = getSupabaseAdmin();
    const { error } = await supabase
      .from("agreements")
      .update({ status: "pending", invitations_sent_at: new Date().toISOString() })
      .eq("id", id);
    if (error) throw error;
    return NextResponse.json({ sent: pending.length });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to send invitations.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
