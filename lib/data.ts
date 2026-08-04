import { getSupabaseAdmin } from "./supabase";
import type { AgreementBundle } from "./types";

export async function getAgreementBundle(id: string): Promise<AgreementBundle | null> {
  const supabase = getSupabaseAdmin();
  const { data: agreement, error } = await supabase.from("agreements").select("*").eq("id", id).single();
  if (error || !agreement) return null;

  const [{ data: songwriters }, { data: masterOwners }] = await Promise.all([
    supabase.from("songwriters").select("*").eq("agreement_id", id).order("position"),
    supabase.from("master_owners").select("*").eq("agreement_id", id).order("position"),
  ]);

  return {
    ...agreement,
    songwriters: songwriters || [],
    master_owners: masterOwners || [],
  } as AgreementBundle;
}

export async function getAgreementBySigningToken(token: string): Promise<AgreementBundle | null> {
  const supabase = getSupabaseAdmin();
  const { data: songwriter, error } = await supabase
    .from("songwriters")
    .select("agreement_id")
    .eq("signing_token", token)
    .single();
  if (error || !songwriter) return null;
  return getAgreementBundle(songwriter.agreement_id);
}
