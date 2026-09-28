import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { supabaseEnv } from "./env";

const ROTAS_PUBLICAS = [
  "/login",
  "/esqueci-senha",
  "/instalar",
  "/auth",
];

function ehPublica(pathname: string) {
  return ROTAS_PUBLICAS.some((r) => pathname === r || pathname.startsWith(`${r}/`));
}

/** Renova a sessão do Supabase e protege as rotas internas. */
export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({ request });

  const { url, anonKey } = supabaseEnv();

  const supabase = createServerClient(url, anonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet, headers) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
        response = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) =>
          response.cookies.set(name, value, options),
        );
        Object.entries(headers ?? {}).forEach(([k, v]) => response.headers.set(k, v));
      },
    },
  });

  // Não coloque código entre createServerClient e getClaims().
  const { data } = await supabase.auth.getClaims();
  const logado = Boolean(data?.claims);
  const { pathname } = request.nextUrl;

  if (!logado && !ehPublica(pathname)) {
    const destino = request.nextUrl.clone();
    destino.pathname = "/login";
    destino.search = pathname !== "/" ? `?next=${encodeURIComponent(pathname)}` : "";
    return NextResponse.redirect(destino);
  }

  if (logado && (pathname === "/login" || pathname === "/instalar")) {
    const destino = request.nextUrl.clone();
    destino.pathname = "/";
    destino.search = "";
    return NextResponse.redirect(destino);
  }

  // Senha provisória ou convite recém-aceito: troca obrigatória antes de usar o CRM.
  if (logado && precisaChecarTroca(request, pathname)) {
    const { data: membro } = await supabase
      .from("membros")
      .select("deve_trocar_senha")
      .eq("id", data!.claims.sub as string)
      .maybeSingle();
    if (membro?.deve_trocar_senha) {
      const destino = request.nextUrl.clone();
      destino.pathname = "/primeiro-acesso";
      destino.search = "";
      return copiarCookies(response, NextResponse.redirect(destino));
    }
  }
  return response;
}

/** Só navegações de página (não server actions nem prefetch) fora das telas de senha. */
function precisaChecarTroca(request: NextRequest, pathname: string) {
  if (pathname === "/primeiro-acesso" || ehPublica(pathname)) return false;
  if (request.method !== "GET") return false;
  if (request.headers.get("next-router-prefetch")) return false;
  return true;
}

function copiarCookies(de: NextResponse, para: NextResponse) {
  de.cookies.getAll().forEach((c) => para.cookies.set(c));
  return para;
}
