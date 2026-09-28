"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { LayoutAuth } from "@/components/auth/layout-auth";
import { createClient } from "@/lib/supabase/client";

/** Aceita só caminhos internos. */
function seguro(caminho: string | null) {
  return caminho && caminho.startsWith("/") && !caminho.startsWith("//") ? caminho : "/";
}

/**
 * Destino dos links dos e-mails padrão do Supabase (sem SMTP próprio): a
 * sessão chega no fragmento da URL (#access_token=...&type=invite), que o
 * servidor não enxerga. Aqui o navegador grava a sessão nos cookies e segue:
 * convite → /primeiro-acesso; redefinição → /auth/nova-senha.
 */
export default function AuthCallbackPage() {
  const router = useRouter();
  const feito = useRef(false);

  useEffect(() => {
    if (feito.current) return;
    feito.current = true;
    (async () => {
      const url = new URL(window.location.href);
      const hash = new URLSearchParams(url.hash.slice(1));
      const next = seguro(url.searchParams.get("next"));
      const tipo = hash.get("type") ?? url.searchParams.get("type");
      const supabase = createClient();

      let ok = false;
      if (hash.get("access_token") && hash.get("refresh_token")) {
        const { error } = await supabase.auth.setSession({
          access_token: hash.get("access_token")!,
          refresh_token: hash.get("refresh_token")!,
        });
        ok = !error;
      } else if (url.searchParams.get("code")) {
        const { error } = await supabase.auth.exchangeCodeForSession(url.searchParams.get("code")!);
        ok = !error;
      }
      // Tira os tokens da barra de endereço antes de navegar.
      window.history.replaceState(null, "", url.pathname);

      if (!ok) return router.replace("/login?erro=link");
      const destino = tipo === "invite" ? "/primeiro-acesso" : tipo === "recovery" && next === "/" ? "/auth/nova-senha" : next;
      router.replace(destino);
      router.refresh();
    })();
  }, [router]);

  return (
    <LayoutAuth>
      <div className="flex flex-col items-center gap-3 py-10 text-center" role="status">
        <Loader2 className="size-8 animate-spin text-blue-600" aria-hidden />
        <p className="text-body text-text-muted">Validando seu link de acesso…</p>
      </div>
    </LayoutAuth>
  );
}
