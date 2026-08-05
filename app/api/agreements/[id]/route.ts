import { NextResponse } from "next/server";
import { isAdmin } from "@/lib/auth";
import { errorMessage, saveAgreement } from "@/lib/saveAgreement";
import { agreementSchema } from "@/lib/validation";

export async function PUT(request: Request, context: { params: Promise<{ id: string }> }) {
  if (!(await isAdmin())) return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  try {
    const { id } = await context.params;
    const input = agreementSchema.parse(await request.json());
    const savedId = await saveAgreement(input, id);
    return NextResponse.json({ id: savedId });
  } catch (error) {
    return NextResponse.json({ error: errorMessage(error, "Unable to update agreement.") }, { status: 400 });
  }
}
