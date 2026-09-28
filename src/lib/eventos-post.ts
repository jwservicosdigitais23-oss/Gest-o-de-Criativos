import type { EventoLinha } from "@/components/posts/linha-do-tempo";
import type { DetalhePost } from "./detalhe-post";

/** Junta histórico, decisões e comentários numa linha do tempo cronológica. */
export function montarEventos(d: DetalhePost): EventoLinha[] {
  const autor = (id: string | null) => {
    const m = id ? d.membros[id] : null;
    return m ? { nome: m.nome, avatarSrc: m.avatarSrc } : null;
  };
  const decisoes = new Map(d.decisoes.map((x) => [x.id, x]));
  const eventos: EventoLinha[] = [];

  for (const h of d.historico) {
    if (["baixou_midia"].includes(h.acao)) continue;
    const decisaoId = (h.detalhes?.decisao_id as string | undefined) ?? null;
    const dec = decisaoId ? decisoes.get(decisaoId) : undefined;
    eventos.push({
      id: `h${h.id}`,
      quando: h.created_at,
      autor: autor(h.autor_id),
      acao: h.acao,
      versao: h.versao,
      observacao: dec?.observacao ?? null,
      itens: dec?.itens ?? [],
      decisaoId: dec?.id ?? null,
    });
  }
  for (const c of d.comentarios) {
    const dec = c.decisao_id ? decisoes.get(c.decisao_id) : undefined;
    eventos.push({
      id: `c${c.id}`,
      quando: c.created_at,
      autor: autor(c.autor_id),
      acao: "comentou",
      versao: c.versao,
      texto: c.texto,
      respondeA: dec ? `${autor(dec.autor_id)?.nome ?? "observação"} (v${dec.versao})` : null,
    });
  }
  return eventos.sort((a, b) => a.quando.localeCompare(b.quando));
}
