import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { CalendarRange, CheckCircle2, Hourglass, Inbox, Plus, RotateCcw } from "lucide-react";
import { Kpi } from "@/components/kpi";
import { CardPost, LinhaPost, type PostCardDados } from "@/components/posts/card-post";
import { FiltrosPosts } from "@/components/posts/filtros-posts";
import { EstadoVazio } from "@/components/estado-vazio";
import { StatusBadge } from "@/components/status-badge";
import { Avatar, PilhaAvatares } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { exigirMembro } from "@/lib/auth";
import { carregarMiniaturas, contarObservacoes } from "@/lib/consultas";
import { hojeISO, somarDias } from "@/lib/datas";
import { assinarUrls } from "@/lib/storage";
import type { Membro, Perfil, Post, StatusPost } from "@/lib/types";

export const metadata: Metadata = { title: "Perfil" };

const COLUNAS: StatusPost[] = ["rascunho", "aguardando", "em_revisao", "aprovado", "publicado"];

export default async function PerfilPage(props: PageProps<"/perfis/[id]">) {
  const { id } = await props.params;
  const sp = await props.searchParams;
  const { supabase, membro } = await exigirMembro();
  const admin = membro.papel === "admin";

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
  const [miniaturas, observacoes] = await Promise.all([
    carregarMiniaturas(supabase, lista),
    contarObservacoes(supabase, lista.map((p) => p.id)),
  ]);
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
  }));

  const colunas = status ? [status as StatusPost] : COLUNAS;
  const semPosts = t.length === 0;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-4">
          <Avatar nome={perfil.nome} src={perfil.avatar_url ? urls[perfil.avatar_url] : null} tamanho={64} />
          <div className="min-w-0">
            <h1 className="text-2xl font-bold sm:text-[28px]">{perfil.nome}</h1>
            <div className="mt-1 flex flex-wrap items-center gap-2 text-sm text-texto-2">
              <span>{perfil.tipo === "empresa" ? "Empresa" : "Pessoal"}</span>
              <span aria-hidden>·</span>
              <span>{perfil.modo_aprovacao === "todas" ? "Todas precisam aprovar" : "Qualquer uma aprova"}</span>
              <PilhaAvatares pessoas={aprovadoras.map((a) => ({ nome: a.nome, src: a.avatar_url ? urls[a.avatar_url] : null }))} tamanho={24} />
            </div>
          </div>
        </div>
        {admin && (
          <Button asChild>
            <Link href={`/posts/novo?perfil=${perfil.id}`}>
              <Plus /> Novo post
            </Link>
          </Button>
        )}
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Kpi icone={Hourglass} rotulo="Aguardando" valor={kpis.aguardando} />
        <Kpi icone={RotateCcw} rotulo="Em revisão" valor={kpis.revisao} tom="ambar" />
        <Kpi icone={CheckCircle2} rotulo="Aprovados no mês" valor={kpis.aprovadosMes} tom="verde" />
        <Kpi icone={CalendarRange} rotulo="Próximos 7 dias" valor={kpis.proximos} tom="claro" />
      </div>

      {semPosts ? (
        <EstadoVazio
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
            <EstadoVazio icone={Inbox} titulo="Nenhum post com esses filtros" />
          ) : (
            <>
              {/* Lista: sempre no celular; no desktop quando escolhida */}
              <Card className={vista === "lista" ? "overflow-hidden" : "overflow-hidden md:hidden"}>
                {cards.map((p) => (
                    <LinhaPost key={p.id} post={p} />
                  ))}
              </Card>
              {vista === "kanban" && (
                <div className="hidden gap-4 overflow-x-auto pb-2 md:flex">
                  {colunas.map((col) => {
                    const doStatus = cards.filter((p) => p.status === col);
                    return (
                      <section key={col} className="flex w-72 shrink-0 flex-col gap-3 rounded-[10px] bg-[#eef1f5] p-3" aria-label={col}>
                        <header className="flex items-center justify-between px-1">
                          <StatusBadge status={col} />
                          <span className="text-xs font-bold text-texto-2">{doStatus.length}</span>
                        </header>
                        {doStatus.map((p) => (
                          <CardPost key={p.id} post={p} />
                        ))}
                        {doStatus.length === 0 && <p className="px-1 py-6 text-center text-xs text-texto-2">Nada aqui.</p>}
                      </section>
                    );
                  })}
                </div>
              )}
            </>
          )}
        </>
      )}
    </div>
  );
}
