import { type EmailOtpType } from "@supabase/supabase-js";
import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";

/**
 * Destino dos links de e-mail (convite, redefinição de senha).
 * Aceita tanto token_hash (templates recomendados) quanto code (PKCE).
 */
export async function GET(request: NextRequest) {
  const { searchParams, origin } = request.nextUrl;
  const tokenHash = searchParams.get("token_hash");
  const type = searchParams.get("type") as EmailOtpType | null;
  const code = searchParams.get("code");
  const nextParam = searchParams.get("next") ?? "/";
  const next = nextParam.startsWith("/") && !nextParam.startsWith("//") ? nextParam : "/";

  // E-mails padrão do Supabase (sem SMTP próprio) trazem a sessão no
  // fragmento (#access_token=...), invisível aqui. O navegador mantém o
  // fragmento no redirecionamento, e /auth/callback conclui o login.
  if (!tokenHash && !code) {
    return NextResponse.redirect(`${origin}/auth/callback?next=${encodeURIComponent(next)}`);
  }

  const supabase = await createClient();
  let ok = false;
  if (tokenHash && type) {
    const { error } = await supabase.auth.verifyOtp({ type, token_hash: tokenHash });
    ok = !error;
  } else if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    ok = !error;
  }

  if (!ok) return NextResponse.redirect(`${origin}/login?erro=link`);
  // Convite → primeiro acesso (cria a senha); recuperação → nova senha.
  const destino = type === "invite" ? "/primeiro-acesso" : type === "recovery" && next === "/" ? "/auth/nova-senha" : next;
  return NextResponse.redirect(`${origin}${destino}`);
}
