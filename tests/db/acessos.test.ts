import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from "vitest";
import type { Client } from "pg";
import { como, conectar, criarAprovadora, criarPost, criarUsuario, erroDe, perfilPorNome, sql, temBanco } from "./helpers";

/**
 * Prompt 9 · regra de visibilidade no banco:
 * Edna → Edna Queiroz + Grupo Adere; Daniela → Daniela Quintana + Grupo Adere.
 */
describe.skipIf(!temBanco)("Prompt 9 · visibilidade das aprovadoras (RLS)", () => {
  let c: Client;
  let admin: string;
  let perfilEdna: string;
  let perfilDaniela: string;
  let perfilGrupo: string;
  let edna: string;
  let daniela: string;
  let postEdna: string;
  let postDaniela: string;
  let postGrupo: string;

  beforeAll(async () => {
    c = await conectar();
  });
  afterAll(async () => {
    await c.end();
  });
  beforeEach(async () => {
    await c.query("begin");
    admin = await criarUsuario(c, "admin@teste.dev", "Jonathan");
    perfilEdna = await perfilPorNome(c, "Edna Queiroz");
    perfilDaniela = await perfilPorNome(c, "Daniela Quintana");
    perfilGrupo = await perfilPorNome(c, "Grupo Adere");
    edna = await criarAprovadora(c, "edna@teste.dev", [perfilEdna, perfilGrupo]);
    daniela = await criarAprovadora(c, "daniela@teste.dev", [perfilDaniela, perfilGrupo]);
    postEdna = await criarPost(c, perfilEdna, admin, { tema: "Post da Edna" });
    postDaniela = await criarPost(c, perfilDaniela, admin, { tema: "Post da Daniela" });
    postGrupo = await criarPost(c, perfilGrupo, admin, { tema: "Post do Grupo" });
    for (const [perfil, post] of [
      [perfilEdna, postEdna],
      [perfilDaniela, postDaniela],
      [perfilGrupo, postGrupo],
    ]) {
      await sql(c, "insert into public.midias (post_id, versao, ordem, tipo, storage_path, nome_arquivo) values ($1, 1, 0, 'imagem', $2, 'foto.jpg')", [
        post,
        `${perfil}/${post}/v1/foto.jpg`,
      ]);
      await sql(c, "insert into storage.objects (bucket_id, name) values ('midias', $1)", [`${perfil}/${post}/v1/foto.jpg`]);
      await como(c, admin, () => c.query("select public.enviar_para_aprovacao($1)", [post]));
    }
  });
  afterEach(async () => {
    await c.query("rollback");
  });

  const temas = (id: string) =>
    como(c, id, () => sql<{ tema: string }>(c, "select tema from public.posts order by tema collate \"C\"")).then((r) => r.map((x) => x.tema));
  const perfis = (id: string) =>
    como(c, id, () => sql<{ nome: string }>(c, "select nome from public.perfis order by nome collate \"C\"")).then((r) => r.map((x) => x.nome));

  it("Edna só vê Edna Queiroz + Grupo Adere", async () => {
    expect(await perfis(edna)).toEqual(["Edna Queiroz", "Grupo Adere"]);
    expect(await temas(edna)).toEqual(["Post da Edna", "Post do Grupo"]);
  });

  it("Daniela só vê Daniela Quintana + Grupo Adere", async () => {
    expect(await perfis(daniela)).toEqual(["Daniela Quintana", "Grupo Adere"]);
    expect(await temas(daniela)).toEqual(["Post da Daniela", "Post do Grupo"]);
  });

  it("Edna não lê nada do post da Daniela (e vice-versa), nem no Storage nem nas notificações", async () => {
    for (const [quem, post] of [
      [edna, postDaniela],
      [daniela, postEdna],
    ]) {
      for (const [tabela, coluna] of [
        ["posts", "id"],
        ["post_versoes", "post_id"],
        ["midias", "post_id"],
        ["decisoes", "post_id"],
        ["comentarios", "post_id"],
        ["historico", "post_id"],
        ["notificacoes", "post_id"],
      ] as const) {
        const linhas = await como(c, quem, () => sql(c, `select 1 from public.${tabela} where ${coluna} = $1`, [post]));
        expect(linhas, tabela).toHaveLength(0);
      }
      const arquivos = await como(c, quem, () => sql(c, "select name from storage.objects where name like $1", [`%${post}%`]));
      expect(arquivos, "storage").toHaveLength(0);
    }
  });

  it("Edna não decide nem comenta no perfil da Daniela", async () => {
    expect(
      await erroDe(
        como(c, edna, () => c.query("insert into public.decisoes (post_id, versao, decisao) values ($1, 1, 'aprovado')", [postDaniela])),
      ),
    ).toBe("42501");
    expect(
      await erroDe(como(c, edna, () => c.query("insert into public.comentarios (post_id, texto) values ($1, 'oi')", [postDaniela]))),
    ).toBe("42501");
  });

  it("ambas leem, veem as mídias e decidem no Grupo Adere (modo todas)", async () => {
    for (const quem of [edna, daniela]) {
      const arquivos = await como(c, quem, () => sql(c, "select name from storage.objects where name like $1", [`%${postGrupo}%`]));
      expect(arquivos).toHaveLength(1);
    }
    await como(c, edna, () => c.query("insert into public.decisoes (post_id, versao, decisao) values ($1, 1, 'aprovado')", [postGrupo]));
    let [p] = await sql<{ status: string }>(c, "select status from public.posts where id = $1", [postGrupo]);
    expect(p!.status).toBe("aguardando");
    await como(c, daniela, () => c.query("insert into public.decisoes (post_id, versao, decisao) values ($1, 1, 'aprovado')", [postGrupo]));
    [p] = await sql<{ status: string }>(c, "select status from public.posts where id = $1", [postGrupo]);
    expect(p!.status).toBe("aprovado");
  });

  it("aprovadora vê só os membros com quem divide perfil (e os administradores)", async () => {
    const outraEdna = await criarAprovadora(c, "so-edna@teste.dev", [perfilEdna]);
    const vistosPorDaniela = await como(c, daniela, () => sql<{ email: string }>(c, "select email from public.membros"));
    expect(vistosPorDaniela.map((m) => m.email).sort()).toEqual(["admin@teste.dev", "daniela@teste.dev", "edna@teste.dev"]);
    const vistosPorOutra = await como(c, outraEdna, () => sql<{ email: string }>(c, "select email from public.membros"));
    expect(vistosPorOutra.map((m) => m.email)).not.toContain("daniela@teste.dev");
  });

  it("fila e notificações de outra pessoa: só o admin lê", async () => {
    const filaEdnaPeloAdmin = await como(c, admin, () =>
      sql<{ tema: string }>(c, "select tema from public.fila_aprovadora($1) order by tema collate \"C\"", [edna]),
    );
    expect(filaEdnaPeloAdmin.map((x) => x.tema)).toEqual(["Post da Edna", "Post do Grupo"]);
    const filaPropria = await como(c, edna, () => sql<{ tema: string }>(c, "select tema from public.fila_aprovadora()"));
    expect(filaPropria).toHaveLength(2);
    const filaAlheia = await como(c, daniela, () => sql(c, "select * from public.fila_aprovadora($1)", [edna]));
    expect(filaAlheia).toHaveLength(0);

    const notifAdmin = await como(c, admin, () => sql(c, "select * from public.notificacoes_de($1)", [edna]));
    expect(notifAdmin.length).toBeGreaterThan(0);
    const notifAlheia = await como(c, daniela, () => sql(c, "select * from public.notificacoes_de($1)", [edna]));
    expect(notifAlheia).toHaveLength(0);
  });
});

