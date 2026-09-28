import { Client } from "pg";

/**
 * Testes de banco: rodam contra um Postgres com as migrações aplicadas
 * (scripts/db-test-reset.sh). Sem TEST_DATABASE_URL, são pulados.
 */
export const DB_URL = process.env.TEST_DATABASE_URL;
export const temBanco = Boolean(DB_URL);

export async function conectar() {
  const client = new Client({ connectionString: DB_URL });
  await client.connect();
  return client;
}

/** Executa como superusuário (equivale à service role / ao próprio banco). */
export async function sql<T = Record<string, unknown>>(c: Client, query: string, params: unknown[] = []) {
  const r = await c.query(query, params);
  return r.rows as T[];
}

/**
 * Executa `fn` como um usuário autenticado (role authenticated + auth.uid()),
 * dentro de um savepoint — erros não derrubam a transação do teste.
 */
export async function como<T>(c: Client, userId: string | null, fn: () => Promise<T>): Promise<T> {
  await c.query("savepoint como_usuario");
  try {
    await c.query(userId ? "set local role authenticated" : "set local role anon");
    await c.query("select set_config('request.jwt.claim.sub', $1, true)", [userId ?? ""]);
    const r = await fn();
    await c.query("reset role");
    await c.query("release savepoint como_usuario");
    return r;
  } catch (e) {
    await c.query("rollback to savepoint como_usuario");
    await c.query("reset role");
    throw e;
  }
}

/** Cria um usuário no auth.users (o trigger decide se vira admin). */
export async function criarUsuario(c: Client, email: string, nome = email.split("@")[0]) {
  const [u] = await sql<{ id: string }>(
    c,
    "insert into auth.users (email, raw_user_meta_data) values ($1, jsonb_build_object('nome', $2::text)) returning id",
    [email, nome],
  );
  return u!.id;
}

/** Cria uma aprovadora (usuário + registro em membros), vinculada aos perfis. */
export async function criarAprovadora(c: Client, email: string, perfilIds: string[] = []) {
  const id = await criarUsuario(c, email);
  await sql(c, "insert into public.membros (id, nome, email, papel) values ($1, $2, $3, 'aprovadora')", [
    id,
    email.split("@")[0],
    email,
  ]);
  for (const p of perfilIds) {
    await sql(c, "insert into public.perfil_aprovadoras (perfil_id, membro_id) values ($1, $2)", [p, id]);
  }
  return id;
}

export async function perfilPorNome(c: Client, nome: string) {
  const [p] = await sql<{ id: string }>(c, "select id from public.perfis where nome = $1", [nome]);
  return p!.id;
}

/** Código SQLSTATE de um erro do pg (ou undefined). */
export async function erroDe(p: Promise<unknown>): Promise<string | undefined> {
  try {
    await p;
    return undefined;
  } catch (e) {
    return (e as { code?: string }).code ?? "erro";
  }
}
