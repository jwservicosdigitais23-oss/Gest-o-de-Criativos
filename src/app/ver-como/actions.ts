"use server";

import { redirect } from "next/navigation";
import { obterSessao } from "@/lib/auth";
import { registrarHistorico } from "@/lib/historico";
import type { Membro } from "@/lib/types";
import { apagarVerComo, gravarVerComo, lerVerComo, verComoDisponivel } from "@/lib/ver-como";
import { podeVerComo, textoHistoricoVerComo } from "@/lib/ver-como-regras";

/**
 * Entra no "Ver como". Não faz login como a aprovadora nem usa a sessão dela:
 * grava um cookie assinado na sessão do admin (30 min) e registra no histórico.
 */
export async function iniciarVerComo(alvoId: string) {
  const { supabase, userId, membro } = await obterSessao();
  if (!userId || !membro) redirect("/login");
  if (membro.papel !== "admin") throw new Error("Apenas o administrador pode usar o Ver como.");
  if (!verComoDisponivel()) throw new Error("Ver como indisponível: configure VER_COMO_SECRET no servidor.");
  const { data: alvo } = await supabase.from("membros").select("*").eq("id", alvoId).maybeSingle<Membro>();
  if (!podeVerComo(membro, alvo)) throw new Error("Só é possível ver como uma aprovadora ativa.");

  const anterior = await lerVerComo();
  await gravarVerComo(userId, alvo!.id);
  if (anterior?.alvoId !== alvo!.id) {
    await registrarHistorico(supabase, userId, {
      entidade: "membro",
      entidade_id: alvo!.id,
      acao: "ver_como_inicio",
      detalhes: { descricao: textoHistoricoVerComo(membro.nome, alvo!.nome, true) },
    });
  }
  redirect("/");
}

export async function sairVerComo(destino: "/configuracoes?aba=membros" | "/" = "/configuracoes?aba=membros") {
  const { supabase, userId, membro } = await obterSessao();
  const estado = await lerVerComo();
  await apagarVerComo();
  if (userId && membro?.papel === "admin" && estado?.adminId === userId) {
    const { data: alvo } = await supabase.from("membros").select("nome").eq("id", estado.alvoId).maybeSingle();
    await registrarHistorico(supabase, userId, {
      entidade: "membro",
      entidade_id: estado.alvoId,
      acao: "ver_como_fim",
      detalhes: { descricao: textoHistoricoVerComo(membro.nome, alvo?.nome ?? "aprovadora", false) },
    });
  }
  redirect(destino);
}
