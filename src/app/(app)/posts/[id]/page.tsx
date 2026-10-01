import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, CalendarClock, Clock, ExternalLink, Layers } from "lucide-react";
import { AcoesAdmin, BotaoCopiarLegenda, ListaDownloads } from "@/components/posts/acoes-post";
import { BotaoWhatsApp } from "@/components/posts/botao-whatsapp";
import { LinhaDoTempo } from "@/components/posts/linha-do-tempo";
import { ObservacoesAnteriores } from "@/components/posts/observacoes-anteriores";
import { PainelDecisao } from "@/components/posts/painel-decisao";
import { PreviaLinkedIn } from "@/components/posts/previa-linkedin";
import { Avatar, PilhaAvatares } from "@/components/ui/avatar";
import { GlassCard } from "@/components/ui/card";
import { SectionHeader } from "@/components/ui/page-header";
import { StatusPill } from "@/components/ui/status-pill";
import { exigirMembro } from "@/lib/auth";
import { FORMATO_LABEL } from "@/lib/constantes";
import { formatarData, formatarDataHora, formatarHora, hojeISO } from "@/lib/datas";
import { carregarDetalhePost } from "@/lib/detalhe-post";
import { montarEventos } from "@/lib/eventos-post";
import { progressoPorPessoa, textoProgresso } from "@/lib/progresso";
import { statusVisual } from "@/lib/status";

export const metadata: Metadata = { title: "Post" };

function Linha({ rotulo, children }: { rotulo: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-4 py-2.5 text-body">
      <dt className="text-text-muted">{rotulo}</dt>
      <dd className="text-right font-semibold text-navy-900">{children}</dd>
    </div>
  );
}

