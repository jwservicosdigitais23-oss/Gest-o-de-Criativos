"use server";

import { redirect } from "next/navigation";
import { falha, type Resultado } from "@/lib/acoes";
import { obterSessao } from "@/lib/auth";
import { lerVerComo } from "@/lib/ver-como";
import { ERRO_SENHA, senhaValida } from "@/lib/senha";

function traduzirErroSenha(msg: string) {
  if (/different from the old|same/i.test(msg)) return "A nova senha precisa ser diferente da senha provisória.";
  if (/weak|pwned|leaked/i.test(msg)) return "Essa senha é fraca ou já apareceu em vazamentos. Escolha outra.";
  return "Não foi possível salvar a senha. Tente novamente.";
}

/**
 * Primeiro acesso: define a senha no Supabase Auth, baixa deve_trocar_senha
 * e registra no histórico (concluir_troca_senha). A senha não é gravada nem logada.
 */
export async function salvarPrimeiraSenha(senha: string, confirmacao: string): Promise<Resultado> {
  const { supabase, userId } = await obterSessao();
  if (!userId) redirect("/login");
  if (await lerVerComo()) return falha("Modo somente leitura.");
  if (!senhaValida(senha)) return falha(ERRO_SENHA);
  if (senha !== confirmacao) return falha("As senhas não conferem.");
  const { error } = await supabase.auth.updateUser({ password: senha });
  if (error) return falha(traduzirErroSenha(error.message));
  const { error: erroFlag } = await supabase.rpc("concluir_troca_senha");
  if (erroFlag) return falha("Senha salva, mas não foi possível liberar o acesso. Recarregue a página.");
  return { ok: true };
}
