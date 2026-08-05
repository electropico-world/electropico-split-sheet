import { NextResponse } from "next/server";
import { isAdmin } from "@/lib/auth";
import { errorMessage, saveAgreement } from "@/lib/saveAgreement";
import { agreementSchema } from "@/lib/validation";

export const runtime = "nodejs";

export async function POST(request: Request) {
  if (!(await isAdmin())) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  try {
    const input = agreementSchema.parse(await request.json());
    const id = await saveAgreement(input);
    return NextResponse.json({ id }, { status: 201 });
  } catch (error) {
    console.error("Create agreement error:", error);
    return NextResponse.json({ error: errorMessage(error, "Unable to create agreement.") }, { status: 400 });
  }
}
