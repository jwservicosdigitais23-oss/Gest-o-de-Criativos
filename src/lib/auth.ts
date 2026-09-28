import "server-only";

import { cache } from "react";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { Membro } from "@/lib/types";

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

/** Exige membro ativo; senão vai para o login ou para "acesso não liberado". */
export async function exigirMembro() {
  const sessao = await obterSessao();
  if (!sessao.userId) redirect("/login");
  if (!sessao.membro || !sessao.membro.ativo) redirect("/sem-acesso");
  return { ...sessao, membro: sessao.membro, userId: sessao.userId };
}

export async function exigirAdmin() {
  const sessao = await exigirMembro();
  if (sessao.membro.papel !== "admin") redirect("/");
  return sessao;
}
