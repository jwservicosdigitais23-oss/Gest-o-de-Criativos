import * as XLSX from "xlsx";
import { LIMITE_LEGENDA } from "./constantes";
import type { Formato, StatusPost } from "./types";

/** Campos do CRM que a planilha pode preencher (ordem = colunas do modelo). */
export const CAMPOS = [
  { campo: "data", rotulo: "Data", obrigatorio: true },
  { campo: "hora", rotulo: "Hora", obrigatorio: false },
  { campo: "perfil", rotulo: "Perfil", obrigatorio: true },
  { campo: "tema", rotulo: "Tema", obrigatorio: true },
  { campo: "legenda", rotulo: "Legenda", obrigatorio: true },
  { campo: "formato", rotulo: "Formato", obrigatorio: false },
  { campo: "pilar", rotulo: "Pilar", obrigatorio: false },
  { campo: "cta", rotulo: "CTA", obrigatorio: false },
  { campo: "arquivo", rotulo: "Arquivo", obrigatorio: false },
  { campo: "id", rotulo: "ID", obrigatorio: false },
] as const;

export type Campo = (typeof CAMPOS)[number]["campo"];
export type Mapeamento = Record<Campo, number | null>;

const SINONIMOS: Record<Campo, string[]> = {
  data: ["data", "data de publicacao", "data da publicacao", "data publicacao", "dia", "data de postagem"],
  hora: ["hora", "horario", "hora de publicacao", "hora da publicacao"],
  perfil: ["perfil", "pagina", "conta", "perfil linkedin"],
  tema: ["tema", "titulo", "assunto", "pauta"],
  legenda: ["legenda", "copy", "script", "texto", "roteiro", "legenda/copy"],
  formato: ["formato", "tipo", "tipo de post"],
  pilar: ["pilar", "pilar de conteudo", "editoria"],
  cta: ["cta", "chamada", "call to action"],
  arquivo: ["arquivo", "midia", "arte", "nome do arquivo"],
  id: ["id", "codigo", "cod", "identificador"],
};

export function normalizar(texto: unknown): string {
  return String(texto ?? "")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}

/** Reconhece as colunas pelo cabeçalho (com variações como "Copy", "Script"...). */
export function detectarMapeamento(cabecalho: unknown[]): Mapeamento {
  const norm = cabecalho.map(normalizar);
  const mapa = {} as Mapeamento;
  const usados = new Set<number>();
  for (const { campo } of CAMPOS) {
    const idx = norm.findIndex((h, i) => !usados.has(i) && SINONIMOS[campo].includes(h));
    mapa[campo] = idx >= 0 ? idx : null;
    if (idx >= 0) usados.add(idx);
  }
  return mapa;
}

export function faltandoObrigatorios(m: Mapeamento): Campo[] {
  return CAMPOS.filter((c) => c.obrigatorio && m[c.campo] == null).map((c) => c.campo);
}

const pad = (n: number) => String(n).padStart(2, "0");

function isoValida(a: number, m: number, d: number): string | null {
  if (!a || !m || !d || m > 12 || d > 31) return null;
  const dt = new Date(Date.UTC(a, m - 1, d));
  if (dt.getUTCFullYear() !== a || dt.getUTCMonth() !== m - 1 || dt.getUTCDate() !== d) return null;
  return `${a}-${pad(m)}-${pad(d)}`;
}

/** Data da planilha → "aaaa-mm-dd" (número serial do Excel, dd/mm/aaaa, aaaa-mm-dd ou Date). */
export function converterData(valor: unknown): string | null {
  if (valor == null || valor === "") return null;
  if (valor instanceof Date && !Number.isNaN(valor.getTime())) {
    return isoValida(valor.getFullYear(), valor.getMonth() + 1, valor.getDate());
  }
  if (typeof valor === "number") {
    const p = XLSX.SSF.parse_date_code(valor);
    return p ? isoValida(p.y, p.m, p.d) : null;
  }
  const t = String(valor).trim();
  let m = t.match(/^(\d{1,2})[/.-](\d{1,2})[/.-](\d{2}|\d{4})$/);
  if (m) {
    const ano = m[3]!.length === 2 ? 2000 + Number(m[3]) : Number(m[3]);
    return isoValida(ano, Number(m[2]), Number(m[1]));
  }
  m = t.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
  if (m) return isoValida(Number(m[1]), Number(m[2]), Number(m[3]));
  return null;
}

