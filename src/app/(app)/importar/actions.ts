"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { falha, mensagemErro, type Resultado } from "@/lib/acoes";
import { exigirAdmin } from "@/lib/auth";
import { versaoDeEdicao } from "@/lib/posts";
import type { Post } from "@/lib/types";
import { midiaSchema, type DadosMidia } from "@/lib/validacao";

export interface ResumoImportacao {
  importacao_id: string;
  criados: number;
  atualizados: number;
  ignorados: number;
  erros: number;
  detalhes: { linha: number; resultado: string; post_id?: string; motivo?: string }[];
}

const linhaSchema = z.object({
  linha: z.number().int(),
  chave_externa: z.string().nullable(),
  perfil_id: z.string().uuid(),
  data: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  hora: z.string().nullable(),
  tema: z.string().min(1).max(300),
  legenda: z.string(),
  formato: z.enum(["imagem", "carrossel", "video", "texto", "documento"]),
  pilar: z.string().nullable(),
  cta: z.string().nullable(),
  arquivo: z.string().nullable(),
});

/** Grava tudo numa única transação (RPC importar_cronograma). */
export async function importarCronograma(
  arquivo: string,
  linhas: z.input<typeof linhaSchema>[],
  rejeitadas: { linha: number; resultado: string; motivo?: string }[],
): Promise<Resultado<ResumoImportacao>> {
  const { supabase } = await exigirAdmin();
  const parsed = z.array(linhaSchema).max(2000, "Máximo de 2.000 linhas por importação.").safeParse(linhas);
  if (!parsed.success) return falha("Há linhas inválidas na planilha: " + parsed.error.issues[0]!.message);
  const { data, error } = await supabase.rpc("importar_cronograma", {
    p_arquivo: arquivo.slice(0, 200),
    p_linhas: parsed.data,
    p_rejeitadas: rejeitadas,
  });
  if (error) return falha(mensagemErro(error, "Não foi possível importar o cronograma."));
  revalidatePath("/", "layout");
  return { ok: true, dados: data as ResumoImportacao };
}

/** Anexo em lote: registra a mídia enviada ao Storage no post correspondente. */
export async function anexarMidia(postId: string, midia: DadosMidia): Promise<Resultado> {
  const { supabase } = await exigirAdmin();
  const parsed = midiaSchema.safeParse(midia);
  if (!parsed.success) return falha(parsed.error.issues[0]!.message);
  const { data: post } = await supabase.from("posts").select("*").eq("id", postId).maybeSingle<Post>();
  if (!post) return falha("Post não encontrado.");
  const versao = versaoDeEdicao(post);
  const { count } = await supabase.from("midias").select("id", { count: "exact", head: true }).eq("post_id", postId);
  const { error } = await supabase.from("midias").insert({
    post_id: postId,
    versao,
    ordem: count ?? 0,
    tipo: parsed.data.tipo,
    storage_path: parsed.data.storage_path ?? null,
    url_externa: parsed.data.url_externa ?? null,
    nome_arquivo: parsed.data.nome_arquivo,
    mime: parsed.data.mime ?? null,
    tamanho: parsed.data.tamanho ?? null,
    largura: parsed.data.largura ?? null,
    altura: parsed.data.altura ?? null,
  });
  if (error) return falha(mensagemErro(error, "Não foi possível anexar a mídia."));
  return { ok: true };
}

/** Envia para aprovação os posts importados que já têm mídia (ou são só texto). */
export async function enviarImportadosComMidia(postIds: string[]): Promise<Resultado<{ enviados: number; semMidia: number }>> {
  const { supabase } = await exigirAdmin();
  const ids = z.array(z.string().uuid()).parse(postIds);
  if (ids.length === 0) return { ok: true, dados: { enviados: 0, semMidia: 0 } };
  const [{ data: posts }, { data: midias }] = await Promise.all([
    supabase.from("posts").select("id, status, formato").in("id", ids),
    supabase.from("midias").select("post_id").in("post_id", ids).is("versao_removida", null),
  ]);
  const comMidia = new Set((midias ?? []).map((m) => m.post_id as string));
  let enviados = 0;
  let semMidia = 0;
  for (const p of posts ?? []) {
    if (p.status !== "rascunho") continue;
    if (!comMidia.has(p.id) && p.formato !== "texto") {
      semMidia++;
      continue;
    }
    const { error } = await supabase.rpc("enviar_para_aprovacao", { p_post_id: p.id });
    if (!error) enviados++;
  }
  revalidatePath("/", "layout");
  return { ok: true, dados: { enviados, semMidia } };
}
