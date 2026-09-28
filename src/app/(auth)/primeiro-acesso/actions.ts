"use server";

import { z } from "zod";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

const schema = z.object({
  nome: z.string().trim().min(2, "Informe seu nome."),
  email: z.string().trim().email("E-mail inválido."),
  senha: z.string().min(8, "A senha precisa ter pelo menos 8 caracteres."),
});

export type EstadoPrimeiroAcesso = { erro?: string; ok?: boolean };

/**
 * Cria o primeiro usuário (vira administrador pelo trigger handle_new_user).
 * Só funciona enquanto não existe nenhum administrador — assim o cadastro
 * público pode ficar desligado no Supabase Auth.
 */
export async function criarPrimeiroAdmin(
  _: EstadoPrimeiroAcesso,
  formData: FormData,
): Promise<EstadoPrimeiroAcesso> {
  const parsed = schema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { erro: parsed.error.issues[0]?.message };

  const supabase = await createClient();
  const { data: temAdmin } = await supabase.rpc("sistema_tem_admin");
  if (temAdmin) return { erro: "O administrador já foi cadastrado. Faça login." };

  const admin = createAdminClient();
  const { error } = await admin.auth.admin.createUser({
    email: parsed.data.email,
    password: parsed.data.senha,
    email_confirm: true,
    user_metadata: { nome: parsed.data.nome },
  });
  if (error) return { erro: "Não foi possível criar o acesso: " + error.message };

  const { error: loginErro } = await supabase.auth.signInWithPassword({
    email: parsed.data.email,
    password: parsed.data.senha,
  });
  if (loginErro) return { erro: "Conta criada. Faça login para continuar." };
  return { ok: true };
}
