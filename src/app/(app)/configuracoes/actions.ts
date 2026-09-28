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
import { criarAprovadora, listarNomes, redefinirSenhaProvisoria, type DadosNovaAprovadora, type DepsAcesso } from "@/lib/acessos";
import { SUPABASE_ANON_KEY, SUPABASE_URL } from "@/lib/supabase/env";

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
  const { supabase, userId } = await exigirAdmin({ gravacao: true });
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
  const { supabase, userId } = await exigirAdmin({ gravacao: true });
  const parsed = z.array(z.string().uuid()).safeParse(ids);
  if (!parsed.success) return falha("Ordem inválida.");
  const { error } = await supabase.rpc("reordenar_perfis", { p_ids: parsed.data });
  if (error) return falha(mensagemErro(error));
  await registrarHistorico(supabase, userId, { entidade: "perfil", acao: "reordenou_perfis", detalhes: { ids } });
  revalidar();
  return { ok: true };
}

export async function arquivarPerfil(id: string, arquivado: boolean): Promise<Resultado> {
  const { supabase, userId } = await exigirAdmin({ gravacao: true });
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
  const { supabase, userId } = await exigirAdmin({ gravacao: true });
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
  const { supabase } = await exigirAdmin({ gravacao: true });
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

/** Destino do link do convite: confirma o token e cai no primeiro acesso. */
async function destinoConvite() {
  return `${await origem()}/auth/confirm?next=/primeiro-acesso`;
}

/**
 * Dependências reais das regras de acesso: Supabase Auth com a service role
 * (só aqui, no servidor, depois de exigirAdmin) e o banco com o RLS do admin.
 */
function depsAcesso(supabase: Awaited<ReturnType<typeof exigirAdmin>>["supabase"], userId: string): DepsAcesso {
  const admin = createAdminClient();
  return {
    async convidar(email, opcoes) {
      const { data, error } = await admin.auth.admin.inviteUserByEmail(email, opcoes);
      return { id: data.user?.id ?? null, erro: error };
    },
    async criarUsuario(email, senha, dados) {
      const { data, error } = await admin.auth.admin.createUser({ email, password: senha, email_confirm: true, user_metadata: dados });
      return { id: data.user?.id ?? null, erro: error };
    },
    async definirSenha(id, senha) {
      // Confirma o e-mail junto: quem foi convidada e nunca abriu o link
      // também passa a entrar com a senha provisória.
      const { error } = await admin.auth.admin.updateUserById(id, { password: senha, email_confirm: true });
      return { erro: error };
    },
    async inserirMembro(m) {
      const { error } = await admin.from("membros").insert(m);
      return { erro: error };
    },
    async marcarTrocaSenha(id) {
      const { error } = await supabase.from("membros").update({ deve_trocar_senha: true }).eq("id", id);
      return { erro: error };
    },
    vincularPerfis: (id, perfis) => vincularPerfis(supabase, id, perfis),
    historico: (evento) => registrarHistorico(supabase, userId, evento),
  };
}

async function nomesDosPerfis(supabase: Awaited<ReturnType<typeof exigirAdmin>>["supabase"], ids: string[]) {
  if (!ids.length) return [];
  const { data } = await supabase.from("perfis").select("nome, ordem").in("id", ids).order("ordem");
  return (data ?? []).map((p) => p.nome as string);
}

/**
 * + Adicionar aprovadora: convite por e-mail ou senha provisória.
 * A senha provisória vai só para o Supabase Auth; nunca é gravada nem logada.
 */
export async function adicionarAprovadora(dados: DadosNovaAprovadora): Promise<Resultado> {
  const { supabase, userId } = await exigirAdmin({ gravacao: true });
  const { data: existente } = await supabase.from("membros").select("id").eq("email", String(dados.email).trim().toLowerCase()).maybeSingle();
  if (existente) return falha("Já existe um membro com esse e-mail.");
  const r = await criarAprovadora(depsAcesso(supabase, userId), dados, {
    redirectTo: await destinoConvite(),
    nomesPerfis: await nomesDosPerfis(supabase, dados.perfis ?? []),
  });
  if (!r.ok) return falha(r.erro);
  revalidar();
  return { ok: true };
}

/** Gera (no navegador do admin) e aplica uma nova senha provisória. */
export async function gerarNovaSenhaProvisoria(membroId: string, senha: string): Promise<Resultado> {
  const { supabase, userId } = await exigirAdmin({ gravacao: true });
  if (membroId === userId) return falha("Troque a sua própria senha em Minha conta.");
  const { data: membro } = await supabase.from("membros").select("papel").eq("id", membroId).maybeSingle();
  if (!membro) return falha("Membro não encontrado.");
  const r = await redefinirSenhaProvisoria(depsAcesso(supabase, userId), membroId, senha);
  if (!r.ok) return falha(r.erro);
  revalidar();
  return { ok: true };
}

/** Cliente sem cookies/PKCE, para o link funcionar em qualquer aparelho. */
function clienteLinkEmail() {
  return createSupabaseJs(SUPABASE_URL, SUPABASE_ANON_KEY, {
    auth: { flowType: "implicit", persistSession: false, autoRefreshToken: false },
  });
}

export async function reenviarConvite(membroId: string): Promise<Resultado> {
  const { supabase, userId } = await exigirAdmin({ gravacao: true });
  const { data: membro } = await supabase.from("membros").select("nome, email").eq("id", membroId).single();
  if (!membro) return falha("Membro não encontrado.");
  const { data: vinc } = await supabase.from("perfil_aprovadoras").select("perfil_id").eq("membro_id", membroId);
  const perfis = listarNomes(await nomesDosPerfis(supabase, (vinc ?? []).map((v) => v.perfil_id as string)));
  const redirectTo = await destinoConvite();
  const { error } = await createAdminClient().auth.admin.inviteUserByEmail(membro.email, {
    data: { nome: membro.nome, perfis },
    redirectTo,
  });
  if (error) {
    // Conta já confirmada (ex.: senha provisória): manda o link para criar a senha.
    const { error: erroReset } = await clienteLinkEmail().auth.resetPasswordForEmail(membro.email, { redirectTo });
    if (erroReset) return falha("Não foi possível reenviar: " + erroReset.message);
  }
  await supabase.from("membros").update({ deve_trocar_senha: true }).eq("id", membroId);
  await registrarHistorico(supabase, userId, {
    entidade: "membro",
    entidade_id: membroId,
    acao: "reenviou_convite",
    detalhes: { email: membro.email },
  });
  revalidar();
  return { ok: true };
}

/** Link de redefinição de senha (o admin nunca vê a senha de ninguém). */
export async function enviarLinkRedefinicao(membroId: string): Promise<Resultado> {
  const { supabase, userId } = await exigirAdmin({ gravacao: true });
  const { data: membro } = await supabase.from("membros").select("email").eq("id", membroId).single();
  if (!membro) return falha("Membro não encontrado.");
  const { error } = await clienteLinkEmail().auth.resetPasswordForEmail(membro.email, {
    redirectTo: `${await origem()}/auth/confirm?next=/auth/nova-senha`,
  });
  if (error) return falha("Não foi possível enviar o link: " + error.message);
  await registrarHistorico(supabase, userId, {
    entidade: "membro",
    entidade_id: membroId,
    acao: "enviou_link_redefinicao",
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
  const { supabase, userId } = await exigirAdmin({ gravacao: true });
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
  const { supabase, userId } = await exigirAdmin({ gravacao: true });
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

// ---------------------------------------------------------------------
// Sistema: limpeza de arquivos órfãos do Storage
// ---------------------------------------------------------------------
export async function limparOrfaos(): Promise<Resultado<{ removidos: number }>> {
  const { supabase, userId } = await exigirAdmin({ gravacao: true });
  const { data, error } = await supabase.rpc("arquivos_orfaos", { p_horas: 24 });
  if (error) return falha(mensagemErro(error));
  const nomes = ((data as { nome: string }[] | null) ?? []).map((o) => o.nome);
  let removidos = 0;
  for (let i = 0; i < nomes.length; i += 100) {
    const lote = nomes.slice(i, i + 100);
    const { error: e } = await supabase.storage.from(BUCKET_MIDIAS).remove(lote);
    if (!e) removidos += lote.length;
  }
  await registrarHistorico(supabase, userId, {
    entidade: "sistema",
    acao: "limpou_orfaos",
    detalhes: { removidos },
  });
  revalidatePath("/configuracoes");
  return { ok: true, dados: { removidos } };
}
