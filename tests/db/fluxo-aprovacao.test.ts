import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from "vitest";
import type { Client } from "pg";
import { como, conectar, criarAprovadora, criarPost, criarUsuario, erroDe, perfilPorNome, sql, temBanco } from "./helpers";

describe.skipIf(!temBanco)("Prompt 4 · fluxo de aprovação (transições)", () => {
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
    adere = await perfilPorNome(c, "Grupo Adere"); // modo "todas"
    aprovEdna = await criarAprovadora(c, "edna@teste.dev", [edna, adere]);
    aprovDaniela = await criarAprovadora(c, "daniela@teste.dev", [adere]);
  });
  afterEach(async () => {
    await c.query("rollback");
  });

  const status = async (id: string) =>
    (await sql<{ status: string; versao: number }>(c, "select status, versao from public.posts where id = $1", [id]))[0]!;

  const decidir = (quem: string, postId: string, decisao: string, observacao: string | null = null, itens: string[] = []) =>
    como(c, quem, () =>
      c.query("insert into public.decisoes (post_id, versao, decisao, observacao, itens) values ($1, 999, $2, $3, $4)", [
        postId,
        decisao,
        observacao,
        itens,
      ]),
    );

  async function postEnviado(perfilId: string) {
    const id = await criarPost(c, perfilId, admin, { formato: "texto" });
    await como(c, admin, () => c.query("select public.enviar_para_aprovacao($1)", [id]));
    return id;
  }

  it("Rascunho → Aguardando (admin envia)", async () => {
    const id = await postEnviado(edna);
    expect(await status(id)).toEqual({ status: "aguardando", versao: 1 });
  });

  it("Aguardando → Aprovado (qualquer uma) e a decisão fica gravada na versão atual", async () => {
    const id = await postEnviado(edna);
    await decidir(aprovEdna, id, "aprovado");
    expect((await status(id)).status).toBe("aprovado");
    const [d] = await sql<{ versao: number; autor_id: string }>(c, "select versao, autor_id from public.decisoes where post_id = $1", [id]);
    expect(d).toEqual({ versao: 1, autor_id: aprovEdna });
    const hist = await sql<{ acao: string }>(c, "select acao from public.historico where post_id = $1 order by id", [id]);
    expect(hist.map((h) => h.acao)).toEqual(["enviou", "aprovou"]);
  });

  it("Revisar exige observação de ao menos 10 caracteres (CHECK no banco)", async () => {
    const id = await postEnviado(edna);
    expect(await erroDe(decidir(aprovEdna, id, "revisar", "curta"))).toBe("23514");
    expect(await erroDe(decidir(aprovEdna, id, "reprovado", null))).toBe("23514");
    await decidir(aprovEdna, id, "revisar", "Trocar a foto da capa", ["arte"]);
    expect((await status(id)).status).toBe("em_revisao");
  });

  it("Em revisão → Aguardando ao reenviar, com versão + 1", async () => {
    const id = await postEnviado(edna);
    await decidir(aprovEdna, id, "revisar", "Ajustar o CTA do final");
    await como(c, admin, () => c.query("select public.enviar_para_aprovacao($1)", [id]));
    expect(await status(id)).toEqual({ status: "aguardando", versao: 2 });
    // pode decidir de novo na v2
    await decidir(aprovEdna, id, "aprovado");
    expect(await status(id)).toEqual({ status: "aprovado", versao: 2 });
  });

  it("Reprovar encerra o post e exige motivo", async () => {
    const id = await postEnviado(edna);
    await decidir(aprovEdna, id, "reprovado", "Tema fora da linha editorial");
    expect((await status(id)).status).toBe("reprovado");
    expect(await erroDe(como(c, admin, () => c.query("select public.enviar_para_aprovacao($1)", [id])))).toBe("P0001");
  });

  it("Aprovado → Publicado (admin marca e informa o link)", async () => {
    const id = await postEnviado(edna);
    await decidir(aprovEdna, id, "aprovado");
    await como(c, admin, () => c.query("select public.marcar_publicado($1, 'https://www.linkedin.com/feed/update/1')", [id]));
    expect((await status(id)).status).toBe("publicado");
  });

  it("Editar um post Aprovado o devolve a Aguardando (nova versão)", async () => {
    const id = await postEnviado(edna);
    await decidir(aprovEdna, id, "aprovado");
    await como(c, admin, () => c.query("select public.enviar_para_aprovacao($1)", [id]));
    expect(await status(id)).toEqual({ status: "aguardando", versao: 2 });
  });

  it("não decide fora de Aguardando nem duas vezes na mesma versão", async () => {
    const rascunho = await criarPost(c, edna, admin);
    expect(await erroDe(decidir(aprovEdna, rascunho, "aprovado"))).toBe("P0001");
    const id = await postEnviado(adere);
    await decidir(aprovEdna, id, "aprovado");
    expect(await erroDe(decidir(aprovEdna, id, "aprovado"))).toBe("P0001");
  });

  it("modo todas: fica aguardando até todas aprovarem a versão atual (1 de 2)", async () => {
    const id = await postEnviado(adere);
    await decidir(aprovEdna, id, "aprovado");
    expect((await status(id)).status).toBe("aguardando");
    const [prog] = await sql<{ aprovacoes: number; total_aprovadoras: number }>(
      c,
      "select aprovacoes, total_aprovadoras from public.posts_progresso where post_id = $1",
      [id],
    );
    expect(prog).toEqual({ aprovacoes: 1, total_aprovadoras: 2 });
    await decidir(aprovDaniela, id, "aprovado");
    expect((await status(id)).status).toBe("aprovado");
  });

  it("modo todas: qualquer pedido de revisão move para Em revisão", async () => {
    const id = await postEnviado(adere);
    await decidir(aprovEdna, id, "aprovado");
    await decidir(aprovDaniela, id, "revisar", "Rever a data de publicação", ["data"]);
    expect((await status(id)).status).toBe("em_revisao");
  });

  it("modo todas: reprovação prevalece", async () => {
    const id = await postEnviado(adere);
    await decidir(aprovEdna, id, "reprovado", "Não combina com a marca");
    expect((await status(id)).status).toBe("reprovado");
  });

  it("modo todas: aprovações da versão anterior não contam na nova versão", async () => {
    const id = await postEnviado(adere);
    await decidir(aprovEdna, id, "aprovado");
    await decidir(aprovDaniela, id, "revisar", "Trocar a legenda inteira");
    await como(c, admin, () => c.query("select public.enviar_para_aprovacao($1)", [id]));
    await decidir(aprovDaniela, id, "aprovado");
    expect(await status(id)).toEqual({ status: "aguardando", versao: 2 });
    await decidir(aprovEdna, id, "aprovado");
    expect((await status(id)).status).toBe("aprovado");
  });

  it("aprovadora não grava decisão em nome de outra pessoa nem em perfil que não aprova", async () => {
    const id = await postEnviado(adere);
    expect(
      await erroDe(
        como(c, aprovEdna, () =>
          c.query("insert into public.decisoes (post_id, versao, autor_id, decisao) values ($1, 1, $2, 'aprovado')", [id, aprovDaniela]),
        ),
      ),
    ).toBe("42501");
    const soEdna = await postEnviado(edna);
    expect(await erroDe(decidir(aprovDaniela, soEdna, "aprovado"))).toBe("42501");
  });

  it("admin não decide (não é aprovadora)", async () => {
    const id = await postEnviado(edna);
    expect(await erroDe(decidir(admin, id, "aprovado"))).toBe("42501");
  });

  it("comentário do admin respondendo a uma observação", async () => {
    const id = await postEnviado(edna);
    await decidir(aprovEdna, id, "revisar", "Trocar a foto da capa");
    const [d] = await sql<{ id: string }>(c, "select id from public.decisoes where post_id = $1", [id]);
    await como(c, admin, () =>
      c.query("insert into public.comentarios (post_id, versao, decisao_id, texto) values ($1, 1, $2, 'Feito, troquei!')", [id, d!.id]),
    );
    const vistos = await como(c, aprovEdna, () => sql<{ texto: string }>(c, "select texto from public.comentarios where post_id = $1", [id]));
    expect(vistos).toEqual([{ texto: "Feito, troquei!" }]);
    expect(
      await erroDe(
        como(c, aprovEdna, () =>
          c.query("insert into public.comentarios (post_id, versao, autor_id, texto) values ($1, 1, $2, 'x')", [id, admin]),
        ),
      ),
    ).toBe("42501");
  });
});
