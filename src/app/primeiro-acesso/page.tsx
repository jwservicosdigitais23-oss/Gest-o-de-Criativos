import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { FormPrimeiroAcesso, HeroBoasVindas } from "@/components/acesso/primeiro-acesso";
import { LayoutAuth } from "@/components/auth/layout-auth";
import { obterSessao } from "@/lib/auth";
import { carregarPerfis } from "@/lib/consultas";

export const metadata: Metadata = { title: "Primeiro acesso" };

/** Troca obrigatória da senha (convite aceito ou senha provisória). */
export default async function PrimeiroAcessoPage() {
  const { supabase, userId, membro } = await obterSessao();
  if (!userId) redirect("/login?next=/primeiro-acesso");
  if (!membro || !membro.ativo) redirect("/sem-acesso");
  if (!membro.deve_trocar_senha) redirect("/");
  const perfis = membro.papel === "admin" ? [] : await carregarPerfis(supabase);
  return (
    <LayoutAuth hero={<HeroBoasVindas nome={membro.nome} perfis={perfis} />}>
      <FormPrimeiroAcesso nome={membro.nome} />
    </LayoutAuth>
  );
}