/** Hora da planilha → "HH:MM" (fração de dia do Excel, "9:30", "09h30", "9h"). */
export function converterHora(valor: unknown): string | null | "invalida" {
  if (valor == null || valor === "") return null;
  if (valor instanceof Date && !Number.isNaN(valor.getTime())) return `${pad(valor.getHours())}:${pad(valor.getMinutes())}`;
  if (typeof valor === "number") {
    const minutos = Math.round((valor % 1) * 24 * 60);
    return `${pad(Math.floor(minutos / 60) % 24)}:${pad(minutos % 60)}`;
  }
  const m = String(valor)
    .trim()
    .toLowerCase()
    .match(/^(\d{1,2})\s*(?::|h)\s*(\d{2})?\s*(?:min)?$/);
  if (!m) return "invalida";
  const h = Number(m[1]);
  const min = Number(m[2] ?? 0);
  if (h > 23 || min > 59) return "invalida";
  return `${pad(h)}:${pad(min)}`;
}

const FORMATOS: Record<string, Formato> = {
  imagem: "imagem",
  foto: "imagem",
  image: "imagem",
  carrossel: "carrossel",
  carrosel: "carrossel",
  carousel: "carrossel",
  pdf: "carrossel",
  video: "video",
  reels: "video",
  texto: "texto",
  "so texto": "texto",
  documento: "documento",
  artigo: "documento",
};

export function converterFormato(valor: unknown): Formato | null {
  const n = normalizar(valor);
  if (!n) return "imagem";
  return FORMATOS[n] ?? null;
}

export type Situacao = "novo" | "atualiza" | "ignorada" | "erro";

export interface LinhaAnalisada {
  linha: number; // número da linha no Excel (cabeçalho = 1)
  situacao: Situacao;
  motivo?: string;
  avisos: string[];
  dataPassada: boolean;
  perfilDesconhecido?: string;
  postId?: string;
  dados: {
    chave_externa: string | null;
    perfil_id: string | null;
    perfil_nome: string;
    data: string | null;
    hora: string | null;
    tema: string;
    legenda: string;
    formato: Formato;
    pilar: string | null;
    cta: string | null;
    arquivo: string | null;
  };
}

export interface PostExistente {
  id: string;
  perfil_id: string;
  data_publicacao: string;
  tema: string;
  chave_externa: string | null;
  status: StatusPost;
}

export function chaveComposta(perfilId: string, data: string, tema: string) {
  return `${perfilId}|${data}|${normalizar(tema)}`;
}

/** Status que a importação pode sobrescrever. */
export const STATUS_ATUALIZAVEIS: StatusPost[] = ["rascunho", "em_revisao"];

const MOTIVO_IGNORADA: Partial<Record<StatusPost, string>> = {
  aprovado: "Ignorada — já aprovado",
  publicado: "Ignorada — já publicado",
  aguardando: "Ignorada — aguardando aprovação (edite no CRM)",
  reprovado: "Ignorada — post reprovado",
  arquivado: "Ignorada — post arquivado",
};

const texto = (v: unknown) => (v == null ? "" : String(v).trim());

/**
 * Analisa as linhas da planilha: nada é gravado aqui. A chave é a coluna ID;
 * sem ID, Perfil + Data + Tema. Chave existente atualiza em vez de duplicar.
 */
