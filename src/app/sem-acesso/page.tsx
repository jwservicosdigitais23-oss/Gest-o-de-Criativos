import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Lock } from "lucide-react";
import { Logo } from "@/components/brand/logo";
import { BotaoSair } from "@/components/shell/botao-sair";
import { obterSessao } from "@/lib/auth";

export const metadata: Metadata = { title: "Acesso não liberado" };

export default async function SemAcessoPage() {
  const { userId, membro } = await obterSessao();
  if (!userId) redirect("/login");
  if (membro?.ativo) redirect("/");
  return (
    <main className="flex min-h-dvh flex-col items-center justify-center gap-8 px-6 text-center">
      <Logo />
      <div className="flex max-w-md flex-col items-center gap-3 rounded-[10px] border border-borda bg-white p-8 shadow-card">
        <span className="flex size-12 items-center justify-center rounded-full bg-st-revisao-bg text-st-revisao">
          <Lock className="size-6" aria-hidden />
        </span>
        <h1 className="text-xl font-bold">Seu acesso ainda não foi liberado. Fale com o Jonathan.</h1>
        <p className="text-sm text-texto-2">
          Assim que ele liberar seu acesso, é só entrar de novo com o mesmo e-mail.
        </p>
        <BotaoSair variante="botao" />
      </div>
    </main>
  );
}
