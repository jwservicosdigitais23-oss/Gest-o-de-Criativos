import { Check, CopyPlus, FilePlus2, Globe, MessageSquare, Pencil, RotateCcw, Send, Trash2, Archive, X } from "lucide-react";
import { Avatar } from "@/components/ui/avatar";
import { ITENS_REVISAO } from "@/lib/constantes";
import { formatarDataHora } from "@/lib/datas";
import { cn } from "@/lib/utils";
import { FormComentario } from "./form-comentario";

export interface EventoLinha {
  id: string;
  quando: string;
  autor: { nome: string; avatarSrc: string | null } | null;
  acao: string;
  versao: number | null;
  observacao?: string | null;
  itens?: string[];
  texto?: string | null;
  decisaoId?: string | null;
  respondeA?: string | null;
}

const ACOES: Record<string, { rotulo: string; icone: typeof Check; cor: string }> = {
  criou: { rotulo: "criou o post", icone: FilePlus2, cor: "bg-st-rascunho-bg text-st-rascunho-text" },
  editou: { rotulo: "editou o post", icone: Pencil, cor: "bg-st-rascunho-bg text-st-rascunho-text" },
  enviou: { rotulo: "enviou para aprovação", icone: Send, cor: "bg-st-aguardando-bg text-st-aguardando-text" },
  reenviou: { rotulo: "reenviou com ajustes", icone: Send, cor: "bg-st-aguardando-bg text-st-aguardando-text" },
  editou_e_reenviou: { rotulo: "editou e reenviou para aprovação", icone: Send, cor: "bg-st-aguardando-bg text-st-aguardando-text" },
  aprovou: { rotulo: "aprovou", icone: Check, cor: "bg-st-aprovado-bg text-st-aprovado-text" },
  pediu_revisao: { rotulo: "pediu revisão", icone: RotateCcw, cor: "bg-st-revisao-bg text-st-revisao-text" },
  reprovou: { rotulo: "reprovou", icone: X, cor: "bg-st-reprovado-bg text-st-reprovado-text" },
  publicou: { rotulo: "marcou como publicado", icone: Globe, cor: "bg-st-publicado-bg text-st-publicado-text" },
  duplicou: { rotulo: "criou por duplicação", icone: CopyPlus, cor: "bg-st-rascunho-bg text-st-rascunho-text" },
  arquivou: { rotulo: "arquivou o post", icone: Archive, cor: "bg-st-rascunho-bg text-st-rascunho-text" },
  excluiu: { rotulo: "excluiu o post", icone: Trash2, cor: "bg-st-reprovado-bg text-st-reprovado-text" },
  importou: { rotulo: "importou do cronograma", icone: FilePlus2, cor: "bg-st-rascunho-bg text-st-rascunho-text" },
  atualizou_importacao: { rotulo: "atualizou pelo cronograma", icone: Pencil, cor: "bg-st-rascunho-bg text-st-rascunho-text" },
  reagendou: { rotulo: "mudou a data de publicação", icone: Pencil, cor: "bg-st-rascunho-bg text-st-rascunho-text" },
  comentou: { rotulo: "comentou", icone: MessageSquare, cor: "bg-[#e0f6fd] text-[#00709a]" },
};

const LABEL_ITEM = Object.fromEntries(ITENS_REVISAO.map((i) => [i.valor, i.label]));

/** Linha do tempo com todas as ações do post; observações em destaque âmbar. */
export function LinhaDoTempo({ eventos, postId }: { eventos: EventoLinha[]; postId: string }) {
  return (
    <div className="flex flex-col gap-4">
      <ol className="relative flex flex-col gap-5 before:absolute before:bottom-2 before:left-[17px] before:top-2 before:w-px before:bg-borda">
        {eventos.map((e) => {
          const cfg = ACOES[e.acao] ?? { rotulo: e.acao.replaceAll("_", " "), icone: Pencil, cor: "bg-st-rascunho-bg text-st-rascunho-text" };
          const Icone = cfg.icone;
          const destaque = e.observacao && (e.acao === "pediu_revisao" || e.acao === "reprovou");
          return (
            <li key={e.id} className="relative flex gap-3">
              <span className={cn("z-10 flex size-9 shrink-0 items-center justify-center rounded-full ring-4 ring-white", cfg.cor)}>
                <Icone className="size-4" aria-hidden />
              </span>
              <div className="min-w-0 flex-1 pt-1">
                <p className="flex flex-wrap items-center gap-x-2 text-sm">
                  {e.autor && <Avatar nome={e.autor.nome} src={e.autor.avatarSrc} tamanho={20} className="ring-0" />}
                  <span className="font-semibold text-azul-escuro">{e.autor?.nome ?? "Sistema"}</span>
                  <span>{cfg.rotulo}</span>
                  {e.versao != null && (
                    <span className="rounded-full bg-fundo px-2 text-xs font-bold text-texto-2">v{e.versao}</span>
                  )}
                </p>
                <p className="mt-0.5 text-xs text-texto-2">
                  <time dateTime={e.quando}>{formatarDataHora(e.quando)}</time>
                </p>
                {e.observacao && (
                  <div
                    className={cn(
                      "mt-2 rounded-[var(--radius-control)] border p-3 text-sm",
                      destaque ? "border-[#fcd34d] bg-st-revisao-bg text-[#78350f]" : "border-borda bg-fundo",
                    )}
                  >
                    {e.itens && e.itens.length > 0 && (
                      <p className="mb-1.5 flex flex-wrap gap-1">
                        {e.itens.map((i) => (
                          <span key={i} className="rounded-full bg-white/70 px-2 text-xs font-semibold">
                            {LABEL_ITEM[i] ?? i}
                          </span>
                        ))}
                      </p>
                    )}
                    <p className="whitespace-pre-wrap">{e.observacao}</p>
                  </div>
                )}
                {e.texto && (
                  <div className="mt-2 rounded-[var(--radius-control)] border border-borda bg-white p-3 text-sm">
                    {e.respondeA && <p className="mb-1 text-xs font-semibold text-texto-2">Em resposta a {e.respondeA}</p>}
                    <p className="whitespace-pre-wrap">{e.texto}</p>
                  </div>
                )}
                {e.decisaoId && e.observacao && (
                  <FormComentario postId={postId} decisaoId={e.decisaoId} compacto />
                )}
              </div>
            </li>
          );
        })}
      </ol>
      <FormComentario postId={postId} decisaoId={null} />
    </div>
  );
}
