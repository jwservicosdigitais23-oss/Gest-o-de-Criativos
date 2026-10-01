import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from "vitest";
import type { Client } from "pg";
import { como, conectar, criarAprovadora, criarPost, criarUsuario, erroDe, perfilPorNome, sql, temBanco } from "./helpers";

describe.skipIf(!temBanco)("Prompt 5 · painel e notificações", () => {
  let c: Client;
  let admin: string;
  let edna: string;
  let adere: string;
  let aprovEdna: string;
  let aprovDaniela: string;

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
    adere = await perfilPorNome(c, "Grupo Adere");
    // Estes cenários cobrem o modo "todas" (o Grupo Adere real usa "qualquer uma").
    await sql(c, "update public.perfis set modo_aprovacao = 'todas' where id = $1", [adere]);
    aprovEdna = await criarAprovadora(c, "edna@teste.dev", [edna, adere]);
    aprovDaniela = await criarAprovadora(c, "daniela@teste.dev", [adere]);
  });
  afterEach(async () => {
    await c.query("rollback");
  });

  const enviar = (id: string) => como(c, admin, () => c.query("select public.enviar_para_aprovacao($1)", [id]));
  const decidir = (quem: string, id: string, decisao: string, obs: string | null = null) =>
    como(c, quem, () => c.query("insert into public.decisoes (post_id, versao, decisao, observacao) values ($1, 0, $2, $3)", [id, decisao, obs]));
  const minhas = (quem: string) =>
    como(c, quem, () => sql<{ titulo: string; corpo: string | null }>(c, "select titulo, corpo from public.notificacoes order by created_at, titulo"));

  it("envio notifica as aprovadoras; reenvio avisa que foi ajustado", async () => {
    const id = await criarPost(c, adere, admin, { tema: "Lançamento", data: "2026-10-05" });
    await enviar(id);
    expect((await minhas(aprovEdna)).map((n) => n.titulo)).toEqual(["Novo post para aprovar: Lançamento · 05/10/2026"]);
    expect(await minhas(aprovDaniela)).toHaveLength(1);
    expect(await minhas(admin)).toHaveLength(0);

    await decidir(aprovDaniela, id, "revisar", "Encurtar a legenda, por favor");
    expect((await minhas(admin)).map((n) => [n.titulo, n.corpo])).toEqual([
      ["daniela pediu revisão em Lançamento", "Encurtar a legenda, por favor"],
    ]);

    await enviar(id);
    expect((await minhas(aprovEdna)).map((n) => n.titulo)).toContain("Lançamento foi ajustado (v2)");
  });

  it("aprovação e reprovação notificam o admin", async () => {
    const a = await criarPost(c, edna, admin, { tema: "A" });
    const b = await criarPost(c, edna, admin, { tema: "B" });
    await enviar(a);
    await enviar(b);
    await decidir(aprovEdna, a, "aprovado");
    await decidir(aprovEdna, b, "reprovado", "Fora do tom");
    const titulos = (await minhas(admin)).map((n) => n.titulo);
    expect(titulos).toEqual(expect.arrayContaining(["edna aprovou A", "edna reprovou B"]));
  });

  it("cada um vê só as suas notificações e só altera o campo lida", async () => {
    const id = await criarPost(c, edna, admin);
    await enviar(id);
    const [n] = await sql<{ id: string }>(c, "select id from public.notificacoes where destinatario_id = $1", [aprovEdna]);
    expect(await como(c, aprovDaniela, () => sql(c, "select * from public.notificacoes"))).toHaveLength(0);
    const r = await como(c, aprovDaniela, () => c.query("update public.notificacoes set lida = true where id = $1", [n!.id]));
    expect(r.rowCount).toBe(0);
    await como(c, aprovEdna, () => c.query("update public.notificacoes set lida = true where id = $1", [n!.id]));
    expect(
      await erroDe(como(c, aprovEdna, () => c.query("update public.notificacoes set titulo = 'x' where id = $1", [n!.id]))),
    ).toBe("42501");
    expect(await erroDe(como(c, aprovEdna, () => c.query("insert into public.notificacoes (destinatario_id, tipo, titulo) values ($1, 'x', 'x')", [aprovDaniela])))).toBe("42501");
  });

  it("KPIs do painel e fila da aprovadora", async () => {
    const hoje = (await sql<{ d: string }>(c, "select to_char(public.hoje_sp(), 'YYYY-MM-DD') d"))[0]!.d;
    const atrasado = await criarPost(c, adere, admin, { tema: "Atrasado" });
    await c.query("select set_config('adere.transicao','on',true)");
    await c.query("update public.posts set prazo_aprovacao = $2::date - 1, data_publicacao = $2::date + 1 where id = $1", [atrasado, hoje]);
    await c.query("select set_config('adere.transicao','off',true)");
    await enviar(atrasado);
    const semana = await criarPost(c, edna, admin, { tema: "Semana", data: hoje });
    await enviar(semana);
    await decidir(aprovEdna, semana, "aprovado");

    const [{ k }] = (await como(c, admin, () => sql<{ k: Record<string, unknown> }>(c, "select public.painel_kpis() k"))) as [
      { k: Record<string, unknown> },
    ];
    expect(k).toMatchObject({ aguardando: 1, em_revisao: 0, aprovados_semana: 1, atrasados: 1 });
    expect(k.aguardando_por_aprovadora).toEqual([
      { membro_id: aprovDaniela, nome: "daniela", total: 1 },
      { membro_id: aprovEdna, nome: "edna", total: 1 },
    ]);
    expect(Number(k.tempo_medio_horas)).toBeGreaterThanOrEqual(0);

    const fila = await como(c, aprovEdna, () => sql<{ tema: string }>(c, "select tema from public.fila_aprovadora()"));
    expect(fila.map((f) => f.tema)).toEqual(["Atrasado"]);
    await decidir(aprovEdna, atrasado, "aprovado");
    expect(await como(c, aprovEdna, () => sql(c, "select * from public.fila_aprovadora()"))).toHaveLength(0);
    // Daniela ainda precisa aprovar (modo todas)
    expect(await como(c, aprovDaniela, () => sql(c, "select * from public.fila_aprovadora()"))).toHaveLength(1);
  });
});
