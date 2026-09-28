import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from "vitest";
import type { Client } from "pg";
import { como, conectar, criarAprovadora, criarPost, criarUsuario, erroDe, perfilPorNome, sql, temBanco } from "./helpers";

describe.skipIf(!temBanco)("Prompt 3 · posts e mídias", () => {
  let c: Client;
  let admin: string;
  let edna: string;
  let daniela: string;
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
    daniela = await perfilPorNome(c, "Daniela Quintana");
    aprovEdna = await criarAprovadora(c, "edna@teste.dev", [edna]);
    aprovDaniela = await criarAprovadora(c, "daniela@teste.dev", [daniela]);
  });
  afterEach(async () => {
    await c.query("rollback");
  });

  async function novoPostAdmin(formato = "imagem") {
    return como(c, admin, async () => {
      const [p] = await sql<{ id: string; status: string; versao: number }>(
        c,
        `insert into public.posts (perfil_id, data_publicacao, tema, legenda, formato, status, versao)
         values ($1, current_date + 7, 'Tema', 'Legenda', $2::public.formato, 'aprovado', 9) returning id, status, versao`,
        [edna, formato],
      );
      return p!;
    });
  }

  async function adicionarMidia(postId: string, versao = 1, caminho = `x/${postId}/v${versao}/a.png`) {
    await como(c, admin, () =>
      c.query(
        "insert into public.midias (post_id, versao, tipo, storage_path, nome_arquivo) values ($1, $2, 'imagem', $3, 'a.png')",
        [postId, versao, caminho],
      ),
    );
    return caminho;
  }

  it("post novo sempre nasce como rascunho v1, mesmo se pedirem outro status", async () => {
    const p = await novoPostAdmin();
    expect(p).toMatchObject({ status: "rascunho", versao: 1 });
  });

  it("aprovadora não cria nem altera posts", async () => {
    expect(
      await erroDe(
        como(c, aprovEdna, () =>
          c.query("insert into public.posts (perfil_id, data_publicacao, tema) values ($1, current_date, 'x')", [edna]),
        ),
      ),
    ).toBe("42501");
    const { id } = await novoPostAdmin();
    const r = await como(c, aprovEdna, () => c.query("update public.posts set tema = 'hack' where id = $1", [id]));
    expect(r.rowCount).toBe(0);
  });

  it("status não muda por UPDATE direto, nem pelo admin", async () => {
    const { id } = await novoPostAdmin();
    expect(
      await erroDe(como(c, admin, () => c.query("update public.posts set status = 'aprovado' where id = $1", [id]))),
    ).toBe("42501");
  });

  it("enviar para aprovação exige mídia (exceto Texto) e grava o instantâneo da versão", async () => {
    const { id } = await novoPostAdmin();
    expect(await erroDe(como(c, admin, () => c.query("select public.enviar_para_aprovacao($1)", [id])))).toBe("P0001");
    await adicionarMidia(id);
    await como(c, admin, () => c.query("select public.enviar_para_aprovacao($1)", [id]));
    const [post] = await sql<{ status: string; versao: number }>(c, "select status, versao from public.posts where id = $1", [id]);
    expect(post).toEqual({ status: "aguardando", versao: 1 });
    expect(await sql(c, "select versao from public.post_versoes where post_id = $1", [id])).toEqual([{ versao: 1 }]);

    const texto = await novoPostAdmin("texto");
    await como(c, admin, () => c.query("select public.enviar_para_aprovacao($1)", [texto.id]));
  });

  it("aprovadora não envia para aprovação", async () => {
    const { id } = await novoPostAdmin("texto");
    expect(await erroDe(como(c, aprovEdna, () => c.query("select public.enviar_para_aprovacao($1)", [id])))).toBe("42501");
  });

  it("reenviar a partir de em_revisao sobe a versão e considera as mídias da nova versão", async () => {
    const id = await criarPost(c, edna, admin, { status: "em_revisao", formato: "imagem" });
    await adicionarMidia(id, 1);
    // a mídia da v1 foi removida nos ajustes (versao_removida = 2) e nada novo entrou
    await c.query("update public.midias set versao_removida = 2 where post_id = $1", [id]);
    expect(await erroDe(como(c, admin, () => c.query("select public.enviar_para_aprovacao($1)", [id])))).toBe("P0001");
    await adicionarMidia(id, 2);
    await como(c, admin, () => c.query("select public.enviar_para_aprovacao($1)", [id]));
    const [post] = await sql<{ status: string; versao: number }>(c, "select status, versao from public.posts where id = $1", [id]);
    expect(post).toEqual({ status: "aguardando", versao: 2 });
    const midiasV1 = await sql(c, "select * from public.midias_da_versao($1, 1)", [id]);
    const midiasV2 = await sql(c, "select * from public.midias_da_versao($1, 2)", [id]);
    expect(midiasV1).toHaveLength(1);
    expect(midiasV2).toHaveLength(1);
  });

  it("marcar publicado só a partir de aprovado e com link", async () => {
    const rasc = await criarPost(c, edna, admin);
    expect(
      await erroDe(como(c, admin, () => c.query("select public.marcar_publicado($1, 'https://linkedin.com/x')", [rasc]))),
    ).toBe("P0001");
    const aprov = await criarPost(c, edna, admin, { status: "aprovado" });
    expect(await erroDe(como(c, admin, () => c.query("select public.marcar_publicado($1, 'sem link')", [aprov])))).toBe("22023");
    await como(c, admin, () => c.query("select public.marcar_publicado($1, 'https://linkedin.com/x')", [aprov]));
    const [p] = await sql<{ status: string; link_publicado: string }>(c, "select status, link_publicado from public.posts where id = $1", [aprov]);
    expect(p).toEqual({ status: "publicado", link_publicado: "https://linkedin.com/x" });
  });

  it("duplicar cria rascunho v1 com as mídias da versão atual", async () => {
    const id = await criarPost(c, edna, admin, { status: "reprovado", formato: "imagem" });
    await adicionarMidia(id, 1);
    const [{ novo }] = (await como(c, admin, () => sql<{ novo: string }>(c, "select public.duplicar_post($1) novo", [id]))) as [{ novo: string }];
    const [p] = await sql<{ status: string; versao: number; duplicado_de: string }>(
      c,
      "select status, versao, duplicado_de from public.posts where id = $1",
      [novo],
    );
    expect(p).toEqual({ status: "rascunho", versao: 1, duplicado_de: id });
    expect(await sql(c, "select 1 from public.midias where post_id = $1", [novo])).toHaveLength(1);
  });

  it("excluir post sem decisões funciona; com decisões, não (arquivar)", async () => {
    const livre = await criarPost(c, edna, admin);
    await como(c, admin, () => c.query("select public.excluir_post($1)", [livre]));
    expect(await sql(c, "select 1 from public.posts where id = $1", [livre])).toHaveLength(0);

    const decidido = await criarPost(c, edna, admin, { status: "aguardando" });
    await c.query("insert into public.decisoes (post_id, versao, autor_id, decisao) values ($1, 1, $2, 'aprovado')", [decidido, aprovEdna]);
    expect(await erroDe(como(c, admin, () => c.query("select public.excluir_post($1)", [decidido])))).toBe("P0001");
    await como(c, admin, () => c.query("select public.arquivar_post($1)", [decidido]));
    const [p] = await sql<{ status: string }>(c, "select status from public.posts where id = $1", [decidido]);
    expect(p!.status).toBe("arquivado");
  });

  it("aprovadora não lê posts nem mídias de perfis que não são dela", async () => {
    const id = await criarPost(c, edna, admin, { formato: "imagem" });
    await adicionarMidia(id);
    expect(await como(c, aprovDaniela, () => sql(c, "select * from public.posts where id = $1", [id]))).toHaveLength(0);
    expect(await como(c, aprovDaniela, () => sql(c, "select * from public.midias where post_id = $1", [id]))).toHaveLength(0);
    expect(await como(c, aprovEdna, () => sql(c, "select * from public.posts where id = $1", [id]))).toHaveLength(1);
  });

  it("Storage: leitura segue o registro da mídia; upload só admin", async () => {
    const id = await criarPost(c, edna, admin, { formato: "imagem" });
    const caminho = await adicionarMidia(id, 1, `${edna}/${id}/v1/foto.png`);
    await c.query("insert into storage.objects (bucket_id, name) values ('midias', $1), ('midias', 'solto/orfao.png')", [caminho]);

    const vistosEdna = await como(c, aprovEdna, () => sql<{ name: string }>(c, "select name from storage.objects"));
    expect(vistosEdna.map((o) => o.name)).toEqual([caminho]);
    expect(await como(c, aprovDaniela, () => sql(c, "select name from storage.objects"))).toHaveLength(0);
    expect(await como(c, admin, () => sql(c, "select name from storage.objects"))).toHaveLength(2);

    expect(
      await erroDe(
        como(c, aprovEdna, () => c.query("insert into storage.objects (bucket_id, name) values ('midias', 'x/y.png')")),
      ),
    ).toBe("42501");
  });
});
