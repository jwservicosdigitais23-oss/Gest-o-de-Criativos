import { describe, expect, it } from "vitest";
import { assinarVerComo, verificarVerComo } from "./ver-como-token";
import { podeVerComo, textoHistoricoVerComo } from "./ver-como-regras";

const CHAVE = "chave-de-teste";
const admin = { id: "a", papel: "admin" as const, ativo: true };
const edna = { id: "e", papel: "aprovadora" as const, ativo: true };

describe("Prompt 9 · Ver como", () => {
  it("cookie assinado: aceita o original, recusa adulterado, chave errada e expirado", () => {
    const agora = 1_000_000;
    const token = assinarVerComo({ adminId: "a", alvoId: "e", exp: agora + 1800 }, CHAVE);
    expect(verificarVerComo(token, CHAVE, agora)).toEqual({ adminId: "a", alvoId: "e", exp: agora + 1800 });
    expect(verificarVerComo(token, "outra-chave", agora)).toBeNull();
    expect(verificarVerComo(token, CHAVE, agora + 1801)).toBeNull();
    const [corpo, assinatura] = token.split(".");
    const falso = Buffer.from(JSON.stringify({ adminId: "a", alvoId: "d", exp: agora + 1800 })).toString("base64url");
    expect(verificarVerComo(`${falso}.${assinatura}`, CHAVE, agora)).toBeNull();
    expect(verificarVerComo(`${corpo}`, CHAVE, agora)).toBeNull();
    expect(verificarVerComo(undefined, CHAVE, agora)).toBeNull();
  });

  it("só o admin ativo vê como uma aprovadora ativa — nunca a aprovadora", () => {
    expect(podeVerComo(admin, edna)).toBe(true);
    expect(podeVerComo(edna, admin)).toBe(false);
    expect(podeVerComo(edna, { ...edna, id: "d" })).toBe(false);
    expect(podeVerComo(admin, { ...edna, ativo: false })).toBe(false);
    expect(podeVerComo(admin, { ...admin, id: "b" })).toBe(false);
    expect(podeVerComo({ ...admin, ativo: false }, edna)).toBe(false);
  });

  it("texto do histórico", () => {
    expect(textoHistoricoVerComo("Jonathan Oliveira", "Edna Queiroz", true)).toBe("Jonathan visualizou como Edna Queiroz");
  });
});