describe.skipIf(!temBanco)("Prompt 9 · troca de senha obrigatória", () => {
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

  it("aprovadora não baixa a flag por update direto; só pela função, que registra no histórico", async () => {
    await criarUsuario(c, "admin@teste.dev", "Jonathan");
    const edna = await criarAprovadora(c, "edna@teste.dev");
    await sql(c, "update public.membros set deve_trocar_senha = true where id = $1", [edna]);

    const upd = await como(c, edna, () => c.query("update public.membros set deve_trocar_senha = false where id = $1", [edna]));
    expect(upd.rowCount).toBe(0);

    await como(c, edna, () => c.query("select public.concluir_troca_senha()"));
    const [m] = await sql<{ deve_trocar_senha: boolean }>(c, "select deve_trocar_senha from public.membros where id = $1", [edna]);
    expect(m!.deve_trocar_senha).toBe(false);
    const hist = await sql<{ acao: string }>(c, "select acao from public.historico where entidade = 'membro' and entidade_id = $1", [edna]);
    expect(hist.map((h) => h.acao)).toContain("primeiro_acesso");
  });

  it("anônimo não chama concluir_troca_senha", async () => {
    expect(await erroDe(como(c, null, () => c.query("select public.concluir_troca_senha()")))).toBe("42501");
  });
});
