"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { CONFLITO, falha, mensagemErro, type Resultado } from "@/lib/acoes";
import { exigirAdmin } from "@/lib/auth";
import { BUCKET_MIDIAS } from "@/lib/constantes";
import { registrarHistorico } from "@/lib/historico";
import { prazoPadrao } from "@/lib/datas";
import { midiasDaVersao, podeEditar, versaoDeEdicao } from "@/lib/posts";
import type { Midia, Post } from "@/lib/types";
import { midiaSchema, postSchema, type DadosMidia, type DadosPost } from "@/lib/validacao";

function revalidar() {
  revalidatePath("/", "layout");
}

/**
 * Cria ou edita um post e sincroniza as mídias da versão de edição.
 * `enviar` = também envia/reenvia para aprovação. Em posts já enviados
 * (aguardando/aprovado) salvar sempre reenvia: é uma nova versão.
 */
export async function salvarPost(
  dados: DadosPost,
  midias: DadosMidia[],
  enviar: boolean,
): Promise<Resultado<{ id: string }>> {
  const { supabase, userId } = await exigirAdmin({ gravacao: true });
  const parsed = postSchema.safeParse(dados);
  if (!parsed.success) return falha(parsed.error.issues[0]!.message);
  const listaMidias = z.array(midiaSchema).safeParse(midias);
  if (!listaMidias.success) return falha(listaMidias.error.issues[0]!.message);
  const { updated_at, ...campos } = parsed.data;

  const { data: existente } = await supabase.from("posts").select("*").eq("id", campos.id).maybeSingle<Post>();

  let versaoEdicao = 1;
  if (existente) {
    if (!podeEditar(existente.status)) return falha("Este post não pode mais ser editado.");
    if (updated_at && existente.updated_at !== updated_at) return falha(CONFLITO);
    versaoEdicao = versaoDeEdicao(existente);
    const { id, ...resto } = campos;
    const { error } = await supabase.from("posts").update(resto).eq("id", id);
    if (error) return falha(mensagemErro(error, "Não foi possível salvar o post."));
  } else {
    const { error } = await supabase.from("posts").insert({ ...campos, criado_por: userId, origem: "manual" });
    if (error) return falha(mensagemErro(error, "Não foi possível criar o post."));
  }

  // Sincroniza mídias da versão de edição
  const { data: todas } = await supabase.from("midias").select("*").eq("post_id", campos.id).returns<Midia[]>();
  const atuais = midiasDaVersao(todas ?? [], versaoEdicao);
  const idsMantidos = new Set(listaMidias.data.filter((m) => m.id).map((m) => m.id!));

  for (const m of atuais) {
    if (idsMantidos.has(m.id)) continue;
    if (m.versao === versaoEdicao) {
      await supabase.from("midias").delete().eq("id", m.id);
    } else {
      await supabase.from("midias").update({ versao_removida: versaoEdicao }).eq("id", m.id);
    }
  }

  const novas = listaMidias.data
    .map((m, ordem) => ({ m, ordem }))
    .filter(({ m }) => !m.id)
    .map(({ m, ordem }) => ({
      post_id: campos.id,
      versao: versaoEdicao,
      ordem,
      tipo: m.tipo,
      storage_path: m.storage_path ?? null,
      url_externa: m.url_externa ?? null,
      nome_arquivo: m.nome_arquivo,
      mime: m.mime ?? null,
      tamanho: m.tamanho ?? null,
      largura: m.largura ?? null,
      altura: m.altura ?? null,
    }));
  if (novas.length) {
    const { error } = await supabase.from("midias").insert(novas);
    if (error) return falha(mensagemErro(error, "Post salvo, mas falhou ao registrar as mídias."));
  }
  await Promise.all(
    listaMidias.data.map((m, ordem) =>
      m.id ? supabase.from("midias").update({ ordem }).eq("id", m.id) : Promise.resolve(),
    ),
  );

  await registrarHistorico(supabase, userId, {
    entidade: "post",
    entidade_id: campos.id,
    post_id: campos.id,
    perfil_id: campos.perfil_id,
    acao: existente ? "editou" : "criou",
    versao: versaoEdicao,
    detalhes: { tema: campos.tema },
  });

  const precisaReenviar = existente && (existente.status === "aguardando" || existente.status === "aprovado");
  if (enviar || precisaReenviar) {
    const { error } = await supabase.rpc("enviar_para_aprovacao", { p_post_id: campos.id });
    if (error) {
      revalidar();
      return falha(mensagemErro(error, "Post salvo, mas não foi possível enviar para aprovação."));
    }
  }

  revalidar();
  return { ok: true, dados: { id: campos.id } };
}

