import type { Midia, Post, StatusPost, TipoMidia } from "./types";

/** Status em que o administrador pode editar o post. */
export const STATUS_EDITAVEIS: StatusPost[] = ["rascunho", "em_revisao", "aguardando", "aprovado"];

export function podeEditar(status: StatusPost) {
  return STATUS_EDITAVEIS.includes(status);
}

/**
 * Versão em que as alterações do formulário entram.
 * Rascunho edita a própria versão; nos demais status as alterações formam a
 * próxima versão (v+1), que passa a valer ao (re)enviar para aprovação.
 */
export function versaoDeEdicao(post: Pick<Post, "status" | "versao">) {
  return post.status === "rascunho" ? post.versao : post.versao + 1;
}

/** Mídias válidas numa versão (mesma regra de public.midias_da_versao). */
export function midiasDaVersao<T extends Pick<Midia, "versao" | "versao_removida" | "ordem">>(midias: T[], versao: number) {
  return midias
    .filter((m) => m.versao <= versao && (m.versao_removida == null || m.versao_removida > versao))
    .sort((a, b) => a.ordem - b.ordem);
}

export const TIPOS_ACEITOS: Record<string, TipoMidia> = {
  "image/jpeg": "imagem",
  "image/png": "imagem",
  "image/webp": "imagem",
  "application/pdf": "pdf",
  "video/mp4": "video",
  "video/quicktime": "video",
};

export const ACCEPT_UPLOAD = ".jpg,.jpeg,.png,.webp,.pdf,.mp4,.mov";

export function tipoDoArquivo(arquivo: { type: string; name: string }): TipoMidia | null {
  if (TIPOS_ACEITOS[arquivo.type]) return TIPOS_ACEITOS[arquivo.type]!;
  const ext = arquivo.name.split(".").pop()?.toLowerCase();
  if (ext === "mov") return "video";
  if (ext === "mp4") return "video";
  if (ext === "pdf") return "pdf";
  if (ext && ["jpg", "jpeg", "png", "webp"].includes(ext)) return "imagem";
  return null;
}

const PROPORCOES_IMAGEM = [
  { nome: "1:1", valor: 1 },
  { nome: "4:5", valor: 4 / 5 },
  { nome: "1,91:1", valor: 1.91 },
];
const PROPORCOES_VIDEO = [
  { nome: "9:16", valor: 9 / 16 },
  { nome: "1:1", valor: 1 },
  { nome: "16:9", valor: 16 / 9 },
];

/** Aviso quando a proporção não é recomendada pelo LinkedIn (tolerância de 3%). */
export function avisoProporcao(tipo: TipoMidia, largura?: number | null, altura?: number | null): string | null {
  if (!largura || !altura || (tipo !== "imagem" && tipo !== "video")) return null;
  const lista = tipo === "imagem" ? PROPORCOES_IMAGEM : PROPORCOES_VIDEO;
  const r = largura / altura;
  const ok = lista.some((p) => Math.abs(r - p.valor) / p.valor <= 0.03);
  if (ok) return null;
  return `Proporção ${largura}×${altura} fora do recomendado (${lista.map((p) => p.nome).join(", ")}).`;
}

/** Nome de arquivo seguro para o Storage. */
export function nomeSeguro(nome: string) {
  const partes = nome.split(".");
  const ext = partes.length > 1 ? partes.pop()!.toLowerCase() : "";
  const base = partes
    .join(".")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-zA-Z0-9-_]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .toLowerCase()
    .slice(0, 80);
  return ext ? `${base || "arquivo"}.${ext}` : base || "arquivo";
}

export function caminhoMidia(perfilId: string, postId: string, versao: number, nome: string) {
  return `${perfilId}/${postId}/v${versao}/${Date.now()}-${nomeSeguro(nome)}`;
}

export function formatarTamanho(bytes: number | null | undefined) {
  if (!bytes) return "";
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1).replace(".", ",")} MB`;
}
