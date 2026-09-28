import "server-only";

import { createHmac } from "node:crypto";
import { cookies } from "next/headers";
import { assinarVerComo, verificarVerComo, VER_COMO_DURACAO_S, type EstadoVerComo } from "./ver-como-token";

export const COOKIE_VER_COMO = "adere_ver_como";

/**
 * Chave do cookie: VER_COMO_SECRET, ou derivada da service role (que já
 * existe só no servidor). Sem nenhuma das duas, o "Ver como" fica desligado.
 */
function chave(): string | null {
  const base = process.env.VER_COMO_SECRET || process.env.SUPABASE_SERVICE_ROLE_KEY;
  return base ? createHmac("sha256", base).update("adere/ver-como/v1").digest("hex") : null;
}

export function verComoDisponivel() {
  return chave() !== null;
}

export async function lerVerComo(): Promise<EstadoVerComo | null> {
  const k = chave();
  if (!k) return null;
  const jar = await cookies();
  return verificarVerComo(jar.get(COOKIE_VER_COMO)?.value, k);
}

export async function gravarVerComo(adminId: string, alvoId: string) {
  const k = chave();
  if (!k) throw new Error("Ver como indisponível: configure VER_COMO_SECRET.");
  const exp = Math.floor(Date.now() / 1000) + VER_COMO_DURACAO_S;
  const jar = await cookies();
  jar.set(COOKIE_VER_COMO, assinarVerComo({ adminId, alvoId, exp }, k), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: VER_COMO_DURACAO_S,
  });
}

export async function apagarVerComo() {
  const jar = await cookies();
  jar.delete(COOKIE_VER_COMO);
}
