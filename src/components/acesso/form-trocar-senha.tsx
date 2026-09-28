"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { KeyRound } from "lucide-react";
import { toast } from "sonner";
import { trocarSenha } from "@/app/(app)/minha-conta/actions";
import { RegrasSenha } from "@/components/auth/regras-senha";
import { Button } from "@/components/ui/button";
import { Campo, PasswordInput } from "@/components/ui/input";
import { senhaValida } from "@/lib/senha";

export function FormTrocarSenha({ somenteLeitura = false }: { somenteLeitura?: boolean }) {
  const [atual, setAtual] = useState("");
  const [nova, setNova] = useState("");
  const [confirmacao, setConfirmacao] = useState("");
  const [erro, setErro] = useState<string | null>(null);
  const [pendente, iniciar] = useTransition();

  function salvar(e: React.FormEvent) {
    e.preventDefault();
    setErro(null);
    iniciar(async () => {
      const r = await trocarSenha(atual, nova, confirmacao);
      if (!r.ok) return setErro(r.erro);
      setAtual("");
      setNova("");
      setConfirmacao("");
      toast.success("Senha trocada com sucesso");
    });
  }

  return (
    <form onSubmit={salvar} className="grid gap-4 sm:grid-cols-2">
      <Campo label="Senha atual" htmlFor="senha-atual" className="sm:col-span-2">
        <PasswordInput id="senha-atual" value={atual} onChange={(e) => setAtual(e.target.value)} autoComplete="current-password" required />
      </Campo>
      <Campo label="Nova senha" htmlFor="senha-nova">
        <PasswordInput id="senha-nova" value={nova} onChange={(e) => setNova(e.target.value)} autoComplete="new-password" required />
      </Campo>
      <Campo label="Confirmar nova senha" htmlFor="senha-confirmacao">
        <PasswordInput id="senha-confirmacao" value={confirmacao} onChange={(e) => setConfirmacao(e.target.value)} autoComplete="new-password" required />
      </Campo>
      <RegrasSenha senha={nova} className="sm:col-span-2" />
      {erro && (
        <p role="alert" className="text-body text-danger sm:col-span-2">
          {erro}
        </p>
      )}
      <div className="flex flex-col-reverse items-center gap-3 sm:col-span-2 sm:flex-row sm:justify-between">
        <Link href="/esqueci-senha" className="text-label font-semibold text-blue-600 hover:underline">
          Esqueci minha senha
        </Link>
        <Button type="submit" carregando={pendente} disabled={somenteLeitura || !atual || !senhaValida(nova) || nova !== confirmacao}>
          <KeyRound /> Trocar senha
        </Button>
      </div>
    </form>
  );
}
