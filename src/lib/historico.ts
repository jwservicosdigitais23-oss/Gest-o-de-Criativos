import type { SupabaseClient } from "@supabase/supabase-js";

/** Grava uma ação na tabela historico (auditoria). */
export async function registrarHistorico(
  supabase: SupabaseClient,
  autorId: string,
  entrada: {
    entidade: "post" | "perfil" | "membro" | "importacao" | "sistema";
    entidade_id?: string | null;
    post_id?: string | null;
    perfil_id?: string | null;
    acao: string;
    versao?: number | null;
    detalhes?: Record<string, unknown>;
  },
) {
  const { error } = await supabase.from("historico").insert({
    autor_id: autorId,
    entidade: entrada.entidade,
    entidade_id: entrada.entidade_id ?? null,
    post_id: entrada.post_id ?? null,
    perfil_id: entrada.perfil_id ?? null,
    acao: entrada.acao,
    versao: entrada.versao ?? null,
    detalhes: entrada.detalhes ?? {},
  });
  if (error) console.error("Falha ao gravar histórico", error.message);
}
