import { NextResponse } from "next/server";
import { isAdmin } from "@/lib/auth";
import { getSupabaseAdmin } from "@/lib/supabase";
import { agreementSchema } from "@/lib/validation";

export async function PUT(request: Request, context: { params: Promise<{ id: string }> }) {
  if (!(await isAdmin())) return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  try {
    const { id } = await context.params;
    const input = agreementSchema.parse(await request.json());
    const supabase = getSupabaseAdmin();
    const { data, error } = await supabase.rpc("save_agreement", { p_agreement_id: id, p_data: input });
    if (error) throw error;
    return NextResponse.json({ id: data });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to update agreement.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
