import { describe, expect, it } from "vitest";
import { avisoProporcao, midiasDaVersao, nomeSeguro, tipoDoArquivo, versaoDeEdicao } from "./posts";

describe("posts", () => {
  it("versão de edição: rascunho edita a própria versão; demais criam a próxima", () => {
    expect(versaoDeEdicao({ status: "rascunho", versao: 1 })).toBe(1);
    expect(versaoDeEdicao({ status: "em_revisao", versao: 1 })).toBe(2);
    expect(versaoDeEdicao({ status: "aprovado", versao: 3 })).toBe(4);
  });

  it("mídias válidas por versão", () => {
    const m = [
      { id: "a", versao: 1, versao_removida: 2, ordem: 0 },
      { id: "b", versao: 1, versao_removida: null, ordem: 1 },
      { id: "c", versao: 2, versao_removida: null, ordem: 0 },
    ];
    expect(midiasDaVersao(m, 1).map((x) => x.id)).toEqual(["a", "b"]);
    expect(midiasDaVersao(m, 2).map((x) => x.id)).toEqual(["c", "b"]);
  });

  it("aviso de proporção", () => {
    expect(avisoProporcao("imagem", 1080, 1080)).toBeNull();
    expect(avisoProporcao("imagem", 1080, 1350)).toBeNull();
    expect(avisoProporcao("imagem", 1200, 627)).toBeNull();
    expect(avisoProporcao("imagem", 1000, 500)).toMatch(/fora do recomendado/);
    expect(avisoProporcao("video", 1080, 1920)).toBeNull();
    expect(avisoProporcao("video", 1000, 800)).toMatch(/9:16/);
  });

  it("tipos de arquivo e nomes seguros", () => {
    expect(tipoDoArquivo({ type: "video/quicktime", name: "a.mov" })).toBe("video");
    expect(tipoDoArquivo({ type: "", name: "carrossel.PDF" })).toBe("pdf");
    expect(tipoDoArquivo({ type: "image/gif", name: "x.gif" })).toBeNull();
    expect(nomeSeguro("Criação Final (v2).PNG")).toBe("criacao-final-v2.png");
  });
});
