import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import { assinarUrls } from "./storage";
import type { PerfilMenu } from "@/components/shell/tipos";

/** Perfis visíveis para quem está logado (RLS), na ordem, com contador de aguardando. */
export async function carregarPerfisMenu(supabase: SupabaseClient): Promise<PerfilMenu[]> {
  const [{ data: perfis }, { data: aguardando }] = await Promise.all([
    supabase
      .from("perfis")
      .select("id, nome, avatar_url")
      .eq("arquivado", false)
      .order("ordem")
      .order("nome"),
    supabase.from("posts").select("perfil_id").eq("status", "aguardando"),
  ]);
  const urls = await assinarUrls(supabase, (perfis ?? []).map((p) => p.avatar_url));
  const contagem = new Map<string, number>();
  for (const p of aguardando ?? []) contagem.set(p.perfil_id, (contagem.get(p.perfil_id) ?? 0) + 1);
  return (perfis ?? []).map((p) => ({
    id: p.id,
    nome: p.nome,
    avatarUrl: p.avatar_url ? (urls[p.avatar_url] ?? null) : null,
    aguardando: contagem.get(p.id) ?? 0,
  }));
}
