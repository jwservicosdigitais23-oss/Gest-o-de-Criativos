import type { Membro } from "./types";

type Pessoa = Pick<Membro, "id" | "papel" | "ativo">;

/**
 * Só um admin ativo pode "ver como", e só uma aprovadora ativa (nunca ele
 * mesmo nem outro admin). Conferido no servidor em toda entrada.
 */
export function podeVerComo(quem: Pessoa | null | undefined, alvo: Pessoa | null | undefined): boolean {
  if (!quem || !alvo) return false;
  return quem.papel === "admin" && quem.ativo && alvo.papel === "aprovadora" && alvo.ativo && alvo.id !== quem.id;
}

export function textoHistoricoVerComo(admin: string, alvo: string, entrada: boolean) {
  const primeiro = admin.split(" ")[0];
  return entrada ? `${primeiro} visualizou como ${alvo}` : `${primeiro} saiu da visualização como ${alvo}`;
}
