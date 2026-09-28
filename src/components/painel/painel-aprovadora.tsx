import Link from "next/link";
import { CheckCircle2, Eye } from "lucide-react";
import type { SupabaseClient } from "@supabase/supabase-js";
import { Pilula } from "@/components/status-badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { carregarMiniaturas } from "@/lib/consultas";
import { formatarData, formatarDataHora, formatarHora, hojeISO, somarDias } from "@/lib/datas";
import type { Decisao, Post } from "@/lib/types";
import { cn, trecho } from "@/lib/utils";

const DECISAO_LABEL = { aprovado: "Aprovou", revisar: "Pediu revisão", reprovado: "Reprovou" } as const;
const DECISAO_COR = {
  aprovado: "bg-st-aprovado-bg text-st-aprovado",
  revisar: "bg-st-revisao-bg text-st-revisao",
  reprovado: "bg-st-reprovado-bg text-st-reprovado",
} as const;

export async function PainelAprovadora({ supabase, membroId }: { supabase: SupabaseClient; membroId: string }) {
  const hoje = hojeISO();
  const amanha = somarDias(hoje, 1);
  const [{ data: fila }, { data: perfis }, { data: ultimas }] = await Promise.all([
    supabase.rpc("fila_aprovadora"),
    supabase.from("perfis").select("id, nome"),
    supabase
      .from("decisoes")
      .select("*, posts(tema)")
      .eq("autor_id", membroId)
      .order("created_at", { ascending: false })
      .limit(8)
      .returns<(Decisao & { posts: { tema: string } | null })[]>(),
  ]);
  const nomePerfil = new Map((perfis ?? []).map((p) => [p.id as string, p.nome as string]));
  const lista = (fila ?? []) as Post[];
  const mini = await carregarMiniaturas(supabase, lista);

  return (
    <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_380px]">
      <Card>
        <CardHeader>
          <CardTitle>Para você aprovar</CardTitle>
          <span className="text-xs font-bold text-texto-2">{lista.length}</span>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          {lista.length === 0 && (
            <div className="flex flex-col items-center gap-2 py-10 text-center">
              <CheckCircle2 className="size-10 text-verde" aria-hidden />
              <p className="font-bold text-azul-escuro">Tudo em dia!</p>
              <p className="text-sm text-texto-2">Nenhum post esperando a sua decisão.</p>
            </div>
          )}
          {lista.map((p) => {
            const atrasado = p.prazo_aprovacao && p.prazo_aprovacao < hoje;
            const venceAmanha = p.prazo_aprovacao === amanha;
            const venceHoje = p.prazo_aprovacao === hoje;
            const m = mini[p.id];
            return (
              <div key={p.id} className="flex flex-col gap-3 rounded-[10px] border border-borda p-3 sm:flex-row sm:items-center">
                <div className="flex min-w-0 flex-1 items-center gap-3">
                  <div className="flex size-16 shrink-0 items-center justify-center overflow-hidden rounded-md bg-fundo">
                    {m?.src ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={m.src} alt="" className="size-full object-cover" />
                    ) : (
                      <Eye className="size-5 text-texto-2" aria-hidden />
                    )}
                  </div>
                  <div className="min-w-0">
                    <p className="truncate font-bold text-azul-escuro">{p.tema}</p>
                    <p className="text-xs text-texto-2">
                      {nomePerfil.get(p.perfil_id)} · vai ao ar {formatarData(p.data_publicacao)}
                      {p.hora_publicacao && ` às ${formatarHora(p.hora_publicacao)}`} · v{p.versao}
                    </p>
                    <div className="mt-1 flex flex-wrap gap-1">
                      {atrasado && <Pilula className="bg-st-reprovado-bg text-st-reprovado">Atrasado</Pilula>}
                      {venceHoje && <Pilula className="bg-st-reprovado-bg text-st-reprovado">Vence hoje</Pilula>}
                      {venceAmanha && <Pilula className="bg-st-revisao-bg text-st-revisao">Vence amanhã</Pilula>}
                      {!atrasado && !venceHoje && !venceAmanha && p.prazo_aprovacao && (
                        <Pilula className="bg-fundo text-texto-2">Prazo {formatarData(p.prazo_aprovacao)}</Pilula>
                      )}
                      {p.versao > 1 && <Pilula className="bg-st-aguardando-bg text-st-aguardando">Ajustado</Pilula>}
                    </div>
                  </div>
                </div>
                <Button asChild size="decisao" className="w-full sm:w-auto">
                  <Link href={`/posts/${p.id}#decisao`}>Revisar agora</Link>
                </Button>
              </div>
            );
          })}
        </CardContent>
      </Card>

      <Card className="self-start">
        <CardHeader>
          <CardTitle>Suas últimas decisões</CardTitle>
        </CardHeader>
        <CardContent>
          {(ultimas ?? []).length === 0 ? (
            <p className="py-6 text-center text-sm text-texto-2">Você ainda não registrou decisões.</p>
          ) : (
            <ul className="flex flex-col divide-y divide-borda">
              {(ultimas ?? []).map((d) => (
                <li key={d.id}>
                  <Link href={`/posts/${d.post_id}`} className="flex flex-col gap-1 py-3 hover:opacity-80">
                    <span className="flex items-center gap-2">
                      <Pilula className={cn(DECISAO_COR[d.decisao])}>{DECISAO_LABEL[d.decisao]}</Pilula>
                      <span className="text-xs text-texto-2">v{d.versao} · {formatarDataHora(d.created_at)}</span>
                    </span>
                    <span className="truncate text-sm font-semibold text-azul-escuro">{d.posts?.tema}</span>
                    {d.observacao && <span className="line-clamp-2 text-xs text-texto-2">{trecho(d.observacao, 120)}</span>}
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
