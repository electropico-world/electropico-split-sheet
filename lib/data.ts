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

  const { data: songwriter } = await supabase
    .from("songwriters")
    .select("agreement_id")
    .eq("signing_token", token)
    .maybeSingle();
  if (songwriter?.agreement_id) return getAgreementBundle(songwriter.agreement_id);

  const { data: masterOwner } = await supabase
    .from("master_owners")
    .select("agreement_id")
    .eq("signing_token", token)
    .maybeSingle();
  if (masterOwner?.agreement_id) return getAgreementBundle(masterOwner.agreement_id);

  return null;
}