export function analisarLinhas(
  linhas: unknown[][],
  mapa: Mapeamento,
  perfis: { id: string; nome: string }[],
  existentes: PostExistente[],
  hoje: string,
): LinhaAnalisada[] {
  const perfilPorNome = new Map(perfis.map((p) => [normalizar(p.nome), p]));
  const porChaveExterna = new Map<string, PostExistente>();
  const porComposta = new Map<string, PostExistente>();
  for (const e of existentes) {
    porChaveExterna.set(normalizar(e.id), e);
    if (e.chave_externa) porChaveExterna.set(normalizar(e.chave_externa), e);
    porComposta.set(chaveComposta(e.perfil_id, e.data_publicacao, e.tema), e);
  }
  const vistas = new Map<string, number>();
  const get = (row: unknown[], campo: Campo) => (mapa[campo] == null ? null : row[mapa[campo]!]);

  const resultado: LinhaAnalisada[] = [];
  linhas.forEach((row, i) => {
    const numero = i + 2;
    if (!row || row.every((c) => texto(c) === "")) return; // linha vazia

    const perfilNome = texto(get(row, "perfil"));
    const perfil = perfilPorNome.get(normalizar(perfilNome));
    const dataBruta = get(row, "data");
    const data = converterData(dataBruta);
    const hora = converterHora(get(row, "hora"));
    const tema = texto(get(row, "tema"));
    const legenda = texto(get(row, "legenda"));
    const formatoBruto = get(row, "formato");
    const formato = converterFormato(formatoBruto);
    const chave = texto(get(row, "id")) || null;

    const avisos: string[] = [];
    const erros: string[] = [];
    let perfilDesconhecido: string | undefined;

    if (!data) erros.push(texto(dataBruta) ? `Data inválida (“${texto(dataBruta)}”)` : "Data obrigatória");
    if (!perfilNome) erros.push("Perfil obrigatório");
    else if (!perfil) {
      erros.push(`Perfil “${perfilNome}” não cadastrado`);
      perfilDesconhecido = perfilNome;
    }
    if (!tema) erros.push("Tema obrigatório");
    if (!legenda) erros.push("Legenda obrigatória");
    if (hora === "invalida") erros.push(`Hora inválida (“${texto(get(row, "hora"))}”)`);
    if (!formato) avisos.push(`Formato “${texto(formatoBruto)}” não reconhecido — será Imagem`);
    if (legenda.length > LIMITE_LEGENDA) avisos.push(`Legenda com ${legenda.length} caracteres (acima de ${LIMITE_LEGENDA})`);
    const dataPassada = Boolean(data && data < hoje);
    if (dataPassada) avisos.push("Data no passado");

    const dados: LinhaAnalisada["dados"] = {
      chave_externa: chave,
      perfil_id: perfil?.id ?? null,
      perfil_nome: perfil?.nome ?? perfilNome,
      data,
      hora: hora === "invalida" ? null : hora,
      tema,
      legenda,
      formato: formato ?? "imagem",
      pilar: texto(get(row, "pilar")) || null,
      cta: texto(get(row, "cta")) || null,
      arquivo: texto(get(row, "arquivo")) || null,
    };

    if (erros.length) {
      resultado.push({ linha: numero, situacao: "erro", motivo: erros.join(" · "), avisos, dataPassada, perfilDesconhecido, dados });
      return;
    }

    const chaveLinha = chave ? `id:${normalizar(chave)}` : chaveComposta(perfil!.id, data!, tema);
    if (vistas.has(chaveLinha)) {
      resultado.push({
        linha: numero,
        situacao: "erro",
        motivo: `Duplicada na planilha (mesma chave da linha ${vistas.get(chaveLinha)})`,
        avisos,
        dataPassada,
        dados,
      });
      return;
    }
    vistas.set(chaveLinha, numero);

    const existente = chave ? porChaveExterna.get(normalizar(chave)) : porComposta.get(chaveComposta(perfil!.id, data!, tema));
    if (existente) {
      if (!STATUS_ATUALIZAVEIS.includes(existente.status)) {
        resultado.push({
          linha: numero,
          situacao: "ignorada",
          motivo: MOTIVO_IGNORADA[existente.status] ?? "Ignorada",
          avisos,
          dataPassada,
          postId: existente.id,
          dados,
        });
        return;
      }
      resultado.push({ linha: numero, situacao: "atualiza", avisos, dataPassada, postId: existente.id, dados });
      return;
    }
    resultado.push({ linha: numero, situacao: "novo", avisos, dataPassada, dados });
  });
  return resultado;
}

/** Lê a primeira aba de um .xlsx/.csv: cabeçalho (linha 1) + linhas. */
export function lerPlanilha(buffer: ArrayBuffer): { cabecalho: string[]; linhas: unknown[][] } {
  let wb = XLSX.read(buffer, { type: "array", raw: true });
  let ws = wb.Sheets[wb.SheetNames[0]!]!;
  let matriz = XLSX.utils.sheet_to_json<unknown[]>(ws, { header: 1, raw: true, defval: null, blankrows: false });
  // CSV brasileiro separado por ponto e vírgula
  if (matriz[0]?.length === 1 && String(matriz[0][0] ?? "").includes(";")) {
    wb = XLSX.read(buffer, { type: "array", raw: true, FS: ";" });
    ws = wb.Sheets[wb.SheetNames[0]!]!;
    matriz = XLSX.utils.sheet_to_json<unknown[]>(ws, { header: 1, raw: true, defval: null, blankrows: false });
  }
  const [cabecalho = [], ...linhas] = matriz;
  return { cabecalho: cabecalho.map((c) => String(c ?? "").trim()), linhas };
}

export const COLUNAS_EXPORTACAO = [
  "Data",
  "Hora",
  "Perfil",
  "Tema",
  "Legenda",
  "Formato",
  "Pilar",
  "CTA",
  "Arquivo",
  "ID",
  "Status",
  "Versão",
  "Última observação",
] as const;
