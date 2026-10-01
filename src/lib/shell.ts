import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import { assinarUrls } from "./storage";
import type { PerfilMenu } from "@/components/shell/tipos";

/**
 * Perfis visíveis (RLS, ou os da aprovadora no "Ver como"), na ordem, com contador.
 * - Aprovadora (`aprovadoraId`): conta a fila dela — a mesma view do Painel
 *   (`pendencias_aprovadoras`), então sidebar, cartão e Painel sempre batem.
 * - Admin: conta todos os posts aguardando do perfil.
 */
export async function carregarPerfisMenu(
  supabase: SupabaseClient,
  perfisIds: string[] | null = null,
  aprovadoraId: string | null = null,
): Promise<PerfilMenu[]> {
  let qPerfis = supabase.from("perfis").select("id, nome, avatar_url").eq("arquivado", false).order("ordem").order("nome");
  let qContagem = aprovadoraId
    ? supabase.from("pendencias_aprovadoras").select("perfil_id").eq("membro_id", aprovadoraId)
    : supabase.from("posts").select("perfil_id").eq("status", "aguardando");
  // "Ver como": o admin enxerga tudo pelo RLS; restringe aos perfis dela.
  if (perfisIds) {
    qPerfis = qPerfis.in("id", perfisIds);
    qContagem = qContagem.in("perfil_id", perfisIds);
  }
  const [{ data: perfis }, { data: pendentes }] = await Promise.all([qPerfis, qContagem]);
  const urls = await assinarUrls(supabase, (perfis ?? []).map((p) => p.avatar_url));
  const contagem = contarPorPerfil((pendentes ?? []) as { perfil_id: string }[]);
  return (perfis ?? []).map((p) => ({
    id: p.id,
    nome: p.nome,
    avatarUrl: p.avatar_url ? (urls[p.avatar_url] ?? null) : null,
    aguardando: contagem.get(p.id) ?? 0,
  }));
}

export function contarPorPerfil(linhas: { perfil_id: string }[]) {
  const contagem = new Map<string, number>();
  for (const l of linhas) contagem.set(l.perfil_id, (contagem.get(l.perfil_id) ?? 0) + 1);
  return contagem;
}
