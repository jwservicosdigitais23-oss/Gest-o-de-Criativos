import "server-only";

import { cache } from "react";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { Membro } from "@/lib/types";
import { lerVerComo } from "@/lib/ver-como";

/** Usuário logado + registro em membros (cacheado por requisição). */
export const obterSessao = cache(async () => {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  const userId = data?.claims?.sub as string | undefined;
  if (!userId) return { supabase, userId: null, email: null, membro: null };
  const { data: membro } = await supabase
    .from("membros")
    .select("*")
    .eq("id", userId)
    .maybeSingle<Membro>();
  return {
    supabase,
    userId,
    email: (data?.claims?.email as string | undefined) ?? null,
    membro: membro ?? null,
  };
});

export interface VerComo {
  /** Aprovadora cuja visão está sendo montada. */
  alvo: Membro;
  /** Perfis que ela vê (perfil_aprovadoras). */
  perfisIds: string[];
  /** O admin de verdade, que continua logado. */
  admin: Membro;
}

export const MENSAGEM_SOMENTE_LEITURA = "Modo “Ver como”: somente leitura. Saia da visualização para fazer alterações.";

/**
 * "Ver como" ativo? Só vale para um admin, com cookie assinado emitido para
 * ele, apontando para uma aprovadora ativa. Nada de sessão da outra pessoa:
 * o admin continua logado como admin.
 */
export const obterVerComo = cache(async (): Promise<VerComo | null> => {
  const { supabase, userId, membro } = await obterSessao();
  if (!userId || !membro?.ativo || membro.papel !== "admin") return null;
  const estado = await lerVerComo();
  if (!estado || estado.adminId !== userId) return null;
  const [{ data: alvo }, { data: vinculos }] = await Promise.all([
    supabase.from("membros").select("*").eq("id", estado.alvoId).maybeSingle<Membro>(),
    supabase.from("perfil_aprovadoras").select("perfil_id").eq("membro_id", estado.alvoId),
  ]);
  if (!alvo || !alvo.ativo || alvo.papel !== "aprovadora") return null;
  return { alvo, perfisIds: (vinculos ?? []).map((v) => v.perfil_id as string), admin: membro };
});

export interface OpcoesExigir {
  /** Server actions que gravam: recusadas no modo "Ver como". */
  gravacao?: boolean;
}

/**
 * Exige membro ativo; senão vai para o login ou para "acesso não liberado".
 * `membro` é a pessoa cuja visão é montada (no "Ver como", a aprovadora);
 * `real` é quem está logado. `perfisIds` restringe as consultas do admin.
 */
export async function exigirMembro(opcoes: OpcoesExigir = {}) {
  const sessao = await obterSessao();
  if (!sessao.userId) redirect("/login");
  if (!sessao.membro || !sessao.membro.ativo) redirect("/sem-acesso");
  if (sessao.membro.deve_trocar_senha) redirect("/primeiro-acesso");
  const verComo = await obterVerComo();
  if (verComo && opcoes.gravacao) throw new Error(MENSAGEM_SOMENTE_LEITURA);
  return {
    ...sessao,
    userId: sessao.userId,
    real: sessao.membro,
    membro: verComo?.alvo ?? sessao.membro,
    verComo,
    perfisIds: verComo?.perfisIds ?? null,
  };
}

export async function exigirAdmin(opcoes: OpcoesExigir = {}) {
  const sessao = await exigirMembro(opcoes);
  if (sessao.membro.papel !== "admin") redirect("/");
  return sessao;
}
