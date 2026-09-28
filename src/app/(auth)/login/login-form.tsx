"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Campo, Input } from "@/components/ui/input";
import { CampoSenha } from "@/components/auth/campo-senha";
import { createClient } from "@/lib/supabase/client";

export function LoginForm({ next, mostrarPrimeiroAcesso }: { next: string; mostrarPrimeiroAcesso: boolean }) {
  const router = useRouter();
  const [erro, setErro] = useState<string | null>(null);
  const [carregando, setCarregando] = useState(false);

  async function entrar(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setErro(null);
    const form = new FormData(e.currentTarget);
    setCarregando(true);
    const { error } = await createClient().auth.signInWithPassword({
      email: String(form.get("email")).trim(),
      password: String(form.get("senha")),
    });
    if (error) {
      setCarregando(false);
      setErro(
        error.message.includes("Invalid login")
          ? "E-mail ou senha incorretos."
          : "Não foi possível entrar. Tente novamente.",
      );
      return;
    }
    await createClient().rpc("registrar_acesso");
    router.replace(next.startsWith("/") && !next.startsWith("//") ? next : "/");
    router.refresh();
  }

  return (
    <form onSubmit={entrar} className="flex flex-col gap-5" noValidate>
      <div>
        <h2 className="text-2xl font-bold text-azul-escuro">Acessar o CRM</h2>
        <p className="mt-1 text-sm text-texto-2">Entre com o e-mail e a senha cadastrados.</p>
      </div>
      <Campo label="E-mail" htmlFor="email">
        <Input id="email" name="email" type="email" autoComplete="email" required placeholder="voce@exemplo.com" />
      </Campo>
      <Campo label="Senha" htmlFor="senha">
        <CampoSenha id="senha" name="senha" autoComplete="current-password" required />
      </Campo>
      <div className="-mt-2 flex justify-end">
        <Link href="/esqueci-senha" className="text-sm font-semibold text-azul-medio hover:underline">
          Esqueci minha senha
        </Link>
      </div>
      {erro && (
        <p role="alert" className="rounded-[10px] bg-st-reprovado-bg px-3 py-2 text-sm text-st-reprovado">
          {erro}
        </p>
      )}
      <Button type="submit" size="lg" className="w-full" disabled={carregando}>
        {carregando && <Loader2 className="animate-spin" />}
        Entrar
      </Button>
      {mostrarPrimeiroAcesso && (
        <p className="text-center text-sm text-texto-2">
          Primeira vez no sistema?{" "}
          <Link href="/primeiro-acesso" className="font-semibold text-azul-medio hover:underline">
            Criar o acesso de administrador
          </Link>
        </p>
      )}
    </form>
  );
}
