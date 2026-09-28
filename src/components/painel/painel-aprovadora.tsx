import Image from "next/image";
import Link from "next/link";
import { AlarmClock, ArrowRight, CalendarDays, CheckCheck, FileText, Film, Hourglass, ImageIcon, PartyPopper, ThumbsUp } from "lucide-react";
import type { SupabaseClient } from "@supabase/supabase-js";
import { Avatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { GlassCard } from "@/components/ui/card";
import { KpiCard } from "@/components/ui/kpi-card";
import { SectionHeader } from "@/components/ui/page-header";
import { carregarMiniaturas } from "@/lib/consultas";
import { formatarData, formatarHora, hojeISO, saudacao, somarDias, tempoRelativo } from "@/lib/datas";
import { assinarUrls } from "@/lib/storage";
import type { Decisao, Perfil, Post } from "@/lib/types";
import { cn, trecho } from "@/lib/utils";

const DECISAO = {
  aprovado: { rotulo: "Aprovou", ponto: "bg-st-aprovado", texto: "text-st-aprovado-text" },
  revisar: { rotulo: "Pediu revisão", ponto: "bg-st-revisao", texto: "text-st-revisao-text" },
  reprovado: { rotulo: "Reprovou", ponto: "bg-st-reprovado", texto: "text-st-reprovado-text" },
} as const;

function Prazo({ prazo, hoje }: { prazo: string | null; hoje: string }) {
  if (!prazo) return null;
  const [texto, cor] =
    prazo < hoje
      ? ["Prazo vencido", "bg-st-atrasado-bg text-st-atrasado-text"]
      : prazo === hoje
        ? ["Vence hoje", "bg-st-atrasado-bg text-st-atrasado-text"]
        : prazo === somarDias(hoje, 1)
          ? ["Vence amanhã", "bg-st-revisao-bg text-st-revisao-text"]
          : [`Prazo ${formatarData(prazo)}`, "bg-surface-solid/90 text-navy-900"];
  return <span className={cn("rounded-full px-2.5 py-1 text-[11px] font-bold shadow-card backdrop-blur", cor)}>{texto}</span>;
}

/**
 * Painel da aprovadora. Também é usado no "Ver como" do admin: nesse caso
 * `membroId` é a aprovadora e `perfisIds` restringe o que o servidor busca.
 */
export async function PainelAprovadora({
  supabase,
  membroId,
  nome,
  perfisIds,
}: {
  supabase: SupabaseClient;
  membroId: string;
  nome: string;
  perfisIds: string[] | null;
}) {
  const hoje = hojeISO();
  const trintaDias = somarDias(hoje, -30);
  let qPerfis = supabase.from("perfis").select("*").eq("arquivado", false).order("ordem");
  let qProximos = supabase
    .from("posts")
    .select("id", { count: "exact", head: true })
    .gte("data_publicacao", hoje)
    .lte("data_publicacao", somarDias(hoje, 6))
    .not("status", "in", "(reprovado,arquivado,rascunho)");
  if (perfisIds) {
    qPerfis = qPerfis.in("id", perfisIds);
    qProximos = qProximos.in("perfil_id", perfisIds);
  }

  const [{ data: fila }, { data: perfis }, { data: ultimas }, { count: aprovados }, { count: proximos }] = await Promise.all([
    perfisIds ? supabase.rpc("fila_aprovadora", { p_membro: membroId }) : supabase.rpc("fila_aprovadora"),
    qPerfis.returns<Perfil[]>(),
    supabase
      .from("decisoes")
      .select("*, posts(tema, perfil_id)")
      .eq("autor_id", membroId)
      .order("created_at", { ascending: false })
      .limit(6)
      .returns<(Decisao & { posts: { tema: string; perfil_id: string } | null })[]>(),
    supabase
      .from("decisoes")
      .select("id", { count: "exact", head: true })
      .eq("autor_id", membroId)
      .eq("decisao", "aprovado")
      .gte("created_at", trintaDias),
    qProximos,
  ]);

  const lista = ((fila ?? []) as Post[]).filter((p) => !perfisIds || perfisIds.includes(p.perfil_id));
  const [mini, avatares] = await Promise.all([
    carregarMiniaturas(supabase, lista),
    assinarUrls(supabase, (perfis ?? []).map((p) => p.avatar_url)),
  ]);
  const perfilDe = new Map((perfis ?? []).map((p) => [p.id, { ...p, avatarSrc: p.avatar_url ? (avatares[p.avatar_url] ?? null) : null }]));
  const pendentesPorPerfil = new Map<string, number>();
  for (const p of lista) pendentesPorPerfil.set(p.perfil_id, (pendentesPorPerfil.get(p.perfil_id) ?? 0) + 1);
  const urgentes = lista.filter((p) => p.prazo_aprovacao && p.prazo_aprovacao <= somarDias(hoje, 1)).length;
  const n = lista.length;

  return (
    <div className="flex flex-col gap-6">
      {/* Banner de boas-vindas */}
      <section className="bg-gradiente-marca relative isolate overflow-hidden rounded-[var(--radius-card)] text-white shadow-elevated">
        <Image src="/imagens/banner-painel.webp" alt="" fill priority sizes="100vw" className="-z-20 object-cover object-right opacity-25 mix-blend-screen" />
        <span className="absolute -right-16 -top-24 -z-10 size-72 rounded-full bg-cyan-400/30 blur-3xl" aria-hidden />
        <span className="absolute -bottom-24 left-1/3 -z-10 size-64 rounded-full bg-blue-500/40 blur-3xl" aria-hidden />
        <div className="flex flex-col gap-6 px-5 pb-5 pt-7 sm:px-8 sm:pt-9">
          <div className="max-w-2xl">
            <p className="rotulo text-cyan-400">Aprovação de criativos</p>
            <h1 className="mt-2 text-page-title text-white">
              {saudacao()}, {nome.split(" ")[0]}
            </h1>
            <p className="mt-1 text-body text-white/85 sm:text-lg">
              {n === 0 ? "Nenhum post esperando você. Aproveite o dia! ✨" : n === 1 ? "Você tem 1 post para aprovar." : `Você tem ${n} posts para aprovar.`}
            </p>
          </div>
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            <KpiCard variante="glass" icone={Hourglass} rotulo="Para você aprovar" valor={n} tom="aguardando" />
            <KpiCard variante="glass" icone={AlarmClock} rotulo="Vencem até amanhã" valor={urgentes} tom="atrasado" />
            <KpiCard variante="glass" icone={ThumbsUp} rotulo="Aprovados em 30 dias" valor={aprovados ?? 0} tom="aprovado" />
            <KpiCard variante="glass" icone={CalendarDays} rotulo="No ar em 7 dias" valor={proximos ?? 0} tom="proximos" />
          </div>
        </div>
      </section>

      {/* Seus perfis */}
      <section className="flex flex-col gap-3" aria-labelledby="seus-perfis">
        <h2 id="seus-perfis" className="text-card-title text-navy-900">
          Seus perfis
        </h2>
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {[...perfilDe.values()].map((p) => {
            const pend = pendentesPorPerfil.get(p.id) ?? 0;
            return (
              <Link
                key={p.id}
                href={`/perfis/${p.id}`}
                className="transicao group relative flex items-center gap-4 overflow-hidden rounded-[var(--radius-card)] border border-border bg-surface-solid p-4 shadow-card hover:-translate-y-0.5 hover:shadow-elevated"
              >
                <span className="bg-gradiente-primario absolute inset-x-0 top-0 h-1" aria-hidden />
                <Avatar nome={p.nome} src={p.avatarSrc} size="lg" />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-card-title text-navy-900">{p.nome}</span>
                  <span className="mt-1 flex flex-wrap items-center gap-2 text-label text-text-muted">
                    {p.tipo === "empresa" ? "Institucional" : "Pessoal"}
                    {pend > 0 ? (
                      <span className="rounded-full bg-st-aguardando-bg px-2 py-0.5 font-bold text-st-aguardando-text">{pend} para aprovar</span>
                    ) : (
                      <span className="inline-flex items-center gap-1 rounded-full bg-st-aprovado-bg px-2 py-0.5 font-bold text-st-aprovado-text">
                        <CheckCheck className="size-3.5" aria-hidden /> Em dia
                      </span>
                    )}
                  </span>
                </span>
                <ArrowRight className="transicao size-4 text-blue-600 group-hover:translate-x-0.5" aria-hidden />
              </Link>
            );
          })}
        </div>
      </section>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
        {/* Fila */}
        <GlassCard className="flex min-w-0 flex-col gap-4 p-5">
          <SectionHeader titulo="Para você aprovar" contador={n} rotuloContador="posts" />
          {n === 0 ? (
            <div className="flex flex-col items-center gap-3 py-12 text-center">
              <span className="bg-gradiente-primario flex size-16 items-center justify-center rounded-2xl text-white shadow-card">
                <PartyPopper className="size-8" aria-hidden />
              </span>
              <p className="text-card-title text-navy-900">Tudo em dia!</p>
              <p className="text-body text-text-muted">Quando um post chegar, ele aparece aqui e no sino de notificações.</p>
            </div>
          ) : (
            <ul className="grid gap-4 sm:grid-cols-2">
              {lista.map((p) => {
                const m = mini[p.id];
                const perfil = perfilDe.get(p.perfil_id);
                const IconeMidia = m?.tipo === "video" ? Film : m?.tipo === "pdf" ? FileText : ImageIcon;
                return (
                  <li key={p.id}>
                    <Link
                      href={`/posts/${p.id}#decisao`}
                      className="transicao group flex h-full flex-col overflow-hidden rounded-[var(--radius-card)] border border-border bg-surface-solid shadow-card hover:-translate-y-0.5 hover:shadow-elevated"
                    >
                      <div className="relative aspect-[16/10] bg-bg-app-from">
                        {m?.src ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={m.src} alt="" className="transicao size-full object-cover group-hover:scale-[1.02]" />
                        ) : (
                          <span className="flex size-full items-center justify-center text-blue-600/60">
                            <IconeMidia className="size-10" aria-hidden />
                          </span>
                        )}
                        <span className="absolute left-3 top-3">
                          <Prazo prazo={p.prazo_aprovacao} hoje={hoje} />
                        </span>
                        {p.versao > 1 && (
                          <span className="absolute right-3 top-3 rounded-full bg-navy-900/80 px-2.5 py-1 text-[11px] font-bold text-white backdrop-blur">
                            Ajustado · v{p.versao}
                          </span>
                        )}
                      </div>
                      <div className="flex flex-1 flex-col gap-2 p-4">
                        {perfil && (
                          <span className="flex items-center gap-2 text-label font-semibold text-text-muted">
                            <Avatar nome={perfil.nome} src={perfil.avatarSrc} size="sm" /> {perfil.nome}
                          </span>
                        )}
                        <p className="line-clamp-2 text-body font-bold text-navy-900">{p.tema}</p>
                        <p className="text-label text-text-muted">
                          Vai ao ar {formatarData(p.data_publicacao)}
                          {p.hora_publicacao && ` às ${formatarHora(p.hora_publicacao)}`}
                        </p>
                        <span className="mt-auto pt-2">
                          <Button asChild size="sm" className="w-full">
                            <span>
                              Revisar agora <ArrowRight />
                            </span>
                          </Button>
                        </span>
                      </div>
                    </Link>
                  </li>
                );
              })}
            </ul>
          )}
        </GlassCard>

        {/* Últimas decisões */}
        <GlassCard className="flex flex-col gap-3 self-start p-5">
          <SectionHeader titulo="Suas últimas decisões" />
          {(ultimas ?? []).length === 0 ? (
            <p className="py-6 text-center text-body text-text-muted">Suas decisões vão aparecer aqui.</p>
          ) : (
            <ol className="relative flex flex-col gap-4 border-l-2 border-border pl-5">
              {(ultimas ?? []).map((d) => {
                const e = DECISAO[d.decisao];
                return (
                  <li key={d.id} className="relative">
                    <span className={cn("absolute -left-[27px] top-1 size-3 rounded-full ring-4 ring-surface-solid", e.ponto)} aria-hidden />
                    <Link href={`/posts/${d.post_id}`} className="flex flex-col gap-0.5 hover:opacity-80">
                      <span className={cn("text-label font-bold", e.texto)}>
                        {e.rotulo} · <span className="font-normal text-text-muted">{tempoRelativo(d.created_at)}</span>
                      </span>
                      <span className="truncate text-body font-semibold text-navy-900">{d.posts?.tema}</span>
                      {d.observacao && <span className="line-clamp-2 text-label text-text-muted">“{trecho(d.observacao, 120)}”</span>}
                    </Link>
                  </li>
                );
              })}
            </ol>
          )}
        </GlassCard>
      </div>
    </div>
  );
}
