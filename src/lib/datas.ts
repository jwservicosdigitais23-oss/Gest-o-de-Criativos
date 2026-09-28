/**
 * Datas sempre no fuso America/Sao_Paulo e no formato dd/mm/aaaa.
 * No banco, data e hora de publicação ficam em colunas `date` e `time`
 * (sem fuso), então strings "aaaa-mm-dd" nunca passam por conversão de UTC.
 */
export const FUSO = "America/Sao_Paulo";

/** Hoje em São Paulo, como "aaaa-mm-dd". */
export function hojeISO(agora: Date = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: FUSO,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(agora);
}

/** Hora atual em São Paulo (0–23). */
export function horaSP(agora: Date = new Date()): number {
  return Number(
    new Intl.DateTimeFormat("en-US", { timeZone: FUSO, hour: "numeric", hour12: false }).format(agora),
  ) % 24;
}

export function saudacao(agora: Date = new Date()) {
  const h = horaSP(agora);
  if (h >= 5 && h < 12) return "Bom dia";
  if (h >= 12 && h < 18) return "Boa tarde";
  return "Boa noite";
}

/** "aaaa-mm-dd" → Date ao meio-dia UTC (estável para aritmética de dias). */
export function isoParaDate(iso: string): Date {
  const [a, m, d] = iso.slice(0, 10).split("-").map(Number);
  return new Date(Date.UTC(a!, m! - 1, d!, 12));
}

export function dateParaISO(d: Date): string {
  return d.toISOString().slice(0, 10);
}

export function somarDias(iso: string, dias: number): string {
  const d = isoParaDate(iso);
  d.setUTCDate(d.getUTCDate() + dias);
  return dateParaISO(d);
}

export function diferencaDias(deISO: string, ateISO: string): number {
  return Math.round((isoParaDate(ateISO).getTime() - isoParaDate(deISO).getTime()) / 86_400_000);
}

/** Dia da semana (0 = domingo) de uma data "aaaa-mm-dd". */
export function diaDaSemana(iso: string): number {
  return isoParaDate(iso).getUTCDay();
}

/** Subtrai dias úteis (seg–sex). Padrão do prazo: 2 dias úteis antes da publicação. */
export function subtrairDiasUteis(iso: string, dias: number): string {
  let atual = iso;
  let restantes = dias;
  while (restantes > 0) {
    atual = somarDias(atual, -1);
    const dow = diaDaSemana(atual);
    if (dow !== 0 && dow !== 6) restantes--;
  }
  return atual;
}

export const PRAZO_PADRAO_DIAS_UTEIS = 2;

export function prazoPadrao(dataPublicacao: string) {
  return subtrairDiasUteis(dataPublicacao, PRAZO_PADRAO_DIAS_UTEIS);
}

/** "aaaa-mm-dd" → "dd/mm/aaaa" */
export function formatarData(iso: string | null | undefined): string {
  if (!iso) return "—";
  const [a, m, d] = iso.slice(0, 10).split("-");
  return `${d}/${m}/${a}`;
}

/** "HH:MM:SS" → "HH:MM" */
export function formatarHora(hora: string | null | undefined): string {
  if (!hora) return "";
  return hora.slice(0, 5);
}

/** timestamptz → "dd/mm/aaaa HH:MM" em São Paulo */
export function formatarDataHora(ts: string | Date | null | undefined): string {
  if (!ts) return "—";
  const d = typeof ts === "string" ? new Date(ts) : ts;
  const partes = new Intl.DateTimeFormat("pt-BR", {
    timeZone: FUSO,
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(d);
  return partes.replace(",", "");
}

const DIAS_SEMANA = ["dom", "seg", "ter", "qua", "qui", "sex", "sáb"];
const MESES = [
  "janeiro", "fevereiro", "março", "abril", "maio", "junho",
  "julho", "agosto", "setembro", "outubro", "novembro", "dezembro",
];

export function nomeDiaSemana(iso: string) {
  return DIAS_SEMANA[diaDaSemana(iso)]!;
}

export function nomeMes(mes1a12: number) {
  return MESES[mes1a12 - 1]!;
}

/** "Seg, 05/10" */
export function formatarDiaCurto(iso: string) {
  const [, m, d] = iso.split("-");
  const dia = nomeDiaSemana(iso);
  return `${dia[0]!.toUpperCase()}${dia.slice(1)}, ${d}/${m}`;
}

/** Tempo relativo simples ("há 5 min", "há 2 h", "há 3 dias"). */
export function tempoRelativo(ts: string, agora: Date = new Date()) {
  const diff = Math.max(0, agora.getTime() - new Date(ts).getTime());
  const min = Math.floor(diff / 60_000);
  if (min < 1) return "agora";
  if (min < 60) return `há ${min} min`;
  const h = Math.floor(min / 60);
  if (h < 24) return `há ${h} h`;
  const dias = Math.floor(h / 24);
  return dias === 1 ? "há 1 dia" : `há ${dias} dias`;
}

/** Horas → "1d 4h", "6h", "35 min" */
export function formatarDuracaoHoras(horas: number | null | undefined) {
  if (horas == null || Number.isNaN(horas)) return "—";
  if (horas < 1) return `${Math.max(1, Math.round(horas * 60))} min`;
  if (horas < 24) return `${Math.round(horas)}h`;
  const d = Math.floor(horas / 24);
  const h = Math.round(horas % 24);
  return h ? `${d}d ${h}h` : `${d}d`;
}
