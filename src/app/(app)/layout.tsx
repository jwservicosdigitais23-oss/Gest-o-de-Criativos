import { MenuInferior } from "@/components/shell/menu-inferior";
import { Sidebar } from "@/components/shell/sidebar";
import { Topbar } from "@/components/shell/topbar";
import type { UsuarioShell } from "@/components/shell/tipos";
import { ALTURA_FAIXA, FaixaVerComo } from "@/components/ver-como/faixa-ver-como";
import { SomenteLeituraProvider } from "@/components/ver-como/somente-leitura";
import { exigirMembro } from "@/lib/auth";
import { carregarPerfisMenu } from "@/lib/shell";
import { assinarUrls } from "@/lib/storage";
import type { Notificacao } from "@/lib/types";
import { verComoDisponivel } from "@/lib/ver-como";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const { supabase, membro, real, verComo, perfisIds } = await exigirMembro();

  const [perfis, naoLidas, urls, aprovadoras] = await Promise.all([
    carregarPerfisMenu(supabase, perfisIds),
    verComo
      ? supabase
          .rpc("notificacoes_de", { p_membro: membro.id, p_limite: 200 })
          .then(({ data }) => ((data as Notificacao[] | null) ?? []).filter((n) => !n.lida).length)
      : supabase
          .from("notificacoes")
          .select("id", { count: "exact", head: true })
          .eq("lida", false)
          .then(({ count }) => count ?? 0),
    assinarUrls(supabase, [membro.avatar_url]),
    // "Ver como" só existe para o admin de verdade (conferido aqui, no servidor).
    real.papel === "admin" && verComoDisponivel()
      ? supabase
          .from("membros")
          .select("id, nome")
          .eq("papel", "aprovadora")
          .eq("ativo", true)
          .order("nome")
          .then(({ data }) => (data ?? []) as { id: string; nome: string }[])
      : Promise.resolve([]),
  ]);

  const usuario: UsuarioShell = {
    id: membro.id,
    nome: membro.nome,
    papel: membro.papel,
    avatarUrl: membro.avatar_url ? (urls[membro.avatar_url] ?? null) : null,
  };
  const faixa = verComo ? ALTURA_FAIXA : 0;

  return (
    <SomenteLeituraProvider nome={verComo ? membro.nome : null}>
      <div className="min-h-dvh" style={{ "--faixa": `${faixa}px`, paddingTop: faixa } as React.CSSProperties}>
        {verComo && <FaixaVerComo nome={membro.nome} avatarUrl={usuario.avatarUrl} />}
        <a
          href="#conteudo"
          className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:rounded-[var(--radius-control)] focus:bg-surface-solid focus:px-4 focus:py-2"
        >
          Pular para o conteúdo
        </a>
        <Sidebar perfis={perfis} usuario={usuario} />
        <div className="flex min-h-dvh flex-col lg:pl-64">
          <Topbar
            usuario={usuario}
            naoLidas={naoLidas}
            verComo={verComo ? { alvoId: membro.id } : null}
            aprovadorasVerComo={verComo ? [] : aprovadoras}
          />
          <main id="conteudo" className="flex-1 px-4 pb-28 pt-6 sm:px-6 lg:px-8 lg:pb-10">
            {children}
          </main>
        </div>
        <MenuInferior perfis={perfis} usuario={usuario} naoLidas={naoLidas} />
      </div>
    </SomenteLeituraProvider>
  );
}
