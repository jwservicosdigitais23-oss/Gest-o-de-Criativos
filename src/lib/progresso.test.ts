import { describe, expect, it } from "vitest";
import { progressoPorPessoa, textoProgresso } from "./progresso";

const aprovadoras = [
  { id: "e", nome: "Edna Queiroz" },
  { id: "d", nome: "Daniela Quintana" },
];

describe("progresso por pessoa", () => {
  it("Edna: aprovou · Daniela: pendente", () => {
    const p = progressoPorPessoa(aprovadoras, [{ autor_id: "e", decisao: "aprovado", versao: 2 }], 2);
    expect(textoProgresso(p)).toBe("Edna: aprovou · Daniela: pendente");
  });
  it("decisões de versões anteriores não contam", () => {
    const p = progressoPorPessoa(aprovadoras, [{ autor_id: "e", decisao: "aprovado", versao: 1 }], 2);
    expect(textoProgresso(p)).toBe("Edna: pendente · Daniela: pendente");
  });
});
