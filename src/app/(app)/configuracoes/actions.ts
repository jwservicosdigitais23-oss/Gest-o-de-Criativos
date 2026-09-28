"use server";

import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { z } from "zod";
import { exigirAdmin } from "@/lib/auth";
import { falha, mensagemErro, type Resultado } from "@/lib/acoes";
import { BUCKET_MIDIAS } from "@/lib/constantes";
import { registrarHistorico } from "@/lib/historico";
import { createClient as createSupabaseJs } from "@supabase/supabase-js";
import { createAdminClient } from "@/lib/supabase/admin";

function revalidar() {
  revalidatePath("/", "layout");
}

// ---------------------------------------------------------------------
// Perfis
// ---------------------------------------------------------------------
const perfilSchema = z.object({
  id: z.string().uuid(),
  nome: z.string().trim().min(2, "Informe o nome do perfil.").max(80),
  tipo: z.enum(["pessoal", "empresa"]),
  linkedin_url: z
    .string()
    .trim()
    .max(300)
    .refine((v) => v === "" || /^https?:\/\/(www\.)?linkedin\.com\//i.test(v), "Use um link do LinkedIn (https://www.linkedin.com/...).")
    .transform((v) => v || null),
  avatar_url: z.string().nullable(),
  modo_aprovacao: z.enum(["todas", "qualquer_uma"]),
  aprovadoras: z.array(z.string().uuid()),
});

export type DadosPerfil = z.input<typeof perfilSchema>;

export async function salvarPerfil(dados: DadosPerfil, novo: boolean): Promise<Resultado> {
  const { supabase, userId } = await exigirAdmin();
  const parsed = perfilSchema.safeParse(dados);
  if (!parsed.success) return falha(parsed.error.issues[0]!.message);
  const { aprovadoras, ...perfil } = parsed.data;

  if (novo) {
    const { data: ultimo } = await supabase
      .from("perfis")
      .select("ordem")
      .order("ordem", { ascending: false })
      .limit(1)
      .maybeSingle();
    const { error } = await supabase.from("perfis").insert({ ...perfil, ordem: (ultimo?.ordem ?? 0) + 1 });
    if (error) return falha(mensagemErro(error, "Não foi possível criar o perfil."));
  } else {
    const { id, ...campos } = perfil;
    const { error } = await supabase.from("perfis").update(campos).eq("id", id);
    if (error) return falha(mensagemErro(error, "Não foi possível salvar o perfil."));
  }

  // Sincroniza aprovadoras
  const { data: atuais } = await supabase
    .from("perfil_aprovadoras")
    .select("membro_id")
    .eq("perfil_id", perfil.id);
  const atuaisIds = new Set((atuais ?? []).map((a) => a.membro_id as string));
  const novos = aprovadoras.filter((m) => !atuaisIds.has(m));
  const removidos = [...atuaisIds].filter((m) => !aprovadoras.includes(m));
  if (novos.length) {
    const { error } = await supabase
      .from("perfil_aprovadoras")
      .insert(novos.map((membro_id) => ({ perfil_id: perfil.id, membro_id })));
    if (error) return falha(mensagemErro(error, "Perfil salvo, mas falhou ao vincular aprovadoras."));
  }
  if (removidos.length) {
    await supabase.from("perfil_aprovadoras").delete().eq("perfil_id", perfil.id).in("membro_id", removidos);
  }

  await registrarHistorico(supabase, userId, {
    entidade: "perfil",
    entidade_id: perfil.id,
    perfil_id: perfil.id,
    acao: novo ? "criou_perfil" : "editou_perfil",
    detalhes: { nome: perfil.nome, modo_aprovacao: perfil.modo_aprovacao, aprovadoras },
  });
  revalidar();
  return { ok: true };
}

export async function reordenarPerfis(ids: string[]): Promise<Resultado> {
  const { supabase, userId } = await exigirAdmin();
  const parsed = z.array(z.string().uuid()).safeParse(ids);
  if (!parsed.success) return falha("Ordem inválida.");
  const { error } = await supabase.rpc("reordenar_perfis", { p_ids: parsed.data });
  if (error) return falha(mensagemErro(error));
  await registrarHistorico(supabase, userId, { entidade: "perfil", acao: "reordenou_perfis", detalhes: { ids } });
  revalidar();
  return { ok: true };
}

export async function arquivarPerfil(id: string, arquivado: boolean): Promise<Resultado> {
  const { supabase, userId } = await exigirAdmin();
  const { data, error } = await supabase
    .from("perfis")
    .update({ arquivado })
    .eq("id", id)
    .select("nome")
    .single();
  if (error) return falha(mensagemErro(error));
  await registrarHistorico(supabase, userId, {
    entidade: "perfil",
    entidade_id: id,
    perfil_id: id,
    acao: arquivado ? "arquivou_perfil" : "reativou_perfil",
    detalhes: { nome: data.nome },
  });
  revalidar();
  return { ok: true };
}

/** Exclui perfil sem posts. Com posts, use arquivar ou a exclusão definitiva. */
export async function excluirPerfil(id: string): Promise<Resultado> {
  const { supabase, userId } = await exigirAdmin();
  const { count } = await supabase.from("posts").select("id", { count: "exact", head: true }).eq("perfil_id", id);
  if ((count ?? 0) > 0) return falha("Este perfil tem posts. Arquive-o ou faça a exclusão definitiva.");
  const { data: perfil } = await supabase.from("perfis").select("nome, avatar_url").eq("id", id).single();
  const { error } = await supabase.from("perfis").delete().eq("id", id);
  if (error) return falha(mensagemErro(error));
  if (perfil?.avatar_url) await supabase.storage.from(BUCKET_MIDIAS).remove([perfil.avatar_url]);
  await registrarHistorico(supabase, userId, {
    entidade: "perfil",
    entidade_id: id,
    perfil_id: id,
    acao: "excluiu_perfil",
    detalhes: { nome: perfil?.nome },
  });
  revalidar();
  return { ok: true };
}

export async function excluirPerfilDefinitivo(id: string, confirmacao: string): Promise<Resultado> {
  const { supabase } = await exigirAdmin();
  const { data: caminhos, error } = await supabase.rpc("excluir_perfil_definitivo", {
    p_perfil_id: id,
    p_confirmacao: confirmacao,
  });
  if (error) return falha(mensagemErro(error));
  const lista = (caminhos as string[] | null) ?? [];
  for (let i = 0; i < lista.length; i += 100) {
    await supabase.storage.from(BUCKET_MIDIAS).remove(lista.slice(i, i + 100));
  }
  revalidar();
  return { ok: true };
}

// ---------------------------------------------------------------------
// Membros
// ---------------------------------------------------------------------
const membroSchema = z.object({
  nome: z.string().trim().min(2, "Informe o nome."),
  email: z.string().trim().toLowerCase().email("E-mail inválido."),
  papel: z.enum(["admin", "aprovadora"]),
  perfis: z.array(z.string().uuid()),
});

export type DadosConvite = z.input<typeof membroSchema>;

async function origem() {
  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host");
  const proto = h.get("x-forwarded-proto") ?? "https";
  return `${proto}://${host}`;
}

async function vincularPerfis(
  supabase: Awaited<ReturnType<typeof exigirAdmin>>["supabase"],
  membroId: string,
  perfis: string[],
) {
  const { data: atuais } = await supabase.from("perfil_aprovadoras").select("perfil_id").eq("membro_id", membroId);
  const atuaisIds = new Set((atuais ?? []).map((a) => a.perfil_id as string));
  const novos = perfis.filter((p) => !atuaisIds.has(p));
  const removidos = [...atuaisIds].filter((p) => !perfis.includes(p));
  if (novos.length) {
    const { error } = await supabase
      .from("perfil_aprovadoras")
      .insert(novos.map((perfil_id) => ({ perfil_id, membro_id: membroId })));
    if (error) throw error;
  }
  if (removidos.length) {
    await supabase.from("perfil_aprovadoras").delete().eq("membro_id", membroId).in("perfil_id", removidos);
  }
}

/**
 * Convida por e-mail (service role, só no servidor) e cria o registro em membros.
 * A pessoa recebe o e-mail do Supabase para definir a senha.
 */
export async function convidarMembro(dados: DadosConvite): Promise<Resultado> {
  const { supabase, userId } = await exigirAdmin();
  const parsed = membroSchema.safeParse(dados);
  if (!parsed.success) return falha(parsed.error.issues[0]!.message);
  const { nome, email, papel, perfis } = parsed.data;

  const { data: existente } = await supabase.from("membros").select("id").eq("email", email).maybeSingle();
  if (existente) return falha("Já existe um membro com esse e-mail.");

  const admin = createAdminClient();
  const { data, error } = await admin.auth.admin.inviteUserByEmail(email, {
    data: { nome },
    redirectTo: `${await origem()}/auth/confirm?next=/auth/nova-senha`,
  });
  if (error || !data.user) {
    return falha(
      error?.message?.includes("already been registered")
        ? "Esse e-mail já tem conta no Supabase Auth. Remova-o em Authentication › Users ou use outro e-mail."
        : "Não foi possível enviar o convite: " + (error?.message ?? "erro desconhecido"),
    );
  }

  const { error: erroMembro } = await admin.from("membros").insert({ id: data.user.id, nome, email, papel });
  if (erroMembro) return falha(mensagemErro(erroMembro, "Convite enviado, mas falhou ao registrar o membro."));

  try {
    await vincularPerfis(supabase, data.user.id, papel === "aprovadora" ? perfis : []);
  } catch (e) {
    return falha(mensagemErro(e as { code?: string }, "Membro criado, mas falhou ao vincular perfis."));
  }

  await registrarHistorico(supabase, userId, {
    entidade: "membro",
    entidade_id: data.user.id,
    acao: "convidou_membro",
    detalhes: { nome, email, papel, perfis },
  });
  revalidar();
  return { ok: true };
}

export async function reenviarConvite(membroId: string): Promise<Resultado> {
  const { supabase, userId } = await exigirAdmin();
  const { data: membro } = await supabase.from("membros").select("nome, email").eq("id", membroId).single();
  if (!membro) return falha("Membro não encontrado.");
  const admin = createAdminClient();
  const redirectTo = `${await origem()}/auth/confirm?next=/auth/nova-senha`;
  const { error } = await admin.auth.admin.inviteUserByEmail(membro.email, { data: { nome: membro.nome }, redirectTo });
  if (error) {
    // Já confirmou o convite antes: manda o link de redefinição de senha.
    // Cliente sem cookies/PKCE, para o link funcionar no aparelho da pessoa.
    const anon = createSupabaseJs(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
      auth: { flowType: "implicit", persistSession: false, autoRefreshToken: false },
    });
    const { error: erroReset } = await anon.auth.resetPasswordForEmail(membro.email, { redirectTo });
    if (erroReset) return falha("Não foi possível reenviar: " + erroReset.message);
  }
  await registrarHistorico(supabase, userId, {
    entidade: "membro",
    entidade_id: membroId,
    acao: "reenviou_convite",
    detalhes: { email: membro.email },
  });
  return { ok: true };
}

