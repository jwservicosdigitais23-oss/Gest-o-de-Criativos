import { readFileSync } from "node:fs";
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from "vitest";
import type { Client } from "pg";
import { como, conectar, criarAprovadora, criarPost, criarUsuario, erroDe, perfilPorNome, sql, temBanco } from "./helpers";

/**
 * Fila do Grupo Adere (docs/validacao-fila-grupo-adere.md): posts do Grupo
 * Adere ficam pendentes para Edna e Daniela ao mesmo tempo, mesmo antes do
 * primeiro acesso, com as notificações correspondentes.
 */
describe.skipIf(!temBanco)("Fila do Grupo Adere", () => {
  let c: Client;
  let admin: string;
  let perfilEdna: string;
  let perfilDaniela: string;
  let perfilGrupo: string;
  let edna: string;
  let daniela: string;

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
    // As duas como hoje em produção: convite pendente, nunca entraram.
    await sql(c, "update public.membros set deve_trocar_senha = true, ultimo_acesso = null where id in ($1, $2)", [edna, daniela]);
  });
  afterEach(async () => {
    await c.query("rollback");
  });

  async function enviar(perfil: string, tema: string) {
    const post = await criarPost(c, perfil, admin, { tema });
    await como(c, admin, () => c.query("select public.enviar_para_aprovacao($1)", [post]));
    return post;
  }
  const fila = (quem: string) =>
    como(c, quem, () => sql<{ id: string }>(c, "select id from public.fila_aprovadora()")).then((r) => r.map((x) => x.id));
  const status = (post: string) =>
    sql<{ status: string }>(c, "select status from public.posts where id = $1", [post]).then((r) => r[0]!.status);
  const decidir = (quem: string, post: string, decisao: string, observacao: string | null = null) =>
    como(c, quem, () => c.query("insert into public.decisoes (post_id, versao, decisao, observacao) values ($1, 1, $2, $3)", [post, decisao, observacao]));
  const notificadas = (post: string) =>
    sql<{ destinatario_id: string }>(c, "select destinatario_id from public.notificacoes where post_id = $1 and tipo in ('novo_post','ajustado')", [post]).then(
      (r) => r.map((x) => x.destinatario_id).sort(),
    );

  it("modo cadastrado do Grupo Adere é 'todas'", async () => {
    const [p] = await sql<{ modo_aprovacao: string }>(c, "select modo_aprovacao from public.perfis where id = $1", [perfilGrupo]);
    expect(p!.modo_aprovacao).toBe("todas");
  });

  it("post do Grupo Adere entra na fila das duas e notifica as duas, mesmo sem nunca terem entrado", async () => {
    const post = await enviar(perfilGrupo, "Webinar");
    expect(await fila(edna)).toContain(post);
    expect(await fila(daniela)).toContain(post);
    expect(await notificadas(post)).toEqual([edna, daniela].sort());
    // Depois do primeiro acesso, a fila continua lá.
    await como(c, edna, () => c.query("select public.concluir_troca_senha()"));
    expect(await fila(edna)).toContain(post);
    const notifEdna = await como(c, edna, () => sql(c, "select 1 from public.notificacoes where post_id = $1", [post]));
    expect(notifEdna).toHaveLength(1);
  });

  it("as duas aprovam, revisam (com observação) e reprovam no Grupo Adere e no próprio perfil", async () => {
    for (const [quem, proprio] of [
      [edna, perfilEdna],
      [daniela, perfilDaniela],
    ] as const) {
      for (const perfil of [proprio, perfilGrupo]) {
        const a = await enviar(perfil, "A");
        const r = await enviar(perfil, "R");
        const x = await enviar(perfil, "X");
        await decidir(quem, a, "aprovado");
        await decidir(quem, r, "revisar", "Trocar a foto principal do post");
        await decidir(quem, x, "reprovado", "Fora da linha editorial");
        expect(await status(r)).toBe("em_revisao");
        expect(await status(x)).toBe("reprovado");
        // própria: qualquer uma → aprovado; Grupo: todas → espera a outra
        expect(await status(a)).toBe(perfil === perfilGrupo ? "aguardando" : "aprovado");
      }
    }
  });

  it("revisar sem observação é recusado", async () => {
    const post = await enviar(perfilGrupo, "Sem obs");
    expect(await erroDe(decidir(edna, post, "revisar", null))).toBeDefined();
  });

  it("Edna não lê nem decide no perfil da Daniela (e vice-versa), pela API", async () => {
    const pDani = await enviar(perfilDaniela, "Da Daniela");
    const pEdna = await enviar(perfilEdna, "Da Edna");
    expect(await como(c, edna, () => sql(c, "select 1 from public.posts where id = $1", [pDani]))).toHaveLength(0);
    expect(await como(c, daniela, () => sql(c, "select 1 from public.posts where id = $1", [pEdna]))).toHaveLength(0);
    expect(await erroDe(decidir(edna, pDani, "aprovado"))).toBe("42501");
    expect(await erroDe(decidir(daniela, pEdna, "aprovado"))).toBe("42501");
    expect(await fila(edna)).not.toContain(pDani);
    expect(await fila(daniela)).not.toContain(pEdna);
  });

  it("modo todas: 1 de 2 → aprovado; revisão de qualquer uma → em revisão; nova versão zera as aprovações", async () => {
    const post = await enviar(perfilGrupo, "Todas");
    await decidir(edna, post, "aprovado");
    let [p] = await sql<{ aprovacoes: number; total_aprovadoras: number }>(
      c,
      "select aprovacoes, total_aprovadoras from public.posts_progresso where post_id = $1",
      [post],
    );
    expect(await status(post)).toBe("aguardando");
    expect([Number(p!.aprovacoes), Number(p!.total_aprovadoras)]).toEqual([1, 2]);
    expect(await fila(edna)).not.toContain(post); // já decidiu
    expect(await fila(daniela)).toContain(post);
    await decidir(daniela, post, "aprovado");
    expect(await status(post)).toBe("aprovado");

    const outro = await enviar(perfilGrupo, "Revisão");
    await decidir(edna, outro, "aprovado");
    await decidir(daniela, outro, "revisar", "Ajustar o CTA do final");
    expect(await status(outro)).toBe("em_revisao");
    // Nova versão: as duas voltam a ter o post na fila, com 0 aprovações.
    await como(c, admin, () => c.query("select public.enviar_para_aprovacao($1)", [outro]));
    [p] = await sql(c, "select aprovacoes, total_aprovadoras from public.posts_progresso where post_id = $1", [outro]);
    expect(Number(p!.aprovacoes)).toBe(0);
    expect(await fila(edna)).toContain(outro);
    expect(await fila(daniela)).toContain(outro);
  });

  it("aprovadora vinculada depois do envio passa a ver o post e recebe a notificação (sem duplicar)", async () => {
    const nova = await criarAprovadora(c, "nova@teste.dev");
    const post = await enviar(perfilGrupo, "Antes do vínculo");
    expect(await como(c, nova, () => sql(c, "select 1 from public.posts where id = $1", [post]))).toHaveLength(0);
    await sql(c, "insert into public.perfil_aprovadoras (perfil_id, membro_id) values ($1, $2)", [perfilGrupo, nova]);
    expect(await fila(nova)).toContain(post);
    expect(await notificadas(post)).toContain(nova);
    // Remover e vincular de novo não duplica.
    await sql(c, "delete from public.perfil_aprovadoras where perfil_id = $1 and membro_id = $2", [perfilGrupo, nova]);
    await sql(c, "insert into public.perfil_aprovadoras (perfil_id, membro_id) values ($1, $2)", [perfilGrupo, nova]);
    expect((await notificadas(post)).filter((x) => x === nova)).toHaveLength(1);
  });

  it("contador por perfil (sidebar) = fila do Painel", async () => {
    const g1 = await enviar(perfilGrupo, "G1");
    await enviar(perfilGrupo, "G2");
    await enviar(perfilEdna, "E1");
    await decidir(edna, g1, "aprovado"); // continua aguardando (todas), mas sai da fila da Edna
    const porPerfil = await como(c, edna, () =>
      sql<{ perfil_id: string; n: number }>(
        c,
        "select perfil_id, count(*)::int n from public.pendencias_aprovadoras where membro_id = $1 group by perfil_id",
        [edna],
      ),
    );
    const total = porPerfil.reduce((s, x) => s + x.n, 0);
    expect(total).toBe((await fila(edna)).length);
    expect(porPerfil.find((x) => x.perfil_id === perfilGrupo)!.n).toBe(1);
  });

  it("migração: vínculos Edna/Daniela → Grupo Adere são idempotentes e o backfill notifica as pendências", async () => {
    // Pessoas com os e-mails reais, só com o perfil pessoal (como em produção).
    const e = await criarAprovadora(c, "edna.queiroz@grupoadere.com.br", [perfilEdna]);
    const d = await criarAprovadora(c, "daniquintana@grupoadere.com.br", [perfilDaniela]);
    const post = await enviar(perfilGrupo, "Pendente antes do vínculo");
    const migracao = readFileSync("supabase/migrations/20261001100000_fila_grupo_adere.sql", "utf8");
    const inicio = migracao.indexOf("insert into public.perfil_aprovadoras");
    const vinculos = migracao.slice(inicio, migracao.indexOf("-- 4.", inicio));
    expect(vinculos).toContain("on conflict");
    await c.query(vinculos);
    await c.query(vinculos); // de novo: não duplica
    const links = await sql(c, "select membro_id from public.perfil_aprovadoras where perfil_id = $1 and membro_id in ($2, $3)", [perfilGrupo, e, d]);
    expect(links).toHaveLength(2);
    expect(await notificadas(post)).toEqual(expect.arrayContaining([e, d]));
    const [{ n }] = await sql<{ n: number }>(c, "select public.notificar_pendencias() n");
    expect(Number(n)).toBe(0); // backfill não duplica
  });
});
