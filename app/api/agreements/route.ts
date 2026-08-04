import { NextResponse } from "next/server";
import { isAdmin } from "@/lib/auth";
import { getSupabaseAdmin } from "@/lib/supabase";
import { agreementSchema } from "@/lib/validation";

export async function POST(request: Request) {
  if (!(await isAdmin())) return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  try {
    const input = agreementSchema.parse(await request.json());
    const supabase = getSupabaseAdmin();
    const { data, error } = await supabase.rpc("save_agreement", { p_agreement_id: null, p_data: input });
    if (error) throw error;
    return NextResponse.json({ id: data }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to create agreement.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