export default async function PostPage(props: PageProps<"/posts/[id]">) {
  const { id } = await props.params;
  const { v } = await props.searchParams;
  const { supabase, membro, perfisIds } = await exigirMembro();
  const d = await carregarDetalhePost(supabase, id, typeof v === "string" ? Number(v) : undefined);
  if (!d) notFound();
  if (perfisIds && !perfisIds.includes(d.perfil.id)) notFound(); // "Ver como": fora dos perfis dela
  const { post, perfil, conteudo, midias, versao } = d;
  const admin = membro.papel === "admin";
  const versaoAntiga = versao !== post.versao;
  const sv = statusVisual(post.status, post.prazo_aprovacao, hojeISO());
  const ehAprovadora = d.aprovadorasIds.includes(membro.id);
  const minhaDecisao = d.decisoes.find((x) => x.versao === post.versao && x.autor_id === membro.id);
  const podeDecidir = ehAprovadora && post.status === "aguardando" && !versaoAntiga && !minhaDecisao;
  const nomeDe = (id: string) => d.membros[id]?.nome ?? "Aprovadora";
  const observacoesAnteriores = d.decisoes
    .filter((x) => x.versao === post.versao - 1 && x.observacao)
    .map((x) => ({ id: x.id, autor: nomeDe(x.autor_id), decisao: x.decisao, observacao: x.observacao!, itens: x.itens }));
  // Modo "todas": quem já decidiu na versão atual e quem falta.
  const progressoPessoas =
    d.progresso?.modo_aprovacao === "todas" && post.status === "aguardando"
      ? textoProgresso(
          progressoPorPessoa(
            d.aprovadoras.map((a) => ({ id: a!.id, nome: a!.nome })),
            d.decisoes,
            post.versao,
          ),
        )
      : null;
  // "Aprovado por Daniela Quintana": quem tomou a decisão que definiu o status.
  const decisoesFinais = d.decisoes.filter(
    (x) =>
      x.versao === post.versao &&
      ((["aprovado", "publicado"].includes(post.status) && x.decisao === "aprovado") ||
        (post.status === "reprovado" && x.decisao === "reprovado")),
  );
  const decididoPor = !versaoAntiga && decisoesFinais.length ? decisoesFinais.map((x) => nomeDe(x.autor_id)).join(" e ") : null;
  const observacoesAtuais = d.decisoes
    .filter((x) => x.versao === post.versao && x.observacao && x.decisao !== "aprovado")
    .map((x) => ({ id: x.id, autor: nomeDe(x.autor_id), decisao: x.decisao, observacao: x.observacao!, itens: x.itens }));

  return (
    <div className={podeDecidir ? "flex flex-col gap-5 pb-36 sm:pb-0" : "flex flex-col gap-5"}>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Link
          href={`/perfis/${perfil.id}`}
          className="transicao group inline-flex items-center gap-2 rounded-full border border-border bg-surface-solid py-1 pl-1 pr-3 text-body font-semibold text-navy-900 hover:border-blue-600 hover:text-blue-600"
        >
          <span className="flex size-7 items-center justify-center rounded-full bg-bg-app-from">
            <ArrowLeft className="size-4" />
          </span>
          <Avatar nome={perfil.nome} src={perfil.avatarSrc} size="sm" />
          {perfil.nome}
        </Link>
        {d.versoesDisponiveis.length > 1 && (
          <nav className="flex items-center gap-1 rounded-[var(--radius-control)] border border-border bg-surface-solid p-1" aria-label="Versões">
            <Layers className="ml-1 size-4 text-text-muted" aria-hidden />
            {d.versoesDisponiveis.map((n) => (
              <Link
                key={n}
                href={n === post.versao ? `/posts/${id}` : `/posts/${id}?v=${n}`}
                aria-current={n === versao ? "page" : undefined}
                className={
                  n === versao
                    ? "bg-gradiente-primario rounded-[calc(var(--radius-control)-4px)] px-3 py-1 text-label font-bold text-white"
                    : "transicao rounded-[calc(var(--radius-control)-4px)] px-3 py-1 text-label font-semibold text-text-muted hover:text-navy-900"
                }
              >
                v{n}
              </Link>
            ))}
          </nav>
        )}
      </div>

      <div>
        <h1 className="text-2xl font-bold text-navy-900 sm:text-page-title">{conteudo.tema}</h1>
        <div className="mt-2 flex flex-wrap items-center gap-2 text-body text-text-muted">
          <StatusPill status={sv} por={decididoPor} />
          <span>v{versao}</span>
          <span aria-hidden>·</span>
          <span>{FORMATO_LABEL[conteudo.formato]}</span>
          {versaoAntiga && (
            <span className="rounded-full bg-st-rascunho-bg px-2.5 py-0.5 text-label font-semibold text-st-rascunho-text">
              Vendo versão anterior
            </span>
          )}
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_360px]">
        <div className="flex min-w-0 flex-col gap-6">
          <div className="mx-auto w-full max-w-[555px]">
            <PreviaLinkedIn
              perfil={{ nome: perfil.nome, avatarSrc: perfil.avatarSrc, tipo: perfil.tipo }}
              legenda={conteudo.legenda}
              midias={midias.map((m) => ({ id: m.id, tipo: m.tipo, url: m.src, nome: m.nome_arquivo }))}
            />
          </div>
          {podeDecidir && (
            <GlassCard className="flex scroll-mt-24 flex-col gap-4 p-5" id="decisao">
              <div>
                <SectionHeader titulo="Sua decisão" />
                <p className="text-body text-text-muted">
                  Versão v{post.versao}
                  {d.progresso?.modo_aprovacao === "todas" &&
                    ` · ${d.progresso.aprovacoes} de ${d.progresso.total_aprovadoras} aprovações`}
                </p>
                {progressoPessoas && (
                  <p className="text-label text-text-muted" data-testid="progresso-pessoas">
                    {progressoPessoas}
                  </p>
                )}
              </div>
              {observacoesAnteriores.length > 0 && <ObservacoesAnteriores itens={observacoesAnteriores} versao={post.versao - 1} />}
              <PainelDecisao postId={post.id} versao={post.versao} />
            </GlassCard>
          )}
          {!podeDecidir && minhaDecisao && post.status === "aguardando" && (
            <GlassCard className="p-5 text-body">
              Você {minhaDecisao.decisao === "aprovado" ? "aprovou" : "decidiu"} a v{post.versao}.{" "}
              {d.progresso?.modo_aprovacao === "todas" &&
                `Aguardando as demais aprovadoras (${d.progresso.aprovacoes} de ${d.progresso.total_aprovadoras}).`}
              {progressoPessoas && (
                <span className="mt-1 block text-label text-text-muted" data-testid="progresso-pessoas">
                  {progressoPessoas}
                </span>
              )}
            </GlassCard>
          )}
          {!podeDecidir && admin && post.status === "aguardando" && d.progresso?.modo_aprovacao === "todas" && (
            <GlassCard className="p-5 text-body">
              <strong className="text-navy-900">{d.progresso.aprovacoes} de {d.progresso.total_aprovadoras} aprovações</strong> na v{post.versao}.
              {progressoPessoas && (
                <span className="mt-1 block text-label text-text-muted" data-testid="progresso-pessoas">
                  {progressoPessoas}
                </span>
              )}
            </GlassCard>
          )}
          {admin && post.status === "em_revisao" && observacoesAtuais.length > 0 && (
            <GlassCard className="flex flex-col gap-3 p-5">
              <SectionHeader titulo="Precisa da sua ação" />
              <ObservacoesAnteriores itens={observacoesAtuais} versao={post.versao} />
            </GlassCard>
          )}
          <GlassCard className="flex flex-col gap-4 p-5">
            <SectionHeader titulo="Linha do tempo" />
            <LinhaDoTempo eventos={montarEventos(d)} postId={post.id} />
          </GlassCard>
        </div>

        <aside className="flex flex-col gap-4 lg:sticky lg:top-24 lg:self-start">
          <GlassCard className="p-5">
            <SectionHeader titulo="Detalhes" className="mb-1" />
            <dl className="divide-y divide-border">
              <Linha rotulo="Status"><StatusPill status={sv} por={decididoPor} className="whitespace-normal text-right" /></Linha>
              <Linha rotulo="Publicação">
                <span className="inline-flex items-center gap-1">
                  <CalendarClock className="size-4 text-text-muted" />
                  {formatarData(conteudo.data_publicacao)}
                  {conteudo.hora_publicacao && ` às ${formatarHora(conteudo.hora_publicacao)}`}
                </span>
              </Linha>
              <Linha rotulo="Versão">v{post.versao}</Linha>
              <Linha rotulo="Prazo de aprovação">
                <span className="inline-flex items-center gap-1">
                  <Clock className="size-4 text-text-muted" /> {formatarData(post.prazo_aprovacao)}
                </span>
              </Linha>
              {conteudo.pilar && <Linha rotulo="Pilar">{conteudo.pilar}</Linha>}
              {conteudo.cta && <Linha rotulo="CTA">{conteudo.cta}</Linha>}
              <Linha rotulo="Aprovadoras">
                <PilhaAvatares pessoas={d.aprovadoras.map((a) => ({ nome: a!.nome, src: a!.avatarSrc }))} />
              </Linha>
              {post.link_publicado && (
                <Linha rotulo="Publicado">
                  <a href={post.link_publicado} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-blue-600 hover:underline">
                    {formatarDataHora(post.publicado_em)} <ExternalLink className="size-3.5" />
                  </a>
                </Linha>
              )}
            </dl>
            <div className="mt-4 flex flex-col gap-2">
              <BotaoCopiarLegenda legenda={conteudo.legenda} />
              <ListaDownloads midias={midias.map((m) => ({ id: m.id, nome: m.nome_arquivo, download: m.download }))} />
              {admin && post.status === "aguardando" && (
                <BotaoWhatsApp
                  postId={post.id}
                  tema={post.tema}
                  aprovadoras={d.aprovadoras
                    .filter((a) => !d.decisoes.some((x) => x.versao === post.versao && x.autor_id === a!.id))
                    .map((a) => a!.nome)}
                />
              )}
            </div>
          </GlassCard>

          {admin && !versaoAntiga && (
            <GlassCard className="flex flex-col gap-3 p-5">
              <SectionHeader titulo="Ações do administrador" />
              <AcoesAdmin postId={post.id} status={post.status} temDecisoes={d.decisoes.length > 0} versao={post.versao} />
            </GlassCard>
          )}
        </aside>
      </div>
    </div>
  );
}
