import { afterEach, describe, expect, it, vi } from "vitest";
import { criarAprovadora, redefinirSenhaProvisoria, statusMembro, type DepsAcesso } from "./acessos";
import { forcaSenha, gerarSenha, senhaValida } from "./senha";

const PERFIS = ["11111111-1111-4111-8111-111111111111", "33333333-3333-4333-8333-333333333333"];
const SENHA = "Provisoria2026xZ";

/** Dependências falsas que guardam tudo o que seria gravado no banco. */
function fakes() {
  const gravado: unknown[] = [];
  const auth: unknown[] = [];
  const membros = new Map<string, { deve_trocar_senha: boolean }>();
  const deps: DepsAcesso = {
    async convidar(email, opcoes) {
      auth.push({ convidar: email, opcoes });
      return { id: "u-convite", erro: null };
    },
    async criarUsuario(email, senha, dados) {
      auth.push({ criarUsuario: email, senha, dados });
      return { id: "u-senha", erro: null };
    },
    async definirSenha(id, senha) {
      auth.push({ definirSenha: id, senha });
      return { erro: null };
    },
    async inserirMembro(m) {
      gravado.push({ membros: m });
      membros.set(m.id, { deve_trocar_senha: m.deve_trocar_senha });
      return { erro: null };
    },
    async marcarTrocaSenha(id) {
      gravado.push({ marcarTrocaSenha: id });
      membros.set(id, { deve_trocar_senha: true });
      return { erro: null };
    },
    async vincularPerfis(id, perfis) {
      gravado.push({ perfil_aprovadoras: { id, perfis } });
    },
    async historico(evento) {
      gravado.push({ historico: evento });
    },
  };
  return { deps, gravado, auth, membros };
}

const contexto = { redirectTo: "https://crm.dev/auth/confirm?next=/primeiro-acesso", nomesPerfis: ["Edna Queiroz", "Grupo Adere"] };

describe("Prompt 9 · cadastro de aprovadoras", () => {
  afterEach(() => vi.restoreAllMocks());

  it("convite cria membro com status pendente (deve trocar a senha) e manda o nome dos perfis no e-mail", async () => {
    const f = fakes();
    const r = await criarAprovadora(f.deps, { nome: "Edna Queiroz", email: "EDNA@adere.com", perfis: PERFIS, forma: "convite" }, contexto);
    expect(r).toEqual({ ok: true, id: "u-convite" });
    expect(f.auth[0]).toMatchObject({
      convidar: "edna@adere.com",
      opcoes: { data: { nome: "Edna Queiroz", perfis: "Edna Queiroz e Grupo Adere" }, redirectTo: contexto.redirectTo },
    });
    expect(statusMembro({ ativo: true, ...f.membros.get("u-convite")! })).toBe("pendente");
  });

  it("senha provisória obriga a troca no primeiro acesso", async () => {
    const f = fakes();
    await criarAprovadora(f.deps, { nome: "Daniela", email: "dani@adere.com", perfis: PERFIS, forma: "senha", senha: SENHA }, contexto);
    expect(f.membros.get("u-senha")!.deve_trocar_senha).toBe(true);
  });

  it("a senha provisória só vai para o Auth: nunca para tabela, histórico ou log", async () => {
    const logs: unknown[] = [];
    for (const m of ["log", "info", "warn", "error", "debug"] as const) {
      vi.spyOn(console, m).mockImplementation((...a) => void logs.push(a));
    }
    const f = fakes();
    await criarAprovadora(f.deps, { nome: "Daniela", email: "dani@adere.com", perfis: PERFIS, forma: "senha", senha: SENHA }, contexto);
    await redefinirSenhaProvisoria(f.deps, "u-senha", "OutraSenha99");

    expect(JSON.stringify(f.gravado)).not.toContain(SENHA);
    expect(JSON.stringify(f.gravado)).not.toContain("OutraSenha99");
    expect(JSON.stringify(logs)).not.toContain(SENHA);
    expect(JSON.stringify(f.auth)).toContain(SENHA); // chegou ao Supabase Auth
    expect(f.gravado).toContainEqual({ historico: expect.objectContaining({ acao: "gerou_senha_provisoria" }) });
  });

  it("recusa senha provisória fraca e cadastro sem perfil", async () => {
    const f = fakes();
    const fraca = await criarAprovadora(f.deps, { nome: "Edna", email: "e@a.com", perfis: PERFIS, forma: "senha", senha: "abc123" }, contexto);
    expect(fraca.ok).toBe(false);
    const semPerfil = await criarAprovadora(f.deps, { nome: "Edna", email: "e@a.com", perfis: [], forma: "convite" }, contexto);
    expect(semPerfil.ok).toBe(false);
    expect(f.auth).toHaveLength(0);
  });

  it("status: Desativada > Convite pendente > Ativa", () => {
    expect(statusMembro({ ativo: false, deve_trocar_senha: true })).toBe("desativada");
    expect(statusMembro({ ativo: true, deve_trocar_senha: true })).toBe("pendente");
    expect(statusMembro({ ativo: true, deve_trocar_senha: false })).toBe("ativa");
  });
});

describe("senhas", () => {
  it("gerarSenha sempre atende às regras", () => {
    for (let i = 0; i < 200; i++) expect(senhaValida(gerarSenha())).toBe(true);
  });
  it("regras e força", () => {
    expect(senhaValida("abcdefghij")).toBe(false);
    expect(senhaValida("abcdefghi1")).toBe(true);
    expect(forcaSenha("abc").rotulo).toBe("Fraca");
    expect(forcaSenha("Adere#Criativos2026").rotulo).toBe("Forte");
  });
});