export async function enviarParaAprovacao(postId: string): Promise<Resultado> {
  const { supabase } = await exigirAdmin({ gravacao: true });
  const { error } = await supabase.rpc("enviar_para_aprovacao", { p_post_id: postId });
  if (error) return falha(mensagemErro(error, "Não foi possível enviar para aprovação."));
  revalidar();
  return { ok: true };
}

export async function marcarPublicado(postId: string, link: string): Promise<Resultado> {
  const { supabase } = await exigirAdmin({ gravacao: true });
  const { error } = await supabase.rpc("marcar_publicado", { p_post_id: postId, p_link: link });
  if (error) return falha(mensagemErro(error, "Não foi possível marcar como publicado."));
  revalidar();
  return { ok: true };
}

export async function duplicarPost(postId: string): Promise<Resultado<{ id: string }>> {
  const { supabase } = await exigirAdmin({ gravacao: true });
  const { data, error } = await supabase.rpc("duplicar_post", { p_post_id: postId });
  if (error) return falha(mensagemErro(error, "Não foi possível duplicar o post."));
  revalidar();
  return { ok: true, dados: { id: data as string } };
}

export async function excluirPost(postId: string): Promise<Resultado> {
  const { supabase } = await exigirAdmin({ gravacao: true });
  const { data, error } = await supabase.rpc("excluir_post", { p_post_id: postId });
  if (error) return falha(mensagemErro(error, "Não foi possível excluir o post."));
  const caminhos = (data as string[] | null) ?? [];
  if (caminhos.length) await supabase.storage.from(BUCKET_MIDIAS).remove(caminhos);
  revalidar();
  return { ok: true };
}

export async function arquivarPost(postId: string): Promise<Resultado> {
  const { supabase } = await exigirAdmin({ gravacao: true });
  const { error } = await supabase.rpc("arquivar_post", { p_post_id: postId });
  if (error) return falha(mensagemErro(error, "Não foi possível arquivar o post."));
  revalidar();
  return { ok: true };
}

/**
 * Calendário: muda a data de publicação (arrastar para outro dia).
 * Post aprovado volta para aprovação (nova versão). Publicados não mudam.
 */
export async function reagendarPost(postId: string, novaData: string): Promise<Resultado<{ voltouParaAprovacao: boolean }>> {
  const { supabase, userId } = await exigirAdmin({ gravacao: true });
  if (!/^\d{4}-\d{2}-\d{2}$/.test(novaData)) return falha("Data inválida.");
  const { data: post } = await supabase.from("posts").select("*").eq("id", postId).maybeSingle<Post>();
  if (!post) return falha("Post não encontrado.");
  if (["publicado", "reprovado", "arquivado"].includes(post.status)) {
    return falha("Posts publicados, reprovados ou arquivados não mudam de data.");
  }
  const { error } = await supabase
    .from("posts")
    .update({ data_publicacao: novaData, prazo_aprovacao: prazoPadrao(novaData) })
    .eq("id", postId);
  if (error) return falha(mensagemErro(error, "Não foi possível mudar a data."));
  await registrarHistorico(supabase, userId, {
    entidade: "post",
    entidade_id: postId,
    post_id: postId,
    perfil_id: post.perfil_id,
    acao: "reagendou",
    versao: post.versao,
    detalhes: { de: post.data_publicacao, para: novaData },
  });
  let voltou = false;
  if (post.status === "aprovado") {
    const { error: e2 } = await supabase.rpc("enviar_para_aprovacao", { p_post_id: postId });
    if (e2) return falha(mensagemErro(e2, "Data alterada, mas não foi possível reenviar para aprovação."));
    voltou = true;
  }
  revalidar();
  return { ok: true, dados: { voltouParaAprovacao: voltou } };
}
