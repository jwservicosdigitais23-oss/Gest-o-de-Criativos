import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
vi.mock("next/navigation", () => ({
  redirect: (url: string) => {
    throw new Error(`redirect:${url}`);
  },
}));

const estado = vi.hoisted(() => ({
  membros: {} as Record<string, Record<string, unknown>>,
  userId: "admin",
  cookie: null as null | { adminId: string; alvoId: string; exp: number },
}));

vi.mock("@/lib/supabase/server", () => ({
  createClient: async () => ({
    auth: { getClaims: async () => ({ data: { claims: { sub: estado.userId, email: "x@y.z" } } }) },
    from: (tabela: string) => {
      const filtros: Record<string, string> = {};
      const q = {
        select: () => q,
        eq: (c: string, v: string) => ((filtros[c] = v), q),
        maybeSingle: async () => ({ data: tabela === "membros" ? (estado.membros[filtros.id!] ?? null) : null }),
        then: (r: (v: unknown) => unknown) => r({ data: tabela === "perfil_aprovadoras" ? [{ perfil_id: "p-edna" }, { perfil_id: "p-grupo" }] : [] }),
      };
      return q;
    },
  }),
}));
vi.mock("@/lib/ver-como", () => ({ lerVerComo: async () => estado.cookie }));

const { exigirMembro, exigirAdmin, MENSAGEM_SOMENTE_LEITURA } = await import("./auth");

const membro = (id: string, papel: "admin" | "aprovadora", nome: string) => ({
  id,
  nome,
  papel,
  ativo: true,
  deve_trocar_senha: false,
  email: `${id}@adere.dev`,
});

describe("Prompt 9 · Ver como no servidor", () => {
  beforeEach(() => {
    estado.membros = { admin: membro("admin", "admin", "Jonathan"), edna: membro("edna", "aprovadora", "Edna Queiroz") };
    estado.userId = "admin";
    estado.cookie = { adminId: "admin", alvoId: "edna", exp: 9e9 };
  });

  it("monta a visão com o papel e os perfis da aprovadora, sem trocar quem está logado", async () => {
    const s = await exigirMembro();
    expect(s.userId).toBe("admin");
    expect(s.real.papel).toBe("admin");
    expect(s.membro.nome).toBe("Edna Queiroz");
    expect(s.perfisIds).toEqual(["p-edna", "p-grupo"]);
  });

  it("qualquer gravação durante o Ver como é recusada", async () => {
    await expect(exigirMembro({ gravacao: true })).rejects.toThrow(MENSAGEM_SOMENTE_LEITURA);
    await expect(exigirAdmin({ gravacao: true })).rejects.toThrow(MENSAGEM_SOMENTE_LEITURA);
  });

  it("páginas de admin ficam fora do alcance no Ver como", async () => {
    await expect(exigirAdmin()).rejects.toThrow("redirect:/");
  });

  it("aprovadora com cookie forjado para ela mesma não entra no Ver como", async () => {
    estado.userId = "edna";
    estado.cookie = { adminId: "edna", alvoId: "edna", exp: 9e9 };
    const s = await exigirMembro({ gravacao: true });
    expect(s.verComo).toBeNull();
    expect(s.membro.id).toBe("edna");
  });
});

/** Toda server action que grava passa por exigirMembro/exigirAdmin({ gravacao: true }). */
describe("Prompt 9 · server actions protegidas", () => {
  function arquivos(dir: string): string[] {
    return readdirSync(dir).flatMap((n) => {
      const p = join(dir, n);
      return statSync(p).isDirectory() ? arquivos(p) : p.endsWith(".ts") ? [p] : [];
    });
  }
  // Exceções conscientes: entrar/sair do Ver como, instalar o primeiro admin e
  // o primeiro acesso (que confere o Ver como por conta própria).
  const EXCECOES = ["ver-como/actions.ts", "instalar/actions.ts", "primeiro-acesso/actions.ts"];

  it("nenhuma action grava sem a trava do Ver como", () => {
    const acoes = arquivos("src/app").filter((p) => readFileSync(p, "utf8").startsWith('"use server"'));
    expect(acoes.length).toBeGreaterThan(4);
    for (const p of acoes.filter((a) => !EXCECOES.some((e) => a.endsWith(e)))) {
      const src = readFileSync(p, "utf8");
      const funcoes = src.split(/\nexport async function /).slice(1);
      for (const f of funcoes) {
        const nome = f.slice(0, f.indexOf("("));
        expect(f.includes("gravacao: true"), `${p} › ${nome}`).toBe(true);
      }
    }
  });
});
