"use server";

import { createClient as createSupabaseJs } from "@supabase/supabase-js";
import { falha, type Resultado } from "@/lib/acoes";
import { exigirMembro } from "@/lib/auth";
import { ERRO_SENHA, senhaValida } from "@/lib/senha";
import { SUPABASE_ANON_KEY, SUPABASE_URL } from "@/lib/supabase/env";

/** Troca a própria senha: confere a atual antes. Nada é gravado nem logado. */
export async function trocarSenha(atual: string, nova: string, confirmacao: string): Promise<Resultado> {
  const { supabase, email } = await exigirMembro({ gravacao: true });
  if (!email) return falha("Sessão inválida. Entre novamente.");
  if (!senhaValida(nova)) return falha(ERRO_SENHA);
  if (nova !== confirmacao) return falha("As senhas não conferem.");
  if (nova === atual) return falha("A nova senha precisa ser diferente da atual.");

  // Confere a senha atual num cliente isolado (sem tocar nos cookies da sessão).
  const conferencia = createSupabaseJs(SUPABASE_URL, SUPABASE_ANON_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { error: erroAtual } = await conferencia.auth.signInWithPassword({ email, password: atual });
  if (erroAtual) return falha("A senha atual está incorreta.");
  await conferencia.auth.signOut({ scope: "local" });

  const { error } = await supabase.auth.updateUser({ password: nova });
  if (error) return falha("Não foi possível trocar a senha. Tente novamente.");
  await supabase.rpc("concluir_troca_senha");
  return { ok: true };
}
