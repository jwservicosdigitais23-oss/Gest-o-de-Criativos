"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowLeft, Loader2, MailCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Campo, Input } from "@/components/ui/input";
import { createClient } from "@/lib/supabase/client";

export default function EsqueciSenhaPage() {
  const [enviado, setEnviado] = useState(false);
  const [carregando, setCarregando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  async function enviar(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setErro(null);
    setCarregando(true);
    const email = String(new FormData(e.currentTarget).get("email")).trim();
    const { error } = await createClient().auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/auth/confirm?next=/auth/nova-senha`,
    });
    setCarregando(false);
    if (error) {
      setErro("Não foi possível enviar o e-mail agora. Tente de novo em alguns minutos.");
      return;
    }
    setEnviado(true);
  }

  if (enviado) {
    return (
      <div className="flex flex-col items-start gap-4">
        <MailCheck className="size-10 text-azul-medio" aria-hidden />
        <h2 className="text-2xl font-bold text-azul-escuro">Confira seu e-mail</h2>
        <p className="text-sm text-texto-2">
          Se o e-mail estiver cadastrado, você receberá um link para criar uma nova senha.
        </p>
        <Link href="/login" className="text-sm font-semibold text-azul-medio hover:underline">
          Voltar para o login
        </Link>
      </div>
    );
  }

  return (
    <form onSubmit={enviar} className="flex flex-col gap-5">
      <Link href="/login" className="inline-flex items-center gap-1 text-sm font-semibold text-azul-medio hover:underline">
        <ArrowLeft className="size-4" /> Voltar
      </Link>
      <div>
        <h2 className="text-2xl font-bold text-azul-escuro">Esqueci minha senha</h2>
        <p className="mt-1 text-sm text-texto-2">Informe seu e-mail para receber o link de redefinição.</p>
      </div>
      <Campo label="E-mail" htmlFor="email">
        <Input id="email" name="email" type="email" required autoComplete="email" />
      </Campo>
      {erro && <p role="alert" className="text-sm text-vermelho">{erro}</p>}
      <Button type="submit" size="lg" className="w-full" disabled={carregando}>
        {carregando && <Loader2 className="animate-spin" />}
        Enviar link
      </Button>
    </form>
  );
}
