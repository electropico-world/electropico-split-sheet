import { NextResponse } from "next/server";
import { createAdminSession, passwordMatches } from "@/lib/auth";

export async function POST(request: Request) {
  const contentType = request.headers.get("content-type") || "";
  let password = "";
  if (contentType.includes("application/json")) {
    const body = await request.json();
    password = String(body.password || "");
  } else {
    const form = await request.formData();
    password = String(form.get("password") || "");
  }

  if (!passwordMatches(password)) {
    const url = new URL("/login?error=1", request.url);
    return NextResponse.redirect(url, 303);
  }
  await createAdminSession();
  return NextResponse.redirect(new URL("/", request.url), 303);
}
