import type { Metadata } from "next";
import { CabecalhoPagina } from "@/components/cabecalho-pagina";
import { PainelAdmin } from "@/components/painel/painel-admin";
import { PainelAprovadora } from "@/components/painel/painel-aprovadora";
import { exigirMembro } from "@/lib/auth";
import { saudacao } from "@/lib/datas";

export const metadata: Metadata = { title: "Painel" };

export default async function PainelPage() {
  const { supabase, membro } = await exigirMembro();
  const primeiroNome = membro.nome.split(" ")[0];

  if (membro.papel === "admin") {
    return (
      <>
        <CabecalhoPagina titulo={`${saudacao()}, ${primeiroNome}`} subtitulo="Aqui está o status dos seus criativos hoje." />
        <PainelAdmin supabase={supabase} />
      </>
    );
  }

  const { count } = await supabase
    .from("pendencias_aprovadoras")
    .select("post_id", { count: "exact", head: true })
    .eq("membro_id", membro.id);
  const n = count ?? 0;
  return (
    <>
      <CabecalhoPagina
        titulo={`${saudacao()}, ${primeiroNome}`}
        subtitulo={n === 0 ? "Você não tem posts para aprovar agora." : n === 1 ? "Você tem 1 post para aprovar." : `Você tem ${n} posts para aprovar.`}
      />
      <PainelAprovadora supabase={supabase} membroId={membro.id} />
    </>
  );
}
