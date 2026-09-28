import type { Formato, StatusPost } from "./types";

/** Limite por arquivo do plano Free do Supabase. No Pro, aumente aqui. */
export const LIMITE_UPLOAD_MB = 50;
export const LIMITE_UPLOAD_BYTES = LIMITE_UPLOAD_MB * 1024 * 1024;

export const LIMITE_LEGENDA = 3000;
export const CORTE_VER_MAIS = 210;
export const BUCKET_MIDIAS = "midias";

export const STATUS_LABEL: Record<StatusPost, string> = {
  rascunho: "Rascunho",
  aguardando: "Aguardando aprovação",
  em_revisao: "Em revisão",
  aprovado: "Aprovado",
  reprovado: "Reprovado",
  publicado: "Publicado",
  arquivado: "Arquivado",
};

export const STATUS_CLASSES: Record<StatusPost, string> = {
  rascunho: "text-st-rascunho bg-st-rascunho-bg",
  aguardando: "text-st-aguardando bg-st-aguardando-bg",
  em_revisao: "text-st-revisao bg-st-revisao-bg",
  aprovado: "text-st-aprovado bg-st-aprovado-bg",
  reprovado: "text-st-reprovado bg-st-reprovado-bg",
  publicado: "text-st-publicado bg-st-publicado-bg",
  arquivado: "text-st-rascunho bg-st-rascunho-bg",
};

/** Cor sólida (borda/ponto) de cada status. */
export const STATUS_COR: Record<StatusPost, string> = {
  rascunho: "#6B7A90",
  aguardando: "#004C97",
  em_revisao: "#D97706",
  aprovado: "#16A34A",
  reprovado: "#DC2626",
  publicado: "#001F4D",
  arquivado: "#6B7A90",
};

export const STATUS_ORDEM: StatusPost[] = [
  "rascunho",
  "aguardando",
  "em_revisao",
  "aprovado",
  "publicado",
  "reprovado",
];

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
