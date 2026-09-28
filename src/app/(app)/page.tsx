import type { Metadata } from "next";
import { TourBoasVindas } from "@/components/acesso/tour-boas-vindas";
import { PainelAdmin } from "@/components/painel/painel-admin";
import { PainelAprovadora } from "@/components/painel/painel-aprovadora";
import { exigirMembro } from "@/lib/auth";
import { saudacao } from "@/lib/datas";
import { carregarPerfisMenu } from "@/lib/shell";

export const metadata: Metadata = { title: "Painel" };

export default async function PainelPage(props: PageProps<"/">) {
  const { supabase, membro, perfisIds } = await exigirMembro();
  const { mes, "boas-vindas": boasVindas } = await props.searchParams;

  if (membro.papel === "admin") {
    return (
      <PainelAdmin
        supabase={supabase}
        titulo={`${saudacao()}, ${membro.nome.split(" ")[0]}`}
        mes={typeof mes === "string" && /^\d{4}-\d{2}$/.test(mes) ? mes : null}
      />
    );
  }

  return (
    <>
      <PainelAprovadora supabase={supabase} membroId={membro.id} nome={membro.nome} perfisIds={perfisIds} />
      {boasVindas === "1" && <TourBoasVindas nome={membro.nome} perfis={await carregarPerfisMenu(supabase, perfisIds)} />}
    </>
  );
}
