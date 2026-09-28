import { createHmac, timingSafeEqual } from "node:crypto";

/** Estado do "Ver como" guardado no cookie assinado do admin. */
export interface EstadoVerComo {
  adminId: string;
  alvoId: string;
  /** Expiração em segundos (epoch). */
  exp: number;
}

export const VER_COMO_DURACAO_S = 30 * 60;

function hmac(corpo: string, chave: string) {
  return createHmac("sha256", chave).update(corpo).digest("base64url");
}

export function assinarVerComo(estado: EstadoVerComo, chave: string) {
  const corpo = Buffer.from(JSON.stringify(estado)).toString("base64url");
  return `${corpo}.${hmac(corpo, chave)}`;
}

/** Devolve o estado só se a assinatura confere e não expirou. */
export function verificarVerComo(token: string | undefined, chave: string, agoraS = Math.floor(Date.now() / 1000)): EstadoVerComo | null {
  if (!token) return null;
  const [corpo, assinatura, ...resto] = token.split(".");
  if (!corpo || !assinatura || resto.length) return null;
  const esperada = Buffer.from(hmac(corpo, chave));
  const recebida = Buffer.from(assinatura);
  if (esperada.length !== recebida.length || !timingSafeEqual(esperada, recebida)) return null;
  try {
    const e = JSON.parse(Buffer.from(corpo, "base64url").toString()) as EstadoVerComo;
    if (typeof e.adminId !== "string" || typeof e.alvoId !== "string" || typeof e.exp !== "number") return null;
    return e.exp > agoraS ? e : null;
  } catch {
    return null;
  }
}
