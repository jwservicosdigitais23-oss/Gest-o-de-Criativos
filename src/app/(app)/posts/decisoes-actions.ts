"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { falha, mensagemErro, type Resultado } from "@/lib/acoes";
import { exigirMembro } from "@/lib/auth";

const decisaoSchema = z
  .object({
    postId: z.string().uuid(),
    decisao: z.enum(["aprovado", "revisar", "reprovado"]),
    observacao: z.string().trim().max(3000),
    itens: z.array(z.enum(["legenda", "arte", "cta", "data", "outro"])),
  })
  .superRefine((d, ctx) => {
    if (d.decisao === "revisar" && d.observacao.length < 10) {
      ctx.addIssue({ code: "custom", message: "Descreva o que precisa mudar (mínimo de 10 caracteres)." });
    }
    if (d.decisao === "reprovado" && d.observacao.length < 3) {
      ctx.addIssue({ code: "custom", message: "Informe o motivo da reprovação." });
    }
  });

/** A aprovadora só insere a decisão; o banco recalcula o status do post. */
export async function registrarDecisao(dados: z.input<typeof decisaoSchema>): Promise<Resultado> {
  const { supabase } = await exigirMembro({ gravacao: true });
  const parsed = decisaoSchema.safeParse(dados);
  if (!parsed.success) return falha(parsed.error.issues[0]!.message);
  const { postId, decisao, observacao, itens } = parsed.data;
  const { data: post } = await supabase.from("posts").select("versao").eq("id", postId).maybeSingle();
  if (!post) return falha("Post não encontrado.");
  const { error } = await supabase.from("decisoes").insert({
    post_id: postId,
    versao: post.versao,
    decisao,
    observacao: observacao || null,
    itens: decisao === "revisar" ? itens : [],
  });
  if (error) return falha(mensagemErro(error, "Não foi possível registrar a decisão."));
  revalidatePath("/", "layout");
  return { ok: true };
}

const comentarioSchema = z.object({
  postId: z.string().uuid(),
  texto: z.string().trim().min(1, "Escreva o comentário.").max(3000),
  decisaoId: z.string().uuid().nullable(),
});

export async function comentar(dados: z.input<typeof comentarioSchema>): Promise<Resultado> {
  const { supabase } = await exigirMembro({ gravacao: true });
  const parsed = comentarioSchema.safeParse(dados);
  if (!parsed.success) return falha(parsed.error.issues[0]!.message);
  const { data: post } = await supabase.from("posts").select("versao").eq("id", parsed.data.postId).maybeSingle();
  if (!post) return falha("Post não encontrado.");
  const { error } = await supabase.from("comentarios").insert({
    post_id: parsed.data.postId,
    versao: post.versao,
    decisao_id: parsed.data.decisaoId,
    texto: parsed.data.texto,
  });
  if (error) return falha(mensagemErro(error, "Não foi possível enviar o comentário."));
  revalidatePath(`/posts/${parsed.data.postId}`);
  return { ok: true };
}
