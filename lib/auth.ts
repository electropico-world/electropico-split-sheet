import { createHash, timingSafeEqual } from "crypto";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

const COOKIE_NAME = "ep_admin";

function sessionToken() {
  const password = process.env.ADMIN_PASSWORD;
  const secret = process.env.SESSION_SECRET;
  if (!password || !secret) return "";
  return createHash("sha256").update(`${password}:${secret}`).digest("hex");
}

export function passwordMatches(input: string) {
  const expected = process.env.ADMIN_PASSWORD || "";
  if (!expected) return false;
  const a = Buffer.from(input);
  const b = Buffer.from(expected);
  return a.length === b.length && timingSafeEqual(a, b);
}

export async function createAdminSession() {
  const store = await cookies();
  store.set(COOKIE_NAME, sessionToken(), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 14,
  });
}

export async function clearAdminSession() {
  const store = await cookies();
  store.delete(COOKIE_NAME);
}

export async function isAdmin() {
  const store = await cookies();
  const value = store.get(COOKIE_NAME)?.value || "";
  const expected = sessionToken();
  if (!value || !expected || value.length !== expected.length) return false;
  return timingSafeEqual(Buffer.from(value), Buffer.from(expected));
}

export async function requireAdmin() {
  if (!(await isAdmin())) redirect("/login");
}
