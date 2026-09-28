import type { Metadata } from "next";
import { FormPrimeiroAcesso, HeroBoasVindas } from "@/components/acesso/primeiro-acesso";
import { LayoutAuth } from "@/components/auth/layout-auth";
import { exigirMembro } from "@/lib/auth";
import { carregarPerfis } from "@/lib/consultas";

export const metadata: Metadata = { title: "Prévia · primeiro acesso" };

export default async function PreviaPrimeiroAcessoPage() {
  const { supabase, membro, perfisIds } = await exigirMembro();
  const perfis = await carregarPerfis(supabase, false, perfisIds);
  return (
    <LayoutAuth hero={<HeroBoasVindas nome={membro.nome} perfis={perfis} />}>
      <FormPrimeiroAcesso nome={membro.nome} previa />
    </LayoutAuth>
  );
}
