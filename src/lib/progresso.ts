import type { TipoDecisao as DecisaoTipo } from "./types";

export interface Aprovadora {
  id: string;
  nome: string;
}

export interface DecisaoResumo {
  autor_id: string;
  decisao: DecisaoTipo;
  versao: number;
}

const ROTULO: Record<DecisaoTipo | "pendente", string> = {
  aprovado: "aprovou",
  revisar: "pediu revisão",
  reprovado: "reprovou",
  pendente: "pendente",
};

export interface ProgressoPessoa {
  id: string;
  nome: string;
  situacao: DecisaoTipo | "pendente";
  rotulo: string;
}

/** Situação de cada aprovadora na versão atual (ordem: como cadastradas). */
export function progressoPorPessoa(aprovadoras: Aprovadora[], decisoes: DecisaoResumo[], versao: number): ProgressoPessoa[] {
  return aprovadoras.map((a) => {
    const d = decisoes.find((x) => x.autor_id === a.id && x.versao === versao);
    const situacao = d?.decisao ?? "pendente";
    return { id: a.id, nome: a.nome, situacao, rotulo: ROTULO[situacao] };
  });
}

/** "Edna: aprovou · Daniela: pendente" (primeiro nome). */
export function textoProgresso(pessoas: ProgressoPessoa[]) {
  return pessoas.map((p) => `${p.nome.split(" ")[0]}: ${p.rotulo}`).join(" · ");
}
