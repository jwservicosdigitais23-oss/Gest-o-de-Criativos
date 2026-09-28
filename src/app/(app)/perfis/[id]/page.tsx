import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, CalendarRange, CheckCircle2, Download, Hourglass, Inbox, Plus, RotateCcw } from "lucide-react";
import { ColunaKanban, LinhaPost, type PostCardDados } from "@/components/posts/card-post";
import { FiltrosPosts } from "@/components/posts/filtros-posts";
import { Avatar, PilhaAvatares } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { GlassCard } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { KpiCard } from "@/components/ui/kpi-card";
import { exigirMembro } from "@/lib/auth";
import { carregarMiniaturas, contarObservacoes } from "@/lib/consultas";
import { hojeISO, somarDias } from "@/lib/datas";
import { statusVisual } from "@/lib/status";
import { assinarUrls } from "@/lib/storage";
import type { Membro, Perfil, Post, StatusPost } from "@/lib/types";

export const metadata: Metadata = { title: "Perfil" };

const COLUNAS: StatusPost[] = ["rascunho", "aguardando", "em_revisao", "aprovado", "publicado"];

export default async function PerfilPage(props: PageProps<"/perfis/[id]">) {
  const { id } = await props.params;
  const sp = await props.searchParams;
  const { supabase, membro, perfisIds } = await exigirMembro();
  const admin = membro.papel === "admin";
  if (perfisIds && !perfisIds.includes(id)) notFound(); // "Ver como": fora dos perfis dela

  const { data: perfil } = await supabase.from("perfis").select("*").eq("id", id).maybeSingle<Perfil>();
  if (!perfil) notFound();

  const status = typeof sp.status === "string" ? sp.status : "";
  const formato = typeof sp.formato === "string" ? sp.formato : "";
  const mes = typeof sp.mes === "string" && /^\d{4}-\d{2}$/.test(sp.mes) ? sp.mes : "";
  const vista = sp.vista === "lista" ? "lista" : "kanban";

  const hoje = hojeISO();
  const mesAtual = hoje.slice(0, 7);

  let q = supabase.from("posts").select("*").eq("perfil_id", id).order("data_publicacao").order("hora_publicacao", { nullsFirst: true });
  if (status) q = q.eq("status", status);
  else q = q.neq("status", "arquivado");
  if (formato) q = q.eq("formato", formato);
  if (mes) q = q.gte("data_publicacao", `${mes}-01`).lte("data_publicacao", `${mes}-31`);

  const [{ data: posts }, { data: todos }, { data: aprov }] = await Promise.all([
    q.returns<Post[]>(),
    supabase.from("posts").select("status, data_publicacao").eq("perfil_id", id),
    supabase.from("perfil_aprovadoras").select("membros(id, nome, avatar_url)").eq("perfil_id", id),
  ]);

  const lista = posts ?? [];
  const aguardandoIds = perfil.modo_aprovacao === "todas" ? lista.filter((p) => p.status === "aguardando").map((p) => p.id) : [];
  const [miniaturas, observacoes, { data: progresso }] = await Promise.all([
    carregarMiniaturas(supabase, lista),
    contarObservacoes(supabase, lista.map((p) => p.id)),
    aguardandoIds.length
      ? supabase.from("posts_progresso").select("post_id, aprovacoes, total_aprovadoras").in("post_id", aguardandoIds)
      : Promise.resolve({ data: [] as { post_id: string; aprovacoes: number; total_aprovadoras: number }[] }),
  ]);
  const progressoPorPost = new Map((progresso ?? []).map((x) => [x.post_id as string, x]));
  const aprovadoras = (aprov ?? []).map((a) => a.membros as unknown as Pick<Membro, "id" | "nome" | "avatar_url">).filter(Boolean);
  const urls = await assinarUrls(supabase, [perfil.avatar_url, ...aprovadoras.map((a) => a.avatar_url)]);

  const t = todos ?? [];
  const kpis = {
    aguardando: t.filter((p) => p.status === "aguardando").length,
    revisao: t.filter((p) => p.status === "em_revisao").length,
    aprovadosMes: t.filter((p) => (p.status === "aprovado" || p.status === "publicado") && p.data_publicacao.startsWith(mesAtual)).length,
    proximos: t.filter(
      (p) =>
        p.data_publicacao >= hoje &&
        p.data_publicacao <= somarDias(hoje, 7) &&
        !["reprovado", "arquivado", "publicado"].includes(p.status),
    ).length,
  };
  const meses = [...new Set(t.map((p) => p.data_publicacao.slice(0, 7)))].sort();

  const cards: PostCardDados[] = lista.map((p) => ({
    ...p,
    miniatura: miniaturas[p.id],
    observacoes: observacoes[p.id] ?? 0,
    statusVisual: statusVisual(p.status, p.prazo_aprovacao, hoje),
    extra: progressoPorPost.has(p.id) ? (
      <span className="font-semibold text-st-aguardando-text">
        {progressoPorPost.get(p.id)!.aprovacoes} de {progressoPorPost.get(p.id)!.total_aprovadoras} aprovações
      </span>
    ) : undefined,
  }));

  const colunas = status ? [status as StatusPost] : COLUNAS;
  const semPosts = t.length === 0;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex min-w-0 items-center gap-3 sm:gap-4">
          <Link
            href="/"
            aria-label="Voltar ao painel"
            className="transicao flex size-10 shrink-0 items-center justify-center rounded-full border border-border bg-surface-solid text-navy-900 hover:border-blue-600 hover:text-blue-600"
          >
            <ArrowLeft className="size-5" />
          </Link>
          <Avatar nome={perfil.nome} src={perfil.avatar_url ? urls[perfil.avatar_url] : null} tamanho={64} className="shadow-card" />
          <div className="min-w-0">
            <h1 className="truncate text-2xl font-bold text-navy-900 sm:text-page-title">{perfil.nome}</h1>
            <div className="mt-1 flex flex-wrap items-center gap-2 text-body text-text-muted">
              <span>{perfil.tipo === "empresa" ? "Institucional" : "Pessoal"}</span>
              <span aria-hidden>·</span>
              <span>{perfil.modo_aprovacao === "todas" ? "Todas precisam aprovar" : "Qualquer uma aprova"}</span>
              <PilhaAvatares pessoas={aprovadoras.map((a) => ({ nome: a.nome, src: a.avatar_url ? urls[a.avatar_url] : null }))} tamanho={24} />
            </div>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button asChild variant="secondary">
            <a href={`/exportar?perfil=${perfil.id}`}>
              <Download /> Exportar cronograma
            </a>
          </Button>
          {admin && (
            <Button asChild>
              <Link href={`/posts/novo?perfil=${perfil.id}`}>
                <Plus /> Novo post
              </Link>
            </Button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <KpiCard icone={Hourglass} rotulo="Aguardando" valor={kpis.aguardando} tom="aguardando" />
        <KpiCard icone={RotateCcw} rotulo="Em revisão" valor={kpis.revisao} tom="revisao" />
        <KpiCard icone={CheckCircle2} rotulo="Aprovados no mês" valor={kpis.aprovadosMes} tom="aprovado" />
        <KpiCard icone={CalendarRange} rotulo="Próximos 7 dias" valor={kpis.proximos} tom="proximos" />
      </div>

      {semPosts ? (
        <EmptyState
          icone={Inbox}
          titulo="Nenhum post ainda"
          descricao={admin ? "Crie o primeiro post deste perfil ou importe o cronograma em Excel." : "Quando houver posts para este perfil, eles aparecem aqui."}
          acao={
            admin && (
              <div className="flex flex-wrap justify-center gap-2">
                <Button asChild>
                  <Link href={`/posts/novo?perfil=${perfil.id}`}>
                    <Plus /> Novo post
                  </Link>
                </Button>
                <Button asChild variant="secondary">
                  <Link href="/importar">Importar cronograma</Link>
                </Button>
              </div>
            )
          }
        />
      ) : (
        <>
          <FiltrosPosts meses={meses} vista={vista} />
          {cards.length === 0 ? (
            <EmptyState icone={Inbox} titulo="Nenhum post com esses filtros" descricao="Troque o status, o formato ou o mês." />
          ) : (
            <>
              {/* Lista: sempre no celular; no desktop quando escolhida */}
              <GlassCard className={vista === "lista" ? "overflow-hidden" : "overflow-hidden md:hidden"}>
                {cards.map((p) => (
                  <LinhaPost key={p.id} post={p} />
                ))}
              </GlassCard>
              {vista === "kanban" && (
                <div className="-mx-1 hidden gap-4 overflow-x-auto px-1 pb-3 md:flex">
                  {colunas.map((col) => (
                    <ColunaKanban key={col} status={col} posts={cards.filter((p) => p.status === col)} />
                  ))}
                </div>
              )}
            </>
          )}
        </>
      )}
    </div>
  );
}
