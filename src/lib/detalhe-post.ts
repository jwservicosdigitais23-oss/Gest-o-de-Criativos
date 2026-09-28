import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import { assinarMidias } from "./consultas";
import { midiasDaVersao } from "./posts";
import { assinarUrls } from "./storage";
import type { Comentario, Decisao, Historico, Membro, Midia, Perfil, Post, PostVersao } from "./types";

/** Tudo o que o detalhe do post precisa, respeitando o RLS de quem está logado. */
export async function carregarDetalhePost(supabase: SupabaseClient, id: string, versaoPedida?: number) {
  const { data: post } = await supabase.from("posts").select("*").eq("id", id).maybeSingle<Post>();
  if (!post) return null;

  const [perfilR, midiasR, versoesR, decisoesR, comentariosR, historicoR, aprovR, membrosR, progressoR] = await Promise.all([
    supabase.from("perfis").select("*").eq("id", post.perfil_id).single<Perfil>(),
    supabase.from("midias").select("*").eq("post_id", id).returns<Midia[]>(),
    supabase.from("post_versoes").select("*").eq("post_id", id).order("versao").returns<PostVersao[]>(),
    supabase.from("decisoes").select("*").eq("post_id", id).order("created_at").returns<Decisao[]>(),
    supabase.from("comentarios").select("*").eq("post_id", id).order("created_at").returns<Comentario[]>(),
    supabase.from("historico").select("*").eq("post_id", id).order("created_at").returns<Historico[]>(),
    supabase.from("perfil_aprovadoras").select("membro_id").eq("perfil_id", post.perfil_id),
    supabase.from("membros").select("id, nome, email, papel, avatar_url, ativo").returns<Membro[]>(),
    supabase.from("posts_progresso").select("aprovacoes, total_aprovadoras, modo_aprovacao").eq("post_id", id).maybeSingle(),
  ]);

  const perfil = perfilR.data!;
  const versoes = versoesR.data ?? [];
  const versoesDisponiveis = [...new Set([...versoes.map((v) => v.versao), post.versao])].sort((a, b) => a - b);
  const versao =
    versaoPedida && versoesDisponiveis.includes(versaoPedida) ? versaoPedida : post.versao;
  const snapshot = versoes.find((v) => v.versao === versao);

  // Conteúdo exibido: o instantâneo enviado daquela versão; em rascunho, o próprio post.
  const conteudo = snapshot ?? {
    tema: post.tema,
    legenda: post.legenda,
    formato: post.formato,
    pilar: post.pilar,
    cta: post.cta,
    data_publicacao: post.data_publicacao,
    hora_publicacao: post.hora_publicacao,
  };

  const todasMidias = midiasR.data ?? [];
  const midias = await assinarMidias(supabase, midiasDaVersao(todasMidias, versao));
  const membros = membrosR.data ?? [];
  const urlsMembros = await assinarUrls(supabase, [perfil.avatar_url, ...membros.map((m) => m.avatar_url)]);
  const membrosMap = Object.fromEntries(
    membros.map((m) => [m.id, { ...m, avatarSrc: m.avatar_url ? (urlsMembros[m.avatar_url] ?? null) : null }]),
  );
  const aprovadorasIds = (aprovR.data ?? []).map((a) => a.membro_id as string);

  return {
    post,
    perfil: { ...perfil, avatarSrc: perfil.avatar_url ? (urlsMembros[perfil.avatar_url] ?? null) : null },
    versao,
    versoesDisponiveis,
    conteudo,
    midias,
    decisoes: decisoesR.data ?? [],
    comentarios: comentariosR.data ?? [],
    historico: historicoR.data ?? [],
    membros: membrosMap,
    aprovadoras: aprovadorasIds.map((i) => membrosMap[i]).filter(Boolean),
    aprovadorasIds,
    progresso: progressoR.data as { aprovacoes: number; total_aprovadoras: number; modo_aprovacao: string } | null,
  };
}

export type DetalhePost = NonNullable<Awaited<ReturnType<typeof carregarDetalhePost>>>;
