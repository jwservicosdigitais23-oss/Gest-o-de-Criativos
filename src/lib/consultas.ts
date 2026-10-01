import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import { BUCKET_MIDIAS } from "./constantes";
import { midiasDaVersao } from "./posts";
import { assinarUrls } from "./storage";
import type { Midia, Perfil, Post } from "./types";

export interface PerfilComAvatar extends Perfil {
  avatarSrc: string | null;
}

export async function carregarPerfis(
  supabase: SupabaseClient,
  incluirArquivados = false,
  perfisIds: string[] | null = null,
): Promise<PerfilComAvatar[]> {
  let q = supabase.from("perfis").select("*").order("ordem").order("nome");
  if (!incluirArquivados) q = q.eq("arquivado", false);
  if (perfisIds) q = q.in("id", perfisIds); // "Ver como": só os perfis dela
  const { data } = await q.returns<Perfil[]>();
  const urls = await assinarUrls(supabase, (data ?? []).map((p) => p.avatar_url));
  return (data ?? []).map((p) => ({ ...p, avatarSrc: p.avatar_url ? (urls[p.avatar_url] ?? null) : null }));
}

export interface Miniatura {
  tipo: Midia["tipo"];
  src: string | null;
  total: number;
}

/** Primeira mídia da versão atual de cada post (para os cards), com URL assinada. */
export async function carregarMiniaturas(
  supabase: SupabaseClient,
  posts: Pick<Post, "id" | "versao" | "status">[],
): Promise<Record<string, Miniatura>> {
  if (posts.length === 0) return {};
  const { data } = await supabase
    .from("midias")
    .select("id, post_id, versao, versao_removida, ordem, tipo, storage_path")
    .in(
      "post_id",
      posts.map((p) => p.id),
    )
    .returns<Midia[]>();
  const porPost = new Map<string, Midia[]>();
  for (const m of data ?? []) porPost.set(m.post_id, [...(porPost.get(m.post_id) ?? []), m]);
  const primeiras: Record<string, { m: Midia; total: number }> = {};
  for (const p of posts) {
    const lista = midiasDaVersao(porPost.get(p.id) ?? [], p.versao);
    if (lista[0]) primeiras[p.id] = { m: lista[0], total: lista.length };
  }
  const imagens = Object.values(primeiras)
    .filter(({ m }) => m.tipo === "imagem" && m.storage_path)
    .map(({ m }) => m.storage_path!);
  const urls: Record<string, string> = {};
  if (imagens.length) {
    const { data: assinadas } = await supabase.storage.from(BUCKET_MIDIAS).createSignedUrls(imagens, 3600);
    for (const a of assinadas ?? []) if (a.path && a.signedUrl) urls[a.path] = a.signedUrl;
  }
  const r: Record<string, Miniatura> = {};
  for (const [postId, { m, total }] of Object.entries(primeiras)) {
    r[postId] = { tipo: m.tipo, src: m.storage_path ? (urls[m.storage_path] ?? null) : null, total };
  }
  return r;
}

/** Nome de quem aprovou/reprovou a versão atual de cada post ("Aprovado por …"). */
export async function carregarDecididoPor(supabase: SupabaseClient, posts: Pick<Post, "id" | "status">[]) {
  const ids = posts.filter((p) => ["aprovado", "publicado", "reprovado"].includes(p.status)).map((p) => p.id);
  if (ids.length === 0) return {} as Record<string, string>;
  const { data } = await supabase.from("posts_decidido_por").select("post_id, autor_nome").in("post_id", ids);
  return Object.fromEntries((data ?? []).filter((d) => d.autor_nome).map((d) => [d.post_id as string, d.autor_nome as string]));
}

export async function contarObservacoes(supabase: SupabaseClient, postIds: string[]) {
  if (postIds.length === 0) return {} as Record<string, number>;
  const { data } = await supabase.from("posts_observacoes").select("post_id, observacoes").in("post_id", postIds);
  return Object.fromEntries((data ?? []).map((o) => [o.post_id as string, o.observacoes as number]));
}

/** URLs assinadas para exibir e para baixar (Content-Disposition: attachment). */
export async function assinarMidias(supabase: SupabaseClient, midias: Midia[]) {
  const caminhos = midias.filter((m) => m.storage_path).map((m) => m.storage_path!);
  const [ver, baixar] = await Promise.all([
    assinarUrls(supabase, caminhos),
    caminhos.length
      ? supabase.storage
          .from(BUCKET_MIDIAS)
          .createSignedUrls(caminhos, 3600, { download: true })
          .then(({ data }) => Object.fromEntries((data ?? []).filter((d) => d.path).map((d) => [d.path!, d.signedUrl])))
      : Promise.resolve({} as Record<string, string>),
  ]);
  return midias.map((m) => ({
    ...m,
    src: m.storage_path ? (ver[m.storage_path] ?? null) : m.url_externa,
    download: m.storage_path ? (baixar[m.storage_path] ?? null) : m.url_externa,
  }));
}
