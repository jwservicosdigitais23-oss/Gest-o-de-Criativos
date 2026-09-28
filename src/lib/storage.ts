import type { SupabaseClient } from "@supabase/supabase-js";
import { BUCKET_MIDIAS } from "./constantes";

/** Gera URLs assinadas (1 h) para vários caminhos do bucket privado. */
export async function assinarUrls(
  supabase: SupabaseClient,
  caminhos: (string | null | undefined)[],
  segundos = 3600,
): Promise<Record<string, string>> {
  const unicos = [...new Set(caminhos.filter((c): c is string => Boolean(c)))];
  if (unicos.length === 0) return {};
  const { data } = await supabase.storage.from(BUCKET_MIDIAS).createSignedUrls(unicos, segundos);
  const mapa: Record<string, string> = {};
  for (const item of data ?? []) {
    if (item.path && item.signedUrl) mapa[item.path] = item.signedUrl;
  }
  return mapa;
}
