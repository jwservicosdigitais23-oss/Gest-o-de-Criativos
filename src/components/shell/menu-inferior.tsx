"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Bell, CalendarDays, LayoutDashboard, Settings, Users, FileSpreadsheet } from "lucide-react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Avatar } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";
import type { PerfilMenu, UsuarioShell } from "./tipos";

/** No celular a sidebar vira um menu inferior: Painel, Perfis, Calendário e Notificações. */
export function MenuInferior({
  perfis,
  usuario,
  naoLidas,
}: {
  perfis: PerfilMenu[];
  usuario: UsuarioShell;
  naoLidas: number;
}) {
  const pathname = usePathname();
  const [perfisAberto, setPerfisAberto] = useState(false);
  const aguardandoTotal = perfis.reduce((s, p) => s + p.aguardando, 0);

  const item = (ativo: boolean) =>
    cn(
      "relative flex flex-1 flex-col items-center justify-center gap-0.5 py-2 text-xs font-semibold",
      ativo ? "text-azul-claro" : "text-white/75",
    );

  return (
    <>
      <nav
        className="fixed inset-x-0 bottom-0 z-30 flex border-t border-white/10 bg-azul-escuro pb-[env(safe-area-inset-bottom)] lg:hidden"
        aria-label="Menu principal"
      >
        <Link href="/" className={item(pathname === "/")} aria-current={pathname === "/" ? "page" : undefined}>
          <LayoutDashboard className="size-5" aria-hidden /> Painel
        </Link>
        <button type="button" className={item(pathname.startsWith("/perfis"))} onClick={() => setPerfisAberto(true)}>
          <Users className="size-5" aria-hidden /> Perfis
          {aguardandoTotal > 0 && (
            <span className="absolute right-[calc(50%-20px)] top-1 rounded-full bg-azul-claro px-1 text-xs font-bold text-azul-escuro">
              {aguardandoTotal}
            </span>
          )}
        </button>
        <Link href="/calendario" className={item(pathname.startsWith("/calendario"))}>
          <CalendarDays className="size-5" aria-hidden /> Calendário
        </Link>
        <Link href="/notificacoes" className={item(pathname.startsWith("/notificacoes"))}>
          <Bell className="size-5" aria-hidden /> Notificações
          {naoLidas > 0 && (
            <span className="absolute right-[calc(50%-22px)] top-1 rounded-full bg-vermelho px-1 text-xs font-bold text-white">
              {naoLidas}
            </span>
          )}
        </Link>
      </nav>
      <Dialog open={perfisAberto} onOpenChange={setPerfisAberto}>
        <DialogContent titulo="Perfis" telaCheiaNoCelular>
          <ul className="flex flex-col gap-1">
            {perfis.map((p) => (
              <li key={p.id}>
                <Link
                  href={`/perfis/${p.id}`}
                  onClick={() => setPerfisAberto(false)}
                  className="flex min-h-12 items-center gap-3 rounded-[var(--radius-control)] px-3 hover:bg-fundo"
                >
                  <Avatar nome={p.nome} src={p.avatarUrl} tamanho={32} />
                  <span className="flex-1 font-semibold text-azul-escuro">{p.nome}</span>
                  {p.aguardando > 0 && (
                    <span className="rounded-full bg-st-aguardando-bg px-2 text-xs font-bold text-st-aguardando-text">
                      {p.aguardando} aguardando
                    </span>
                  )}
                </Link>
              </li>
            ))}
            {usuario.papel === "admin" && (
              <>
                <li className="mt-3 border-t border-borda pt-3">
                  <Link href="/importar" onClick={() => setPerfisAberto(false)} className="flex min-h-12 items-center gap-3 rounded-[var(--radius-control)] px-3 text-sm font-semibold text-azul-escuro hover:bg-fundo">
                    <FileSpreadsheet className="size-5 text-azul-medio" /> Importar cronograma
                  </Link>
                </li>
                <li>
                  <Link href="/configuracoes" onClick={() => setPerfisAberto(false)} className="flex min-h-12 items-center gap-3 rounded-[var(--radius-control)] px-3 text-sm font-semibold text-azul-escuro hover:bg-fundo">
                    <Settings className="size-5 text-azul-medio" /> Configurações
                  </Link>
                </li>
              </>
            )}
          </ul>
        </DialogContent>
      </Dialog>
    </>
  );
}
