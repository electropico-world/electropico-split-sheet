import { NextResponse } from "next/server";
import { isAdmin } from "@/lib/auth";
import { getSupabaseAdmin } from "@/lib/supabase";
import { agreementSchema } from "@/lib/validation";

function getErrorMessage(error: unknown) {
  if (error instanceof Error) return error.message;

  if (typeof error === "object" && error !== null) {
    const supabaseError = error as {
      message?: unknown;
      details?: unknown;
      hint?: unknown;
      code?: unknown;
    };

    const parts = [
      supabaseError.message,
      supabaseError.details,
      supabaseError.hint,
      supabaseError.code,
    ]
      .filter(Boolean)
      .map(String);

    if (parts.length) return parts.join(" | ");

    try {
      return JSON.stringify(error);
    } catch {
      return "Unable to create agreement.";
    }
  }

  return "Unable to create agreement.";
}

export async function POST(request: Request) {
  if (!(await isAdmin())) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  try {
    const input = agreementSchema.parse(await request.json());
    const supabase = getSupabaseAdmin();

    const { data, error } = await supabase.rpc("save_agreement", {
      p_agreement_id: null,
      p_data: input,
    });

    if (error) {
      console.error("Create agreement Supabase error:", error);
      throw error;
    }

    return NextResponse.json({ id: data }, { status: 201 });
  } catch (error) {
    console.error("Create agreement error:", error);

    return NextResponse.json(
      { error: getErrorMessage(error) },
      { status: 400 },
    );
  }
}
