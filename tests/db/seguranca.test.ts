import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from "vitest";
import type { Client } from "pg";
import { como, conectar, criarAprovadora, criarPost, criarUsuario, erroDe, perfilPorNome, sql, temBanco } from "./helpers";

/**
 * Prompt 8 · provas de acesso:
 * - aprovadora não lê posts de perfis que não são dela;
 * - não grava decisão em nome de outra pessoa;
 * - não altera posts;
 * - ninguém altera ou apaga decisoes e historico.
 */
describe.skipIf(!temBanco)("Prompt 8 · segurança (RLS)", () => {
  let c: Client;
  let admin: string;
  let edna: string;
  let daniela: string;
  let aprovEdna: string;
  let aprovDaniela: string;
  let postEdna: string;
  let postDaniela: string;

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
    daniela = await perfilPorNome(c, "Daniela Quintana");
    aprovEdna = await criarAprovadora(c, "edna@teste.dev", [edna]);
    aprovDaniela = await criarAprovadora(c, "daniela@teste.dev", [daniela]);
    postEdna = await criarPost(c, edna, admin, { formato: "texto", tema: "Post da Edna" });
    postDaniela = await criarPost(c, daniela, admin, { formato: "texto", tema: "Post da Daniela" });
    for (const id of [postEdna, postDaniela]) await como(c, admin, () => c.query("select public.enviar_para_aprovacao($1)", [id]));
    await como(c, aprovEdna, () =>
      c.query("insert into public.decisoes (post_id, versao, decisao, observacao) values ($1, 1, 'revisar', 'Trocar a imagem principal')", [postEdna]),
    );
  });
  afterEach(async () => {
    await c.query("rollback");
  });

  it("aprovadora não lê posts, versões, decisões, comentários, mídias nem histórico de perfis que não são dela", async () => {
    for (const [tabela, coluna] of [
      ["posts", "id"],
      ["post_versoes", "post_id"],
      ["decisoes", "post_id"],
      ["comentarios", "post_id"],
      ["midias", "post_id"],
      ["historico", "post_id"],
    ] as const) {
      const linhas = await como(c, aprovDaniela, () => sql(c, `select * from public.${tabela} where ${coluna} = $1`, [postEdna]));
      expect(linhas, tabela).toHaveLength(0);
    }
    const perfis = await como(c, aprovDaniela, () => sql<{ nome: string }>(c, "select nome from public.perfis"));
    expect(perfis.map((p) => p.nome)).toEqual(["Daniela Quintana"]);
    const kpis = await como(c, aprovDaniela, () => sql<{ tema: string }>(c, "select tema from public.fila_aprovadora()"));
    expect(kpis.map((k) => k.tema)).toEqual(["Post da Daniela"]);
  });

  it("aprovadora não grava decisão em nome de outra pessoa", async () => {
    expect(
      await erroDe(
        como(c, aprovDaniela, () =>
          c.query("insert into public.decisoes (post_id, versao, autor_id, decisao) values ($1, 1, $2, 'aprovado')", [postDaniela, admin]),
        ),
      ),
    ).toBe("42501");
  });

  it("aprovadora não altera nem apaga posts, mídias, perfis ou membros", async () => {
    const upd = await como(c, aprovDaniela, () => c.query("update public.posts set legenda = 'x' where id = $1", [postDaniela]));
    expect(upd.rowCount).toBe(0);
    const del = await como(c, aprovDaniela, () => c.query("delete from public.posts where id = $1", [postDaniela]));
    expect(del.rowCount).toBe(0);
    expect(await erroDe(como(c, aprovDaniela, () => c.query("select public.enviar_para_aprovacao($1)", [postDaniela])))).toBe("42501");
    expect(await erroDe(como(c, aprovDaniela, () => c.query("select public.excluir_post($1)", [postDaniela])))).toBe("42501");
    expect(
      await erroDe(como(c, aprovDaniela, () => c.query("select public.marcar_publicado($1, 'https://x.com')", [postDaniela]))),
    ).toBe("42501");
    const m = await como(c, aprovDaniela, () => c.query("update public.membros set papel = 'admin'"));
    expect(m.rowCount).toBe(0);
  });

  it("ninguém altera ou apaga decisões e histórico — nem o administrador", async () => {
    for (const quem of [admin, aprovEdna]) {
      for (const q of [
        "update public.decisoes set observacao = 'editada'",
        "delete from public.decisoes",
        "update public.historico set acao = 'x'",
        "delete from public.historico",
        "update public.post_versoes set legenda = 'x'",
        "delete from public.post_versoes",
      ]) {
        expect(await erroDe(como(c, quem, () => c.query(q))), `${q}`).toBe("42501");
      }
    }
    const [{ n }] = (await sql<{ n: string }>(c, "select count(*) n from public.decisoes")) as [{ n: string }];
    expect(Number(n)).toBe(1);
  });

  it("anon não acessa nada nem executa as funções de escrita", async () => {
    for (const tabela of ["posts", "decisoes", "historico", "membros", "notificacoes"]) {
      expect(await erroDe(como(c, null, () => c.query(`select * from public.${tabela}`))), tabela).toBe("42501");
    }
    expect(await erroDe(como(c, null, () => c.query("select public.enviar_para_aprovacao($1)", [postEdna])))).toBe("42501");
    expect(await erroDe(como(c, null, () => c.query("select public.uso_storage()")))).toBe("42501");
  });

  it("uso do Storage e órfãos só para o admin", async () => {
    await c.query(
      "insert into storage.objects (bucket_id, name, metadata, created_at) values ('midias', 'x/orfao.png', '{\"size\": 2048, \"mimetype\": \"image/png\"}', now() - interval '2 days')",
    );
    const [{ u }] = (await como(c, admin, () => sql<{ u: Record<string, number> }>(c, "select public.uso_storage() u"))) as [
      { u: Record<string, number> },
    ];
    expect(u).toMatchObject({ arquivos: 1, bytes: 2048, orfaos: 1, bytes_orfaos: 2048 });
    expect(await erroDe(como(c, aprovEdna, () => c.query("select public.uso_storage()")))).toBe("42501");
  });
});