const edicaoSchema = z.object({
  id: z.string().uuid(),
  nome: z.string().trim().min(2, "Informe o nome."),
  papel: z.enum(["admin", "aprovadora"]),
  perfis: z.array(z.string().uuid()),
});

export async function editarMembro(dados: z.input<typeof edicaoSchema>): Promise<Resultado> {
  const { supabase, userId } = await exigirAdmin();
  const parsed = edicaoSchema.safeParse(dados);
  if (!parsed.success) return falha(parsed.error.issues[0]!.message);
  const { id, nome, papel, perfis } = parsed.data;

  if (id === userId && papel !== "admin") return falha("Você não pode remover o seu próprio papel de administrador.");

  const { error } = await supabase.from("membros").update({ nome, papel }).eq("id", id);
  if (error) return falha(mensagemErro(error));
  try {
    await vincularPerfis(supabase, id, papel === "aprovadora" ? perfis : []);
  } catch (e) {
    return falha(mensagemErro(e as { code?: string }));
  }
  await registrarHistorico(supabase, userId, {
    entidade: "membro",
    entidade_id: id,
    acao: "editou_membro",
    detalhes: { nome, papel, perfis },
  });
  revalidar();
  return { ok: true };
}

/** Desativar bloqueia o login (ban no Auth) sem apagar o histórico. */
export async function definirAtivo(membroId: string, ativo: boolean): Promise<Resultado> {
  const { supabase, userId } = await exigirAdmin();
  if (membroId === userId && !ativo) return falha("Você não pode desativar o seu próprio acesso.");
  const { error } = await supabase.from("membros").update({ ativo }).eq("id", membroId);
  if (error) return falha(mensagemErro(error));
  const admin = createAdminClient();
  const { error: erroAuth } = await admin.auth.admin.updateUserById(membroId, {
    ban_duration: ativo ? "none" : "876000h",
  });
  if (erroAuth) console.error("Falha ao atualizar bloqueio no Auth", erroAuth.message);
  await registrarHistorico(supabase, userId, {
    entidade: "membro",
    entidade_id: membroId,
    acao: ativo ? "reativou_membro" : "desativou_membro",
  });
  revalidar();
  return { ok: true };
}
