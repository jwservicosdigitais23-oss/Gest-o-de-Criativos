import { afterAll, beforeAll, beforeEach, afterEach, describe, expect, it } from "vitest";
import type { Client } from "pg";
import { como, conectar, criarAprovadora, criarUsuario, erroDe, perfilPorNome, sql, temBanco } from "./helpers";

describe.skipIf(!temBanco)("Prompt 1 · fundação do banco", () => {
  let c: Client;
  beforeAll(async () => {
    c = await conectar();
  });
  afterAll(async () => {
    await c.end();
  });
  beforeEach(async () => {
    await c.query("begin");
  });
  afterEach(async () => {
    await c.query("rollback");
  });

  it("cria somente os três perfis reais no seed, sem posts", async () => {
    const perfis = await sql<{ nome: string; modo_aprovacao: string; tipo: string }>(
      c,
      "select nome, modo_aprovacao, tipo from public.perfis order by ordem",
    );
    expect(perfis).toEqual([
      { nome: "Edna Queiroz", modo_aprovacao: "qualquer_uma", tipo: "pessoal" },
      { nome: "Daniela Quintana", modo_aprovacao: "qualquer_uma", tipo: "pessoal" },
      { nome: "Grupo Adere", modo_aprovacao: "qualquer_uma", tipo: "empresa" },
    ]);
    const [{ n }] = (await sql<{ n: string }>(c, "select count(*) n from public.posts")) as [{ n: string }];
    expect(Number(n)).toBe(0);
  });

  it("o primeiro usuário cadastrado vira admin; os seguintes não ganham acesso sozinhos", async () => {
    const jonathan = await criarUsuario(c, "jonathan@teste.dev", "Jonathan");
    const intruso = await criarUsuario(c, "intruso@teste.dev");
    const membros = await sql<{ id: string; papel: string; nome: string }>(c, "select id, papel, nome from public.membros");
    expect(membros).toEqual([{ id: jonathan, papel: "admin", nome: "Jonathan" }]);
    expect(membros.find((m) => m.id === intruso)).toBeUndefined();
  });

  it("anon não lê nada; usuário sem registro em membros não vê perfis", async () => {
    await criarUsuario(c, "admin@teste.dev");
    const semRegistro = await criarUsuario(c, "sem@teste.dev");
    expect(await erroDe(como(c, null, () => c.query("select * from public.perfis")))).toBe("42501");
    const vistos = await como(c, semRegistro, () => sql(c, "select * from public.perfis"));
    expect(vistos).toHaveLength(0);
  });

  it("admin vê todos os perfis; aprovadora só os que aprova", async () => {
    const admin = await criarUsuario(c, "admin@teste.dev");
    const edna = await perfilPorNome(c, "Edna Queiroz");
    const aprovadora = await criarAprovadora(c, "edna@teste.dev", [edna]);
    const doAdmin = await como(c, admin, () => sql(c, "select nome from public.perfis"));
    expect(doAdmin).toHaveLength(3);
    const daAprovadora = await como(c, aprovadora, () => sql<{ nome: string }>(c, "select nome from public.perfis"));
    expect(daAprovadora.map((p) => p.nome)).toEqual(["Edna Queiroz"]);
  });

  it("aprovadora não cria nem altera perfis", async () => {
    await criarUsuario(c, "admin@teste.dev");
    const edna = await perfilPorNome(c, "Edna Queiroz");
    const aprovadora = await criarAprovadora(c, "edna@teste.dev", [edna]);
    expect(
      await erroDe(como(c, aprovadora, () => c.query("insert into public.perfis (nome) values ('Novo')"))),
    ).toBe("42501");
    const r = await como(c, aprovadora, () =>
      c.query("update public.perfis set nome = 'Hackeado' where id = $1", [edna]),
    );
    expect(r.rowCount).toBe(0);
  });

  it("membro inativo perde o acesso", async () => {
    await criarUsuario(c, "admin@teste.dev");
    const edna = await perfilPorNome(c, "Edna Queiroz");
    const aprovadora = await criarAprovadora(c, "edna@teste.dev", [edna]);
    await sql(c, "update public.membros set ativo = false where id = $1", [aprovadora]);
    const vistos = await como(c, aprovadora, () => sql(c, "select * from public.perfis"));
    expect(vistos).toHaveLength(0);
  });

  it("sistema_tem_admin() é público e responde antes/depois do primeiro cadastro", async () => {
    const antes = await como(c, null, () => sql<{ r: boolean }>(c, "select public.sistema_tem_admin() r"));
    expect(antes[0]!.r).toBe(false);
    await criarUsuario(c, "admin@teste.dev");
    const depois = await como(c, null, () => sql<{ r: boolean }>(c, "select public.sistema_tem_admin() r"));
    expect(depois[0]!.r).toBe(true);
  });
});
