import { NextResponse } from "next/server";
import { isAdmin } from "@/lib/auth";
import { getAgreementBundle } from "@/lib/data";
import { getSupabaseAdmin } from "@/lib/supabase";

export async function GET(_: Request, context: { params: Promise<{ id: string }> }) {
  if (!(await isAdmin())) return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  const { id } = await context.params;
  const bundle = await getAgreementBundle(id);
  if (!bundle || !bundle.final_pdf_path) return NextResponse.json({ error: "Final PDF is not available." }, { status: 404 });

  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase.storage.from("completed-agreements").download(bundle.final_pdf_path);
  if (error || !data) return NextResponse.json({ error: "Unable to download PDF." }, { status: 500 });
  const bytes = await data.arrayBuffer();
  const filename = `${bundle.song_title.replace(/[^a-z0-9]+/gi, "_")}_Split_Agreement.pdf`;
  return new NextResponse(bytes, {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "private, no-store",
    },
  });
}
