import { ORDEM_STATUS, STATUS } from "./status";
import type { Formato, StatusPost } from "./types";

/** Limite por arquivo do plano Free do Supabase. No Pro, aumente aqui. */
export const LIMITE_UPLOAD_MB = 50;
export const LIMITE_UPLOAD_BYTES = LIMITE_UPLOAD_MB * 1024 * 1024;

export const LIMITE_LEGENDA = 3000;
export const CORTE_VER_MAIS = 210;
export const BUCKET_MIDIAS = "midias";

// Derivados do mapa único em lib/status.ts (mantidos para as telas atuais).
export const STATUS_LABEL = Object.fromEntries(
  Object.entries(STATUS).map(([k, v]) => [k, v.rotulo]),
) as Record<StatusPost, string>;

export const STATUS_CLASSES = Object.fromEntries(
  Object.entries(STATUS).map(([k, v]) => [k, `${v.texto} ${v.fundo}`]),
) as Record<StatusPost, string>;

/** Cor sólida (borda/ponto) de cada status. */
export const STATUS_COR = Object.fromEntries(
  Object.entries(STATUS).map(([k, v]) => [k, v.cor]),
) as Record<StatusPost, string>;

export const STATUS_ORDEM: StatusPost[] = ORDEM_STATUS;

export const FORMATO_LABEL: Record<Formato, string> = {
  imagem: "Imagem",
  carrossel: "Carrossel",
  video: "Vídeo",
  texto: "Texto",
  documento: "Documento",
};

export const ITENS_REVISAO = [
  { valor: "legenda", label: "Legenda" },
  { valor: "arte", label: "Arte/Vídeo" },
  { valor: "cta", label: "CTA" },
  { valor: "data", label: "Data" },
  { valor: "outro", label: "Outro" },
] as const;
