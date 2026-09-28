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
import { StatusBadge } from "@/components/status-badge";
import { PilhaAvatares } from "@/components/ui/avatar";
import { Card } from "@/components/ui/card";
import { exigirMembro } from "@/lib/auth";
import { FORMATO_LABEL } from "@/lib/constantes";
import { formatarData, formatarDataHora, formatarHora } from "@/lib/datas";
import { carregarDetalhePost } from "@/lib/detalhe-post";
import { montarEventos } from "@/lib/eventos-post";

export const metadata: Metadata = { title: "Post" };

function Linha({ rotulo, children }: { rotulo: string; children: React.ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-4 py-2 text-sm">
      <dt className="text-texto-2">{rotulo}</dt>
      <dd className="text-right font-semibold text-azul-escuro">{children}</dd>
    </div>
  );
}

export default async function PostPage(props: PageProps<"/posts/[id]">) {
  const { id } = await props.params;
  const { v } = await props.searchParams;
  const { supabase, membro } = await exigirMembro();
  const d = await carregarDetalhePost(supabase, id, typeof v === "string" ? Number(v) : undefined);
  if (!d) notFound();
  const { post, perfil, conteudo, midias, versao } = d;
  const admin = membro.papel === "admin";
  const versaoAntiga = versao !== post.versao;
  const ehAprovadora = d.aprovadorasIds.includes(membro.id);
  const minhaDecisao = d.decisoes.find((x) => x.versao === post.versao && x.autor_id === membro.id);
  const podeDecidir = ehAprovadora && post.status === "aguardando" && !versaoAntiga && !minhaDecisao;
  const nomeDe = (id: string) => d.membros[id]?.nome ?? "Aprovadora";
  const observacoesAnteriores = d.decisoes
    .filter((x) => x.versao === post.versao - 1 && x.observacao)
    .map((x) => ({ id: x.id, autor: nomeDe(x.autor_id), decisao: x.decisao, observacao: x.observacao!, itens: x.itens }));
  const observacoesAtuais = d.decisoes
    .filter((x) => x.versao === post.versao && x.observacao && x.decisao !== "aprovado")
    .map((x) => ({ id: x.id, autor: nomeDe(x.autor_id), decisao: x.decisao, observacao: x.observacao!, itens: x.itens }));

  return (
    <div className={podeDecidir ? "flex flex-col gap-5 pb-36 sm:pb-0" : "flex flex-col gap-5"}>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Link href={`/perfis/${perfil.id}`} className="inline-flex items-center gap-1 text-sm font-semibold text-azul-medio hover:underline">
          <ArrowLeft className="size-4" /> {perfil.nome}
        </Link>
        {d.versoesDisponiveis.length > 1 && (
          <nav className="flex items-center gap-1 rounded-[var(--radius-control)] border border-borda bg-white p-1" aria-label="Versões">
            <Layers className="ml-1 size-4 text-texto-2" aria-hidden />
            {d.versoesDisponiveis.map((n) => (
              <Link
                key={n}
                href={n === post.versao ? `/posts/${id}` : `/posts/${id}?v=${n}`}
                aria-current={n === versao ? "page" : undefined}
                className={
                  n === versao
                    ? "rounded-md bg-azul-medio px-2.5 py-1 text-xs font-bold text-white"
                    : "rounded-md px-2.5 py-1 text-xs font-semibold text-texto-2 hover:text-azul-escuro"
                }
              >
                v{n}
              </Link>
            ))}
          </nav>
        )}
      </div>

      <div>
        <h1 className="text-2xl font-bold sm:text-page-title">{conteudo.tema}</h1>
        <div className="mt-2 flex flex-wrap items-center gap-2 text-sm text-texto-2">
          <StatusBadge status={post.status} />
          <span>v{versao}</span>
          <span aria-hidden>·</span>
          <span>{FORMATO_LABEL[conteudo.formato]}</span>
          {versaoAntiga && (
            <span className="rounded-full bg-st-rascunho-bg px-2.5 py-0.5 text-xs font-semibold">
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
            <Card className="flex flex-col gap-4 p-5" id="decisao">
              <div>
                <h2 className="text-base font-bold">Sua decisão</h2>
                <p className="text-sm text-texto-2">
                  Versão v{post.versao}
                  {d.progresso?.modo_aprovacao === "todas" &&
                    ` · ${d.progresso.aprovacoes} de ${d.progresso.total_aprovadoras} aprovações`}
                </p>
              </div>
              {observacoesAnteriores.length > 0 && <ObservacoesAnteriores itens={observacoesAnteriores} versao={post.versao - 1} />}
              <PainelDecisao postId={post.id} versao={post.versao} />
            </Card>
          )}
          {!podeDecidir && minhaDecisao && post.status === "aguardando" && (
            <Card className="p-5 text-sm">
              Você {minhaDecisao.decisao === "aprovado" ? "aprovou" : "decidiu"} a v{post.versao}.{" "}
              {d.progresso?.modo_aprovacao === "todas" &&
                `Aguardando as demais aprovadoras (${d.progresso.aprovacoes} de ${d.progresso.total_aprovadoras}).`}
            </Card>
          )}
          {!podeDecidir && admin && post.status === "aguardando" && d.progresso?.modo_aprovacao === "todas" && (
            <Card className="p-5 text-sm">
              <strong className="text-azul-escuro">{d.progresso.aprovacoes} de {d.progresso.total_aprovadoras} aprovações</strong> na v{post.versao}.
            </Card>
          )}
          {admin && post.status === "em_revisao" && observacoesAtuais.length > 0 && (
            <Card className="flex flex-col gap-3 p-5">
              <h2 className="text-base font-bold">Precisa da sua ação</h2>
              <ObservacoesAnteriores itens={observacoesAtuais} versao={post.versao} />
            </Card>
          )}
          <Card className="p-5">
            <h2 className="mb-4 text-base font-bold">Linha do tempo</h2>
            <LinhaDoTempo eventos={montarEventos(d)} postId={post.id} />
          </Card>
        </div>

        <aside className="flex flex-col gap-4">
          <Card className="p-5">
            <dl className="divide-y divide-borda">
              <Linha rotulo="Status"><StatusBadge status={post.status} /></Linha>
              <Linha rotulo="Publicação">
                <span className="inline-flex items-center gap-1">
                  <CalendarClock className="size-4 text-texto-2" />
                  {formatarData(conteudo.data_publicacao)}
                  {conteudo.hora_publicacao && ` às ${formatarHora(conteudo.hora_publicacao)}`}
                </span>
              </Linha>
              <Linha rotulo="Versão">v{post.versao}</Linha>
              <Linha rotulo="Prazo de aprovação">
                <span className="inline-flex items-center gap-1">
                  <Clock className="size-4 text-texto-2" /> {formatarData(post.prazo_aprovacao)}
                </span>
              </Linha>
              {conteudo.pilar && <Linha rotulo="Pilar">{conteudo.pilar}</Linha>}
              {conteudo.cta && <Linha rotulo="CTA">{conteudo.cta}</Linha>}
              <Linha rotulo="Aprovadoras">
                <PilhaAvatares pessoas={d.aprovadoras.map((a) => ({ nome: a!.nome, src: a!.avatarSrc }))} />
              </Linha>
              {post.link_publicado && (
                <Linha rotulo="Publicado">
                  <a href={post.link_publicado} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-azul-medio hover:underline">
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
          </Card>

          {admin && !versaoAntiga && (
            <Card className="p-5">
              <h2 className="rotulo mb-3 text-texto-2">Ações do administrador</h2>
              <AcoesAdmin postId={post.id} status={post.status} temDecisoes={d.decisoes.length > 0} versao={post.versao} />
            </Card>
          )}
        </aside>
      </div>
    </div>
  );
}
