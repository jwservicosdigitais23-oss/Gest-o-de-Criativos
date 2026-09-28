import { AlarmClock, CalendarCheck2, CalendarDays, Clock3, Hourglass, RotateCcw } from "lucide-react";
import type { SupabaseClient } from "@supabase/supabase-js";
import { EmptyState } from "@/components/ui/empty-state";
import { KpiCard } from "@/components/ui/kpi-card";
import { SectionHeader } from "@/components/ui/page-header";
import { formatarDuracaoHoras, hojeISO, somarDias } from "@/lib/datas";
import { assinarUrls } from "@/lib/storage";
import type { Decisao, Post } from "@/lib/types";
import {
  BannerPainel,
  BlocoPrecisaAcao,
  BlocoProximos,
  CartaoPerfil,
  type ItemProximo,
  type ResumoPerfil,
} from "./blocos";
import { FiltroMes } from "./filtro-mes";

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

const CHAVES = ["rascunho", "aguardando", "em_revisao", "aprovado", "publicado", "reprovado"] as const;

export async function PainelAdmin({
  supabase,
  titulo,
  mes,
}: {
  supabase: SupabaseClient;
  titulo: string;
  mes: string | null;
}) {
  const hoje = hojeISO();
  const [{ data: kpis }, { data: revisao }, { data: proximos }, { data: perfis }, { data: postsPerfis }] =
    await Promise.all([
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
      supabase.from("perfis").select("id, nome, tipo, avatar_url, ordem").eq("arquivado", false).order("ordem"),
      supabase.from("posts").select("perfil_id, status, data_publicacao").neq("status", "arquivado"),
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

  const urls = await assinarUrls(supabase, (perfis ?? []).map((p) => p.avatar_url as string | null));
  const k = (kpis ?? {}) as Kpis;

  // Vai ao ar em até 24h sem aprovação → destaque vermelho
  const agoraSP = new Date(new Date().toLocaleString("en-US", { timeZone: "America/Sao_Paulo" }));
  const urgente = (p: Post) =>
    p.status !== "aprovado" &&
    p.status !== "publicado" &&
    new Date(`${p.data_publicacao}T${p.hora_publicacao ?? "09:00"}`).getTime() - agoraSP.getTime() <= 24 * 3600 * 1000;

  const porDia = new Map<string, ItemProximo[]>();
  for (const p of proximos ?? []) {
    porDia.set(p.data_publicacao, [
      ...(porDia.get(p.data_publicacao) ?? []),
      {
        id: p.id,
        tema: p.tema,
        perfil: p.perfis?.nome ?? "",
        data: p.data_publicacao,
        hora: p.hora_publicacao,
        status: p.status,
        urgente: urgente(p),
      },
    ]);
  }

  // Por perfil: contagem por status (opcionalmente só do mês escolhido)
  const todos = postsPerfis ?? [];
  const meses = [...new Set(todos.map((p) => (p.data_publicacao as string).slice(0, 7)))].sort();
  const filtrados = mes ? todos.filter((p) => (p.data_publicacao as string).startsWith(mes)) : todos;
  const resumos: ResumoPerfil[] = (perfis ?? []).map((pf) => {
    const contagens = Object.fromEntries(CHAVES.map((c) => [c, 0])) as ResumoPerfil["contagens"];
    for (const p of filtrados) {
      if (p.perfil_id === pf.id && (CHAVES as readonly string[]).includes(p.status)) {
        contagens[p.status as (typeof CHAVES)[number]]++;
      }
    }
    return {
      id: pf.id,
      nome: pf.nome,
      tipo: pf.tipo,
      avatarSrc: pf.avatar_url ? (urls[pf.avatar_url] ?? null) : null,
      contagens,
    };
  });

  return (
    <div className="flex flex-col gap-6">
      <BannerPainel titulo={titulo} subtitulo="Aqui está o status dos seus criativos hoje.">
        <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-5">
          <KpiCard variante="glass" icone={Hourglass} rotulo="Aguardando aprovação" valor={k.aguardando ?? 0} tom="aguardando" />
          <KpiCard variante="glass" icone={RotateCcw} rotulo="Em revisão" valor={k.em_revisao ?? 0} tom="revisao" />
          <KpiCard variante="glass" icone={AlarmClock} rotulo="Atrasados" valor={k.atrasados ?? 0} tom="atrasado" />
          <KpiCard
            variante="glass"
            icone={CalendarCheck2}
            rotulo="Aprovados para a semana"
            valor={
              <>
                {k.aprovados_semana ?? 0}
                <span className="text-body font-semibold text-text-muted"> / {k.semana_total ?? 0}</span>
              </>
            }
            tom="aprovado"
          />
          <KpiCard
            variante="glass"
            icone={Clock3}
            rotulo="Tempo médio de aprovação"
            valor={formatarDuracaoHoras(k.tempo_medio_horas)}
            tom="proximos"
            className="col-span-2 md:col-span-1"
          />
        </div>
        {k.aguardando_por_aprovadora?.length > 0 && (
          <p className="mt-3 text-label text-text">
            Aguardando por aprovadora:{" "}
            {k.aguardando_por_aprovadora.map((a, i) => (
              <span key={a.membro_id}>
                {i > 0 && " · "}
                <strong className="text-navy-900">{a.nome}</strong> {a.total}
              </span>
            ))}
          </p>
        )}
      </BannerPainel>

      <div className="grid gap-6 xl:grid-cols-2">
        <BlocoPrecisaAcao
          itens={(revisao ?? []).map((p) => ({
            id: p.id,
            tema: p.tema,
            perfil: p.perfis?.nome ?? "",
            versao: p.versao,
            observacao: ultimaObs.get(p.id)?.observacao ?? null,
          }))}
        />
        <BlocoProximos dias={[...porDia.entries()]} hoje={hoje} />
      </div>

      <section className="flex flex-col gap-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <SectionHeader titulo={<span className="text-page-title">Por perfil</span>} />
          <FiltroMes meses={meses} />
        </div>
        {resumos.length === 0 ? (
          <EmptyState icone={CalendarDays} titulo="Nenhum perfil ativo" />
        ) : (
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {resumos.map((r) => (
              <CartaoPerfil key={r.id} perfil={r} />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
