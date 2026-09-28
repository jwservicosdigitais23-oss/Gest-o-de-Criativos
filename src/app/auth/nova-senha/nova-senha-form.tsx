"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Campo } from "@/components/ui/input";
import { CampoSenha } from "@/components/auth/campo-senha";
import { salvarPrimeiraSenha } from "@/app/primeiro-acesso/actions";
import { RegrasSenha } from "@/components/auth/regras-senha";
import { ERRO_SENHA, senhaValida } from "@/lib/senha";

export function NovaSenhaForm({ nome }: { nome: string }) {
  const router = useRouter();
  const [erro, setErro] = useState<string | null>(null);
  const [carregando, setCarregando] = useState(false);
  const [senhaDigitada, setSenhaDigitada] = useState("");

  async function salvar(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    const senha = String(form.get("senha"));
    if (!senhaValida(senha)) return setErro(ERRO_SENHA);
    if (senha !== String(form.get("confirmacao"))) return setErro("As senhas não conferem.");
    setErro(null);
    setCarregando(true);
    const r = await salvarPrimeiraSenha(senha, String(form.get("confirmacao")));
    setCarregando(false);
    if (!r.ok) return setErro(r.erro);
    toast.success("Senha definida. Bem-vinda(o) ao CRM!");
    router.replace("/");
    router.refresh();
  }

  return (
    <form onSubmit={salvar} className="flex flex-col gap-5">
      <div>
        <h2 className="text-2xl font-bold text-navy-900">Defina sua senha</h2>
        {nome && <p className="mt-1 text-body text-text-muted">Olá, {nome}! Crie uma senha para acessar o CRM.</p>}
      </div>
      <Campo label="Nova senha" htmlFor="senha">
        <CampoSenha id="senha" name="senha" autoComplete="new-password" required minLength={10} onChange={(e) => setSenhaDigitada(e.target.value)} />
      </Campo>
      <RegrasSenha senha={senhaDigitada} className="-mt-2" />
      <Campo label="Confirme a senha" htmlFor="confirmacao">
        <CampoSenha id="confirmacao" name="confirmacao" autoComplete="new-password" required />
      </Campo>
      {erro && <p role="alert" className="text-body text-danger">{erro}</p>}
      <Button type="submit" size="lg" className="w-full" disabled={carregando}>
        {carregando && <Loader2 className="animate-spin" />}
        Salvar senha
      </Button>
    </form>
  );
}
