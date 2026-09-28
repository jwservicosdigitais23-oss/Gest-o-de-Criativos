"use client";

import { useActionState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Campo, Input } from "@/components/ui/input";
import { CampoSenha } from "@/components/auth/campo-senha";
import { criarPrimeiroAdmin, type EstadoPrimeiroAcesso } from "./actions";

export function PrimeiroAcessoForm() {
  const router = useRouter();
  const [estado, acao, pendente] = useActionState<EstadoPrimeiroAcesso, FormData>(criarPrimeiroAdmin, {});

  useEffect(() => {
    if (estado.ok) {
      router.replace("/");
      router.refresh();
    }
  }, [estado.ok, router]);

  return (
    <form action={acao} className="flex flex-col gap-5">
      <div>
        <h2 className="text-2xl font-bold text-azul-escuro">Primeiro acesso</h2>
        <p className="mt-1 text-sm text-texto-2">
          Crie a conta do administrador. Depois disso, as demais pessoas entram só por convite.
        </p>
      </div>
      <Campo label="Nome" htmlFor="nome">
        <Input id="nome" name="nome" required autoComplete="name" />
      </Campo>
      <Campo label="E-mail" htmlFor="email">
        <Input id="email" name="email" type="email" required autoComplete="email" />
      </Campo>
      <Campo label="Senha" htmlFor="senha" ajuda="Mínimo de 8 caracteres.">
        <CampoSenha id="senha" name="senha" required minLength={8} autoComplete="new-password" />
      </Campo>
      {estado.erro && <p role="alert" className="text-sm text-vermelho">{estado.erro}</p>}
      <Button type="submit" size="lg" className="w-full" disabled={pendente}>
        {pendente && <Loader2 className="animate-spin" />}
        Criar acesso de administrador
      </Button>
    </form>
  );
}
