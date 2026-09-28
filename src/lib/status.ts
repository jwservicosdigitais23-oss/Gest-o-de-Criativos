import { AlarmClock, Archive, CircleCheck, CircleX, FilePen, Hourglass, RotateCcw, Send, type LucideIcon } from "lucide-react";
import type { StatusPost } from "./types";

/** Status visuais: os do banco + "atrasado" (aguardando/em revisão com prazo vencido). */
export type StatusVisual = StatusPost | "atrasado";

export interface ConfigStatus {
  rotulo: string;
  icone: LucideIcon;
  /** classes de texto (AA), fundo, borda e ícone */
  texto: string;
  fundo: string;
  borda: string;
  corIcone: string;
  /** cor sólida (pílulas do calendário, gráficos) */
  cor: string;
}

/** Mapa único de status — todas as telas usam este objeto. */
export const STATUS: Record<StatusVisual, ConfigStatus> = {
  rascunho: {
    rotulo: "Rascunho",
    icone: FilePen,
    texto: "text-st-rascunho-text",
    fundo: "bg-st-rascunho-bg",
    borda: "border-st-rascunho",
    corIcone: "text-st-rascunho",
    cor: "var(--color-st-rascunho)",
  },
  aguardando: {
    rotulo: "Aguardando aprovação",
    icone: Hourglass,
    texto: "text-st-aguardando-text",
    fundo: "bg-st-aguardando-bg",
    borda: "border-st-aguardando",
    corIcone: "text-st-aguardando",
    cor: "var(--color-st-aguardando)",
  },
  em_revisao: {
    rotulo: "Em revisão",
    icone: RotateCcw,
    texto: "text-st-revisao-text",
    fundo: "bg-st-revisao-bg",
    borda: "border-st-revisao",
    corIcone: "text-st-revisao",
    cor: "var(--color-st-revisao)",
  },
  atrasado: {
    rotulo: "Atrasado",
    icone: AlarmClock,
    texto: "text-st-atrasado-text",
    fundo: "bg-st-atrasado-bg",
    borda: "border-st-atrasado",
    corIcone: "text-st-atrasado",
    cor: "var(--color-st-atrasado)",
  },
  aprovado: {
    rotulo: "Aprovado",
    icone: CircleCheck,
    texto: "text-st-aprovado-text",
    fundo: "bg-st-aprovado-bg",
    borda: "border-st-aprovado",
    corIcone: "text-st-aprovado",
    cor: "var(--color-st-aprovado)",
  },
  reprovado: {
    rotulo: "Reprovado",
    icone: CircleX,
    texto: "text-st-reprovado-text",
    fundo: "bg-st-reprovado-bg",
    borda: "border-st-reprovado",
    corIcone: "text-st-reprovado",
    cor: "var(--color-st-reprovado)",
  },
  publicado: {
    rotulo: "Publicado",
    icone: Send,
    texto: "text-st-publicado-text",
    fundo: "bg-st-publicado-bg",
    borda: "border-st-publicado",
    corIcone: "text-st-publicado",
    cor: "var(--color-st-publicado)",
  },
  arquivado: {
    rotulo: "Arquivado",
    icone: Archive,
    texto: "text-st-rascunho-text",
    fundo: "bg-st-rascunho-bg",
    borda: "border-st-rascunho",
    corIcone: "text-st-rascunho",
    cor: "var(--color-st-rascunho)",
  },
};

/** Ordem de exibição (Kanban, filtros, "Por perfil"). */
export const ORDEM_STATUS: StatusPost[] = ["rascunho", "aguardando", "em_revisao", "aprovado", "publicado", "reprovado"];

/** Um post está atrasado quando espera decisão/ajuste com o prazo vencido. */
export function statusVisual(status: StatusPost, prazo: string | null | undefined, hoje: string): StatusVisual {
  if ((status === "aguardando" || status === "em_revisao") && prazo && prazo < hoje) return "atrasado";
  return status;
}
