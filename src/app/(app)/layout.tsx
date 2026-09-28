import { MenuInferior } from "@/components/shell/menu-inferior";
import { Sidebar } from "@/components/shell/sidebar";
import { Topbar } from "@/components/shell/topbar";
import type { UsuarioShell } from "@/components/shell/tipos";
import { exigirMembro } from "@/lib/auth";
import { carregarPerfisMenu } from "@/lib/shell";
import { assinarUrls } from "@/lib/storage";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const { supabase, membro } = await exigirMembro();

  const [perfis, { count: naoLidas }, urls] = await Promise.all([
    carregarPerfisMenu(supabase),
    supabase.from("notificacoes").select("id", { count: "exact", head: true }).eq("lida", false),
    assinarUrls(supabase, [membro.avatar_url]),
  ]);

  const usuario: UsuarioShell = {
    id: membro.id,
    nome: membro.nome,
    papel: membro.papel,
    avatarUrl: membro.avatar_url ? (urls[membro.avatar_url] ?? null) : null,
  };

  return (
    <div className="min-h-dvh">
      <a
        href="#conteudo"
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:rounded-[10px] focus:bg-white focus:px-4 focus:py-2"
      >
        Pular para o conteúdo
      </a>
      <Sidebar perfis={perfis} usuario={usuario} />
      <div className="flex min-h-dvh flex-col lg:pl-64">
        <Topbar usuario={usuario} naoLidas={naoLidas ?? 0} />
        <main id="conteudo" className="flex-1 px-4 pb-28 pt-6 sm:px-6 lg:px-8 lg:pb-10">
          {children}
        </main>
      </div>
      <MenuInferior perfis={perfis} usuario={usuario} naoLidas={naoLidas ?? 0} />
    </div>
  );
}
