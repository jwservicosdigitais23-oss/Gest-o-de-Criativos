"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Campo } from "@/components/ui/input";
import { CampoSenha } from "@/components/auth/campo-senha";
import { createClient } from "@/lib/supabase/client";

export function NovaSenhaForm({ nome }: { nome: string }) {
  const router = useRouter();
  const [erro, setErro] = useState<string | null>(null);
  const [carregando, setCarregando] = useState(false);

  async function salvar(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    const senha = String(form.get("senha"));
    if (senha.length < 8) return setErro("A senha precisa ter pelo menos 8 caracteres.");
    if (senha !== String(form.get("confirmacao"))) return setErro("As senhas não conferem.");
    setErro(null);
    setCarregando(true);
    const { error } = await createClient().auth.updateUser({ password: senha });
    setCarregando(false);
    if (error) return setErro("Não foi possível salvar a senha. Tente novamente.");
    toast.success("Senha definida. Bem-vinda(o) ao CRM!");
    router.replace("/");
    router.refresh();
  }

  return (
    <form onSubmit={salvar} className="flex flex-col gap-5">
      <div>
        <h2 className="text-2xl font-bold text-azul-escuro">Defina sua senha</h2>
        {nome && <p className="mt-1 text-sm text-texto-2">Olá, {nome}! Crie uma senha para acessar o CRM.</p>}
      </div>
      <Campo label="Nova senha" htmlFor="senha" ajuda="Mínimo de 8 caracteres.">
        <CampoSenha id="senha" name="senha" autoComplete="new-password" required minLength={8} />
      </Campo>
      <Campo label="Confirme a senha" htmlFor="confirmacao">
        <CampoSenha id="confirmacao" name="confirmacao" autoComplete="new-password" required />
      </Campo>
      {erro && <p role="alert" className="text-sm text-vermelho">{erro}</p>}
      <Button type="submit" size="lg" className="w-full" disabled={carregando}>
        {carregando && <Loader2 className="animate-spin" />}
        Salvar senha
      </Button>
    </form>
  );
}
