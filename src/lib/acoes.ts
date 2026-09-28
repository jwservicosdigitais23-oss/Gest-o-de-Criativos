export type Resultado<T = undefined> = { ok: true; dados?: T } | { ok: false; erro: string };

export function falha(erro: string): { ok: false; erro: string } {
  return { ok: false, erro };
}

/** Traduz erros comuns do Postgres/PostgREST para mensagens em português. */
export function mensagemErro(e: { code?: string; message?: string } | null | undefined, padrao = "Não foi possível concluir a ação.") {
  if (!e) return padrao;
  switch (e.code) {
    case "23505":
      return "Já existe um registro com esse nome.";
    case "23503":
      return "Este registro está em uso e não pode ser removido.";
    case "42501":
      return e.message && !e.message.startsWith("new row") && !e.message.startsWith("permission denied")
        ? e.message
        : "Você não tem permissão para esta ação.";
    case "22023":
    case "P0001":
    case "P0002":
      return e.message ?? padrao;
    case "23514":
      return "Algum campo não atende às regras (verifique a observação e os valores).";
    default:
      return padrao;
  }
}

export const CONFLITO = "Este post foi alterado por outra pessoa. Recarregue para ver a versão mais recente.";
