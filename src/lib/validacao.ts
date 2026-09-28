import { z } from "zod";
import { LIMITE_LEGENDA } from "./constantes";

const dataISO = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Data inválida.");

export const postSchema = z.object({
  id: z.string().uuid(),
  perfil_id: z.string().uuid("Escolha o perfil."),
  data_publicacao: dataISO,
  hora_publicacao: z
    .string()
    .regex(/^(\d{2}:\d{2})?$/, "Hora inválida.")
    .transform((v) => v || null),
  tema: z.string().trim().min(1, "Informe o tema.").max(300, "Tema muito longo."),
  legenda: z.string().max(LIMITE_LEGENDA, `A legenda passa de ${LIMITE_LEGENDA} caracteres.`),
  formato: z.enum(["imagem", "carrossel", "video", "texto", "documento"]),
  pilar: z.string().trim().max(120).transform((v) => v || null),
  cta: z.string().trim().max(300).transform((v) => v || null),
  prazo_aprovacao: z
    .string()
    .regex(/^(\d{4}-\d{2}-\d{2})?$/, "Prazo inválido.")
    .transform((v) => v || null),
  updated_at: z.string().nullable().optional(),
});

export type DadosPost = z.input<typeof postSchema>;

export const midiaSchema = z
  .object({
    id: z.string().uuid().optional(),
    tipo: z.enum(["imagem", "pdf", "video", "link"]),
    storage_path: z.string().min(1).nullable().optional(),
    url_externa: z
      .string()
      .url("Link inválido.")
      .refine((u) => /^https?:\/\//i.test(u), "Use um link http(s).")
      .nullable()
      .optional(),
    nome_arquivo: z.string().min(1).max(255),
    mime: z.string().nullable().optional(),
    tamanho: z.number().int().nonnegative().nullable().optional(),
    largura: z.number().int().positive().nullable().optional(),
    altura: z.number().int().positive().nullable().optional(),
  })
  .refine((m) => Boolean(m.storage_path) !== Boolean(m.url_externa), "Mídia sem arquivo ou link.");

export type DadosMidia = z.input<typeof midiaSchema>;
