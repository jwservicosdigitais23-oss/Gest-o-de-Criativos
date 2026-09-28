import type { Metadata } from "next";
import { Hourglass } from "lucide-react";
import { BannerPainel } from "@/components/painel/blocos";
import { PainelAdmin } from "@/components/painel/painel-admin";
import { PainelAprovadora } from "@/components/painel/painel-aprovadora";
import { KpiCard } from "@/components/ui/kpi-card";
import { exigirMembro } from "@/lib/auth";
import { saudacao } from "@/lib/datas";

export const metadata: Metadata = { title: "Painel" };

export default async function PainelPage(props: PageProps<"/">) {
  const { supabase, membro } = await exigirMembro();
  const { mes } = await props.searchParams;
  const titulo = `${saudacao()}, ${membro.nome.split(" ")[0]}`;

  if (membro.papel === "admin") {
    return (
      <PainelAdmin
        supabase={supabase}
        titulo={titulo}
        mes={typeof mes === "string" && /^\d{4}-\d{2}$/.test(mes) ? mes : null}
      />
    );
  }

  const { count } = await supabase
    .from("pendencias_aprovadoras")
    .select("post_id", { count: "exact", head: true })
    .eq("membro_id", membro.id);
  const n = count ?? 0;
  return (
    <div className="flex flex-col gap-6">
      <BannerPainel
        titulo={titulo}
        subtitulo={n === 0 ? "Você não tem posts para aprovar agora." : n === 1 ? "Você tem 1 post para aprovar." : `Você tem ${n} posts para aprovar.`}
      >
        <div className="grid max-w-xs grid-cols-1">
          <KpiCard variante="glass" icone={Hourglass} rotulo="Para você aprovar" valor={n} tom="aguardando" />
        </div>
      </BannerPainel>
      <PainelAprovadora supabase={supabase} membroId={membro.id} />
    </div>
  );
}
