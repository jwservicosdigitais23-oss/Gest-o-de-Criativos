import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from "vitest";
import type { Client } from "pg";
import { como, conectar, criarAprovadora, criarPost, criarUsuario, erroDe, perfilPorNome, sql, temBanco } from "./helpers";

describe.skipIf(!temBanco)("Prompt 6 · RPC de importação do cronograma", () => {
  let c: Client;
  let admin: string;
  let edna: string;
  let aprov: string;

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
    aprov = await criarAprovadora(c, "edna@teste.dev", [edna]);
  });
  afterEach(async () => {
    await c.query("rollback");
  });

  const importar = (quem: string, linhas: unknown[], rejeitadas: unknown[] = []) =>
    como(c, quem, async () => {
      const [r] = await sql<{ r: Record<string, unknown> }>(c, "select public.importar_cronograma('crono.xlsx', $1::jsonb, $2::jsonb) r", [
        JSON.stringify(linhas),
        JSON.stringify(rejeitadas),
      ]);
      return r!.r;
    });

  const linha = (n: number, extra: Record<string, unknown> = {}) => ({
    linha: n,
    perfil_id: edna,
    data: "2030-01-16",
    hora: "09:00",
    tema: `Tema ${n}`,
    legenda: `Legenda ${n}`,
    formato: "carrossel",
    arquivo: `arte-${n}.pdf`,
    ...extra,
  });

  it("cria rascunhos com origem importacao, prazo de 2 dias úteis e registra a importação", async () => {
    const r = await importar(admin, [linha(2), linha(3), linha(4)], [{ linha: 5, resultado: "erro", motivo: "Data inválida" }]);
    expect(r).toMatchObject({ criados: 3, atualizados: 0, ignorados: 0, erros: 1 });
    const posts = await sql<{ status: string; origem: string; prazo: string; arquivo_ref: string }>(
      c,
      "select status, origem, to_char(prazo_aprovacao, 'YYYY-MM-DD') prazo, arquivo_ref from public.posts order by tema",
    );
    expect(posts).toHaveLength(3);
    expect(posts[0]).toEqual({ status: "rascunho", origem: "importacao", prazo: "2030-01-14", arquivo_ref: "arte-2.pdf" });
    const [imp] = await sql<{ total: number; criados: number; erros: number }>(c, "select total, criados, erros from public.importacoes");
    expect(imp).toEqual({ total: 4, criados: 3, erros: 1 });
  });

  it("chave existente atualiza em vez de duplicar (ID ou Perfil+Data+Tema)", async () => {
    await importar(admin, [linha(2), linha(3, { chave_externa: "CRONO-3" })]);
    const r = await importar(admin, [
      linha(2, { tema: "  tema 2 ", legenda: "Nova legenda" }),
      linha(3, { chave_externa: "crono-3", tema: "Tema renomeado" }),
    ]);
    expect(r).toMatchObject({ criados: 0, atualizados: 2 });
    const posts = await sql<{ tema: string; legenda: string }>(c, "select tema, legenda from public.posts order by lower(tema) collate \"C\"");
    expect(posts).toEqual([
      { tema: "tema 2", legenda: "Nova legenda" },
      { tema: "Tema renomeado", legenda: "Legenda 3" },
    ]);
  });

  it("posts aprovados ou publicados nunca são sobrescritos", async () => {
    const id = await criarPost(c, edna, admin, { status: "aprovado", tema: "Tema 2", data: "2030-01-16" });
    const r = await importar(admin, [linha(2, { legenda: "sobrescrever?" })]);
    expect(r).toMatchObject({ criados: 0, atualizados: 0, ignorados: 1 });
    const [p] = await sql<{ legenda: string }>(c, "select legenda from public.posts where id = $1", [id]);
    expect(p!.legenda).toBe("Legenda do post");
  });

  it("linha com perfil inexistente vira erro sem derrubar as demais", async () => {
    const r = await importar(admin, [linha(2), linha(3, { perfil_id: "00000000-0000-0000-0000-000000000000" })]);
    expect(r).toMatchObject({ criados: 1, erros: 1 });
  });

  it("aprovadora não importa", async () => {
    expect(await erroDe(importar(aprov, [linha(2)]))).toBe("42501");
  });
});
