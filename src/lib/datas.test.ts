import { describe, expect, it } from "vitest";
import { formatarData, formatarDataHora, hojeISO, prazoPadrao, saudacao, subtrairDiasUteis } from "./datas";

describe("datas (America/Sao_Paulo)", () => {
  it("formata dd/mm/aaaa sem conversão de fuso", () => {
    expect(formatarData("2026-10-01")).toBe("01/10/2026");
  });

  it("hoje em São Paulo difere de UTC perto da meia-noite", () => {
    // 02:30 UTC de 02/10 = 23:30 de 01/10 em São Paulo
    expect(hojeISO(new Date("2026-10-02T02:30:00Z"))).toBe("2026-10-01");
  });

  it("formata timestamp no fuso de São Paulo", () => {
    expect(formatarDataHora("2026-10-02T02:30:00Z")).toBe("01/10/2026 23:30");
  });

  it("prazo padrão = 2 dias úteis antes da publicação", () => {
    expect(prazoPadrao("2026-10-07")).toBe("2026-10-05"); // qua → seg
    expect(prazoPadrao("2026-10-05")).toBe("2026-10-01"); // seg → qui anterior
    expect(subtrairDiasUteis("2026-10-06", 1)).toBe("2026-10-05");
  });

  it("saudação conforme a hora de São Paulo", () => {
    expect(saudacao(new Date("2026-10-01T11:00:00Z"))).toBe("Bom dia"); // 08h
    expect(saudacao(new Date("2026-10-01T17:00:00Z"))).toBe("Boa tarde"); // 14h
    expect(saudacao(new Date("2026-10-01T23:00:00Z"))).toBe("Boa noite"); // 20h
  });
});
