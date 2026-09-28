"use client";

import { useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { Dialog as D } from "radix-ui";
import { ArrowLeft, ArrowRight, CheckCircle2, LayoutGrid, ListChecks, PenLine, ThumbsDown, ThumbsUp } from "lucide-react";
import { Avatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface PerfilTour {
  id: string;
  nome: string;
  avatarUrl: string | null;
}

/** Tour de 3 passos depois do primeiro acesso (pode pular). */
export function TourBoasVindas({ nome, perfis, aberto: abertoInicial = true }: { nome: string; perfis: PerfilTour[]; aberto?: boolean }) {
  const router = useRouter();
  const pathname = usePathname();
  const [aberto, setAberto] = useState(abertoInicial);
  const [passo, setPasso] = useState(0);

  function fechar() {
    setAberto(false);
    router.replace(pathname, { scroll: false }); // tira o ?boas-vindas=1 da URL
  }

  const passos = [
    {
      icone: LayoutGrid,
      titulo: "Estes são os seus perfis",
      texto: "Você aprova os posts do LinkedIn destes perfis. Eles ficam sempre no menu lateral.",
      conteudo: (
        <ul className="flex flex-wrap justify-center gap-2">
          {perfis.map((p) => (
            <li key={p.id} className="flex items-center gap-2 rounded-full border border-border bg-surface-solid py-1 pl-1 pr-3 shadow-card">
              <Avatar nome={p.nome} src={p.avatarUrl} size="sm" />
              <span className="text-body font-semibold text-navy-900">{p.nome}</span>
            </li>
          ))}
        </ul>
      ),
    },
    {
      icone: ListChecks,
      titulo: "Aqui ficam os posts para aprovar",
      texto: "No Painel aparece a sua fila, do prazo mais curto para o mais longo. Toque no post para ver a arte, a legenda e a prévia do LinkedIn.",
      conteudo: (
        <div className="mx-auto flex w-full max-w-xs items-center gap-3 rounded-[var(--radius-control)] border border-st-aguardando/40 bg-st-aguardando-bg/60 p-3 text-left">
          <span className="flex h-10 w-12 items-center justify-center rounded-lg bg-surface-solid text-label font-bold text-navy-900">10:00</span>
          <span className="min-w-0 flex-1">
            <span className="block truncate text-body font-semibold text-navy-900">Post da semana</span>
            <span className="block text-label text-st-aguardando-text">Aguardando sua aprovação</span>
          </span>
        </div>
      ),
    },
    {
      icone: CheckCircle2,
      titulo: "Aprovar, Revisar ou Reprovar",
      texto: "Revisar pede uma observação — é assim que a equipe sabe exatamente o que ajustar.",
      conteudo: (
        <div className="flex flex-wrap justify-center gap-2">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-st-aprovado-bg px-3 py-1.5 text-body font-semibold text-st-aprovado-text">
            <ThumbsUp className="size-4" aria-hidden /> Aprovar
          </span>
          <span className="inline-flex items-center gap-1.5 rounded-full bg-st-revisao-bg px-3 py-1.5 text-body font-semibold text-st-revisao-text">
            <PenLine className="size-4" aria-hidden /> Revisar
          </span>
          <span className="inline-flex items-center gap-1.5 rounded-full bg-st-reprovado-bg px-3 py-1.5 text-body font-semibold text-st-reprovado-text">
            <ThumbsDown className="size-4" aria-hidden /> Reprovar
          </span>
        </div>
      ),
    },
  ];
  const atual = passos[passo]!;
  const Icone = atual.icone;
  const ultimo = passo === passos.length - 1;

  return (
    <D.Root open={aberto} onOpenChange={(v) => !v && fechar()}>
      <D.Portal>
        <D.Overlay className="fixed inset-0 z-50 bg-overlay backdrop-blur-sm" />
        <D.Content
          className="fixed left-1/2 top-1/2 z-50 w-[calc(100%-2rem)] max-w-md -translate-x-1/2 -translate-y-1/2 overflow-hidden rounded-[var(--radius-card)] bg-surface-solid shadow-elevated focus:outline-none"
          data-testid="tour"
        >
          <div className="bg-gradiente-marca relative flex flex-col items-center gap-3 px-6 pb-8 pt-6 text-center text-white">
            <span className="absolute -right-10 -top-10 size-40 rounded-full bg-cyan-400/30 blur-3xl" aria-hidden />
            <p className="rotulo relative text-white/80">
              Passo {passo + 1} de {passos.length}
            </p>
            <span className="relative flex size-16 items-center justify-center rounded-2xl border border-white/30 bg-white/15 backdrop-blur-md">
              <Icone className="size-8" aria-hidden />
            </span>
            {passo === 0 && <p className="relative text-body text-white/90">Que bom ter você aqui, {nome.split(" ")[0]}!</p>}
          </div>
          <div className="flex flex-col gap-4 px-6 pb-6 pt-5 text-center">
            <D.Title className="text-card-title text-navy-900">{atual.titulo}</D.Title>
            <D.Description className="text-body text-text-muted">{atual.texto}</D.Description>
            <div className="py-1">{atual.conteudo}</div>
            <div className="flex justify-center gap-1.5" aria-hidden>
              {passos.map((_, i) => (
                <span key={i} className={cn("transicao h-1.5 rounded-full", i === passo ? "w-6 bg-blue-600" : "w-1.5 bg-border")} />
              ))}
            </div>
            <div className="flex items-center justify-between gap-2">
              {passo === 0 ? (
                <Button variant="ghost" onClick={fechar}>
                  Pular
                </Button>
              ) : (
                <Button variant="ghost" onClick={() => setPasso((p) => p - 1)}>
                  <ArrowLeft /> Voltar
                </Button>
              )}
              <Button onClick={() => (ultimo ? fechar() : setPasso((p) => p + 1))}>
                {ultimo ? "Começar" : "Próximo"} {!ultimo && <ArrowRight />}
              </Button>
            </div>
          </div>
        </D.Content>
      </D.Portal>
    </D.Root>
  );
}
