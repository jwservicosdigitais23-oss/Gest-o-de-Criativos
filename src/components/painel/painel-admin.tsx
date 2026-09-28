import Link from "next/link";
import { AlarmClock, CalendarCheck2, Clock3, Hourglass, PenLine, RotateCcw } from "lucide-react";
import type { SupabaseClient } from "@supabase/supabase-js";
import { Kpi } from "@/components/kpi";
import { StatusBadge } from "@/components/status-badge";
import { EstadoVazio } from "@/components/estado-vazio";
import { Avatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { STATUS_CLASSES, STATUS_LABEL } from "@/lib/constantes";
import { formatarDiaCurto, formatarDuracaoHoras, formatarHora, hojeISO, somarDias } from "@/lib/datas";
import { assinarUrls } from "@/lib/storage";
import type { Decisao, Post, StatusPost } from "@/lib/types";
import { cn, trecho } from "@/lib/utils";

interface Kpis {
  aguardando: number;
  aguardando_por_aprovadora: { membro_id: string; nome: string; total: number }[];
  em_revisao: number;
  aprovados_semana: number;
  semana_total: number;
  atrasados: number;
  tempo_medio_horas: number | null;
}

type PostComPerfil = Post & { perfis: { nome: string } | null };

export async function PainelAdmin({ supabase }: { supabase: SupabaseClient }) {
  const hoje = hojeISO();
  const [{ data: kpis }, { data: revisao }, { data: proximos }, { data: porPerfil }] = await Promise.all([
    supabase.rpc("painel_kpis"),
    supabase
      .from("posts")
      .select("*, perfis(nome)")
      .eq("status", "em_revisao")
      .order("prazo_aprovacao", { nullsFirst: false })
      .returns<PostComPerfil[]>(),
    supabase
      .from("posts")
      .select("*, perfis(nome)")
      .gte("data_publicacao", hoje)
      .lte("data_publicacao", somarDias(hoje, 6))
      .not("status", "in", "(reprovado,arquivado)")
      .order("data_publicacao")
      .order("hora_publicacao", { nullsFirst: true })
      .returns<PostComPerfil[]>(),
    supabase.from("perfis_status").select("*").order("ordem"),
  ]);

  const idsRevisao = (revisao ?? []).map((p) => p.id);
  const { data: obs } = idsRevisao.length
    ? await supabase
        .from("decisoes")
        .select("*")
        .in("post_id", idsRevisao)
        .eq("decisao", "revisar")
        .order("created_at", { ascending: false })
        .returns<Decisao[]>()
    : { data: [] as Decisao[] };
  const ultimaObs = new Map<string, Decisao>();
  for (const o of obs ?? []) if (!ultimaObs.has(o.post_id)) ultimaObs.set(o.post_id, o);

  const urls = await assinarUrls(supabase, (porPerfil ?? []).map((p) => p.avatar_url as string | null));
  const k = (kpis ?? {}) as Kpis;

  // Vai ao ar em até 24h sem aprovação → destaque vermelho
  const agoraSP = new Date(new Date().toLocaleString("en-US", { timeZone: "America/Sao_Paulo" }));
  function urgente(p: Post) {
    if (p.status === "aprovado" || p.status === "publicado") return false;
    const quando = new Date(`${p.data_publicacao}T${p.hora_publicacao ?? "09:00"}`);
    return quando.getTime() - agoraSP.getTime() <= 24 * 3600 * 1000;
  }

  const porDia = new Map<string, PostComPerfil[]>();
  for (const p of proximos ?? []) porDia.set(p.data_publicacao, [...(porDia.get(p.data_publicacao) ?? []), p]);

  return (
    <div className="flex flex-col gap-6">
      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-5">
        <Kpi icone={Hourglass} rotulo="Aguardando aprovação" valor={k.aguardando ?? 0} />
        <Kpi icone={RotateCcw} rotulo="Em revisão" valor={k.em_revisao ?? 0} tom="ambar" />
        <Kpi
          icone={CalendarCheck2}
          rotulo="Aprovados para a semana"
          valor={
            <>
              {k.aprovados_semana ?? 0}
              <span className="text-base font-semibold text-texto-2"> / {k.semana_total ?? 0}</span>
            </>
          }
          tom="verde"
        />
        <Kpi icone={AlarmClock} rotulo="Atrasados" valor={k.atrasados ?? 0} tom="vermelho" />
        <Kpi icone={Clock3} rotulo="Tempo médio de aprovação" valor={formatarDuracaoHoras(k.tempo_medio_horas)} tom="claro" className="col-span-2 md:col-span-1" />
      </div>

      {k.aguardando_por_aprovadora?.length > 0 && (
        <p className="-mt-3 text-sm text-texto-2">
          Aguardando por aprovadora:{" "}
          {k.aguardando_por_aprovadora.map((a, i) => (
            <span key={a.membro_id}>
              {i > 0 && " · "}
              <strong className="text-azul-escuro">{a.nome}</strong> {a.total}
            </span>
          ))}
        </p>
      )}

      <div className="grid gap-6 xl:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Precisa da sua ação</CardTitle>
            <span className="text-xs font-bold text-texto-2">{revisao?.length ?? 0}</span>
          </CardHeader>
          <CardContent className="flex flex-col gap-3">
            {(revisao ?? []).length === 0 && <p className="py-6 text-center text-sm text-texto-2">Nenhum post em revisão. 🎉</p>}
            {(revisao ?? []).map((p) => {
              const o = ultimaObs.get(p.id);
              return (
                <div key={p.id} className="flex flex-col gap-2 rounded-[10px] border border-[#fcd34d] bg-st-revisao-bg/60 p-3 sm:flex-row sm:items-center">
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-bold text-azul-escuro">{p.tema}</p>
                    <p className="text-xs text-texto-2">
                      {p.perfis?.nome} · v{p.versao}
                    </p>
                    {o?.observacao && <p className="mt-1 line-clamp-2 text-sm text-[#78350f]">“{trecho(o.observacao, 160)}”</p>}
                  </div>
                  <Button asChild size="sm" variant="revisar">
                    <Link href={`/posts/${p.id}/editar`}>
                      <PenLine /> Ajustar
                    </Link>
                  </Button>
                </div>
              );
            })}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Próximos 7 dias</CardTitle>
            <Link href="/calendario" className="text-xs font-semibold text-azul-medio hover:underline">
              Ver calendário
            </Link>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            {porDia.size === 0 && <p className="py-6 text-center text-sm text-texto-2">Nada programado para esta semana.</p>}
            {[...porDia.entries()].map(([dia, lista]) => (
              <div key={dia}>
                <p className="rotulo mb-1.5 text-texto-2">{dia === hoje ? "Hoje" : formatarDiaCurto(dia)}</p>
                <ul className="flex flex-col gap-1.5">
                  {lista.map((p) => (
                    <li key={p.id}>
                      <Link
                        href={`/posts/${p.id}`}
                        className={cn(
                          "flex items-center gap-3 rounded-[10px] border px-3 py-2 hover:bg-fundo",
                          urgente(p) ? "border-[#fca5a5] bg-st-reprovado-bg/60" : "border-borda",
                        )}
                      >
                        <span className="w-11 shrink-0 text-xs font-bold text-texto-2">{formatarHora(p.hora_publicacao) || "—"}</span>
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-sm font-semibold text-azul-escuro">{p.tema}</span>
                          <span className="block truncate text-xs text-texto-2">
                            {p.perfis?.nome}
                            {urgente(p) && <strong className="text-vermelho"> · vai ao ar em até 24h sem aprovação</strong>}
                          </span>
                        </span>
                        <StatusBadge status={p.status} className="hidden sm:inline-flex" />
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      <section>
        <h2 className="mb-3 text-base font-bold">Por perfil</h2>
        {(porPerfil ?? []).length === 0 ? (
          <EstadoVazio icone={Hourglass} titulo="Nenhum perfil ativo" />
        ) : (
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {(porPerfil ?? []).map((p) => (
              <Link key={p.perfil_id} href={`/perfis/${p.perfil_id}`} className="rounded-[10px] border border-borda bg-white p-4 shadow-card hover:border-azul-claro">
                <div className="flex items-center gap-3">
                  <Avatar nome={p.nome} src={p.avatar_url ? urls[p.avatar_url] : null} tamanho={36} />
                  <p className="font-bold text-azul-escuro">{p.nome}</p>
                </div>
                <dl className="mt-3 grid grid-cols-3 gap-2">
                  {(["rascunho", "aguardando", "em_revisao", "aprovado", "publicado", "reprovado"] as StatusPost[]).map((s) => (
                    <div key={s} className={cn("rounded-md px-2 py-1.5", STATUS_CLASSES[s])}>
                      <dt className="truncate text-[10px] font-semibold">{STATUS_LABEL[s]}</dt>
                      <dd className="text-lg font-bold leading-tight">{p[s] as number}</dd>
                    </div>
                  ))}
                </dl>
              </Link>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
