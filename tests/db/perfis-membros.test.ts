import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from "vitest";
import type { Client } from "pg";
import { como, conectar, criarAprovadora, criarUsuario, erroDe, perfilPorNome, sql, temBanco } from "./helpers";

describe.skipIf(!temBanco)("Prompt 2 · perfis e membros", () => {
  let c: Client;
  let admin: string;
  let edna: string;
  let aprovadora: string;

  beforeAll(async () => {
    c = await conectar();
  });
  afterAll(async () => {
    await c.end();
  });
  beforeEach(async () => {
    await c.query("begin");
    admin = await criarUsuario(c, "admin@teste.dev", "Jonathan");
    edna = await perfilPorNome(c, "Edna Queiroz");
    aprovadora = await criarAprovadora(c, "edna@teste.dev", [edna]);
  });
  afterEach(async () => {
    await c.query("rollback");
  });

  async function criarPostComDecisao(perfilId: string) {
    const [post] = await sql<{ id: string }>(
      c,
      `insert into public.posts (perfil_id, data_publicacao, tema, legenda, status, criado_por)
       values ($1, current_date + 10, 'Tema', 'Legenda', 'aguardando', $2) returning id`,
      [perfilId, admin],
    );
    await sql(c, "insert into public.decisoes (post_id, versao, autor_id, decisao) values ($1, 1, $2, 'aprovado')", [
      post!.id,
      aprovadora,
    ]);
    await sql(c, "insert into public.historico (entidade, post_id, perfil_id, acao, autor_id) values ('post', $1, $2, 'criou', $3)", [
      post!.id,
      perfilId,
      admin,
    ]);
    return post!.id;
  }

  it("admin reordena perfis; aprovadora não", async () => {
    const ids = (await sql<{ id: string }>(c, "select id from public.perfis order by ordem desc")).map((p) => p.id);
    await como(c, admin, () => c.query("select public.reordenar_perfis($1::uuid[])", [ids]));
    const ordem = await sql<{ nome: string }>(c, "select nome from public.perfis order by ordem");
    expect(ordem.map((p) => p.nome)).toEqual(["Grupo Adere", "Daniela Quintana", "Edna Queiroz"]);
    expect(await erroDe(como(c, aprovadora, () => c.query("select public.reordenar_perfis($1::uuid[])", [ids])))).toBe("42501");
  });

  it("nome de perfil é único (sem diferenciar maiúsculas)", async () => {
    expect(
      await erroDe(como(c, admin, () => c.query("insert into public.perfis (nome) values (' edna queiroz ')"))),
    ).toBe("23505");
  });

  it("perfil com posts não pode ser excluído direto (FK)", async () => {
    await criarPostComDecisao(edna);
    expect(await erroDe(como(c, admin, () => c.query("delete from public.perfis where id = $1", [edna])))).toBe("23503");
  });

  it("exclusão definitiva exige admin e o nome exato; apaga posts e decisões, mantém histórico", async () => {
    const post = await criarPostComDecisao(edna);
    expect(
      await erroDe(como(c, aprovadora, () => c.query("select public.excluir_perfil_definitivo($1, 'Edna Queiroz')", [edna]))),
    ).toBe("42501");
    expect(
      await erroDe(como(c, admin, () => c.query("select public.excluir_perfil_definitivo($1, 'Edna')", [edna]))),
    ).toBe("22023");

    await como(c, admin, () => c.query("select public.excluir_perfil_definitivo($1, 'Edna Queiroz')", [edna]));
    expect(await sql(c, "select 1 from public.perfis where id = $1", [edna])).toHaveLength(0);
    expect(await sql(c, "select 1 from public.decisoes where post_id = $1", [post])).toHaveLength(0);
    const hist = await sql<{ acao: string }>(c, "select acao from public.historico where perfil_id = $1 order by id", [edna]);
    expect(hist.map((h) => h.acao)).toEqual(["criou", "excluiu_definitivo"]);
  });

  it("decisões continuam imutáveis fora da exclusão definitiva", async () => {
    const post = await criarPostComDecisao(edna);
    // Nem o admin, nem o próprio banco (superusuário) conseguem alterar/apagar.
    expect(await erroDe(como(c, admin, () => c.query("delete from public.decisoes where post_id = $1", [post])))).toBe("42501");
    expect(await erroDe(como(c, admin, () => c.query("update public.decisoes set observacao = 'x' where post_id = $1", [post])))).toBe("42501");
    await c.query("savepoint s");
    expect(await erroDe(c.query("delete from public.decisoes where post_id = $1", [post]))).toBe("42501");
    await c.query("rollback to savepoint s");
  });

  it("perfis_resumo respeita o RLS", async () => {
    await criarPostComDecisao(edna);
    const daAprovadora = await como(c, aprovadora, () =>
      sql<{ perfil_id: string; total_posts: number }>(c, "select perfil_id, total_posts from public.perfis_resumo"),
    );
    expect(daAprovadora).toEqual([{ perfil_id: edna, total_posts: 1 }]);
  });

  it("aprovadora não se vincula sozinha a outro perfil", async () => {
    const daniela = await perfilPorNome(c, "Daniela Quintana");
    expect(
      await erroDe(
        como(c, aprovadora, () =>
          c.query("insert into public.perfil_aprovadoras (perfil_id, membro_id) values ($1, $2)", [daniela, aprovadora]),
        ),
      ),
    ).toBe("42501");
  });

  it("aprovadora não promove a si mesma a admin", async () => {
    const r = await como(c, aprovadora, () =>
      c.query("update public.membros set papel = 'admin' where id = $1", [aprovadora]),
    );
    expect(r.rowCount).toBe(0);
  });
});
