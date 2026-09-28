import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
  analisarLinhas,
  converterData,
  converterFormato,
  converterHora,
  detectarMapeamento,
  faltandoObrigatorios,
  lerPlanilha,
} from "./cronograma";

const PERFIS = [
  { id: "p-edna", nome: "Edna Queiroz" },
  { id: "p-adere", nome: "Grupo Adere" },
];

function planilhaExemplo() {
  const buf = readFileSync("fixtures/cronograma-exemplo.xlsx");
  return lerPlanilha(buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength) as ArrayBuffer);
}

describe("cronograma (Excel)", () => {
  it("reconhece variações de cabeçalho", () => {
    const m = detectarMapeamento(["Data de publicação", "Perfil", "Tema", "Script", "ID"]);
    expect(m).toMatchObject({ data: 0, perfil: 1, tema: 2, legenda: 3, id: 4, hora: null });
    expect(faltandoObrigatorios(m)).toEqual([]);
    expect(faltandoObrigatorios(detectarMapeamento(["Dia", "Assunto"]))).toEqual(["perfil", "legenda"]);
  });

  it("converte datas, horas e formatos", () => {
    expect(converterData(47133)).toBe("2029-01-15");
    expect(converterData("05/10/2026")).toBe("2026-10-05");
    expect(converterData("5/10/26")).toBe("2026-10-05");
    expect(converterData("2026-10-05")).toBe("2026-10-05");
    expect(converterData("31/02/2026")).toBeNull();
    expect(converterHora(0.75)).toBe("18:00");
    expect(converterHora("9h")).toBe("09:00");
    expect(converterHora("18h30")).toBe("18:30");
    expect(converterHora("25:00")).toBe("invalida");
    expect(converterFormato("Vídeo")).toBe("video");
    expect(converterFormato("")).toBe("imagem");
    expect(converterFormato("Story")).toBeNull();
  });

  it("lê a planilha de exemplo em /fixtures e classifica as linhas", () => {
    const { cabecalho, linhas } = planilhaExemplo();
    const mapa = detectarMapeamento(cabecalho);
    expect(faltandoObrigatorios(mapa)).toEqual([]);
    const existentes = [
      { id: "post-b", perfil_id: "p-adere", data_publicacao: "2030-01-16", tema: "Outro", chave_externa: "CRONO-B", status: "aprovado" as const },
    ];
    const r = analisarLinhas(linhas, mapa, PERFIS, existentes, "2026-09-28");
    expect(r.map((l) => [l.linha, l.situacao])).toEqual([
      [2, "novo"],
      [3, "ignorada"],
      [4, "erro"],
    ]);
    expect(r[0]!.dados).toMatchObject({ perfil_id: "p-edna", data: "2030-01-15", hora: "09:00", formato: "imagem", arquivo: "exemplo-a.png" });
    expect(r[1]!.motivo).toBe("Ignorada — já aprovado");
    expect(r[2]!.motivo).toContain("Data inválida");
    expect(r[2]!.motivo).toContain("Perfil “Perfil Inexistente” não cadastrado");
    expect(r[2]!.perfilDesconhecido).toBe("Perfil Inexistente");
  });

  it("atualiza pela chave Perfil + Data + Tema; avisa data passada e legenda longa; detecta duplicadas", () => {
    const mapa = detectarMapeamento(["Data", "Perfil", "Tema", "Legenda"]);
    const existentes = [
      { id: "x", perfil_id: "p-edna", data_publicacao: "2026-10-01", tema: "Tema Um", chave_externa: null, status: "rascunho" as const },
    ];
    const r = analisarLinhas(
      [
        ["01/10/2026", "Edna Queiroz", "tema um", "nova legenda"],
        ["01/09/2026", "Edna Queiroz", "Antigo", "x".repeat(3100)],
        ["01/09/2026", "Edna Queiroz", "Antigo", "de novo"],
        [null, null, null, null],
      ],
      mapa,
      PERFIS,
      existentes,
      "2026-09-28",
    );
    expect(r).toHaveLength(3);
    expect(r[0]).toMatchObject({ situacao: "atualiza", postId: "x" });
    expect(r[1]!.situacao).toBe("novo");
    expect(r[1]!.dataPassada).toBe(true);
    expect(r[1]!.avisos.join()).toContain("3100 caracteres");
    expect(r[2]).toMatchObject({ situacao: "erro" });
    expect(r[2]!.motivo).toContain("Duplicada");
  });

  it("lê CSV separado por ponto e vírgula", () => {
    const csv = "Data;Perfil;Tema;Legenda\n05/10/2026;Edna Queiroz;Tema;Texto\n";
    const { cabecalho, linhas } = lerPlanilha(new TextEncoder().encode(csv).buffer as ArrayBuffer);
    expect(cabecalho).toEqual(["Data", "Perfil", "Tema", "Legenda"]);
    expect(linhas[0]).toEqual(["05/10/2026", "Edna Queiroz", "Tema", "Texto"]);
  });
});
