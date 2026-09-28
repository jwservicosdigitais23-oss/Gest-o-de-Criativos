import "server-only";

import * as XLSX from "xlsx";
import type { SupabaseClient } from "@supabase/supabase-js";
import { COLUNAS_EXPORTACAO } from "./cronograma";
import { FORMATO_LABEL, STATUS_LABEL } from "./constantes";
import { formatarData, formatarHora } from "./datas";
import type { Post } from "./types";

/** Gera o .xlsx do cronograma (mesmas colunas da importação + Status, Versão e Última observação). */
export async function gerarCronogramaXlsx(
  supabase: SupabaseClient,
  filtros: { perfilId?: string | null; de?: string | null; ate?: string | null; perfis?: string[] | null },
) {
  let q = supabase
    .from("posts")
    .select("*, perfis(nome)")
    .neq("status", "arquivado")
    .order("data_publicacao")
    .order("hora_publicacao", { nullsFirst: true });
  if (filtros.perfilId) q = q.eq("perfil_id", filtros.perfilId);
  if (filtros.perfis?.length) q = q.in("perfil_id", filtros.perfis);
  if (filtros.de) q = q.gte("data_publicacao", filtros.de);
  if (filtros.ate) q = q.lte("data_publicacao", filtros.ate);
  const { data: posts } = await q.returns<(Post & { perfis: { nome: string } | null })[]>();
  const lista = posts ?? [];

  const { data: obs } = lista.length
    ? await supabase.from("posts_ultima_observacao").select("post_id, observacao").in("post_id", lista.map((p) => p.id))
    : { data: [] };
  const ultima = new Map((obs ?? []).map((o) => [o.post_id as string, o.observacao as string]));

  const linhas = lista.map((p) => [
    formatarData(p.data_publicacao),
    formatarHora(p.hora_publicacao),
    p.perfis?.nome ?? "",
    p.tema,
    p.legenda,
    FORMATO_LABEL[p.formato],
    p.pilar ?? "",
    p.cta ?? "",
    p.arquivo_ref ?? "",
    p.chave_externa ?? p.id,
    STATUS_LABEL[p.status],
    p.versao,
    ultima.get(p.id) ?? "",
  ]);
  return montarXlsx([[...COLUNAS_EXPORTACAO], ...linhas], [12, 7, 20, 40, 60, 12, 16, 24, 24, 38, 22, 8, 50]);
}

export function montarXlsx(matriz: (string | number)[][], larguras: number[]) {
  const ws = XLSX.utils.aoa_to_sheet(matriz);
  ws["!cols"] = larguras.map((wch) => ({ wch }));
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Cronograma");
  return XLSX.write(wb, { type: "buffer", bookType: "xlsx" }) as Buffer;
}

export function respostaXlsx(buffer: Buffer, nome: string) {
  return new Response(new Uint8Array(buffer), {
    headers: {
      "content-type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "content-disposition": `attachment; filename="${nome}"`,
      "cache-control": "no-store",
    },
  });
}
