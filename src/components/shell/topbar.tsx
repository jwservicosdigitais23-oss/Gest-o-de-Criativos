import Link from "next/link";
import { Plus, Search } from "lucide-react";
import { Logo } from "@/components/brand/logo";
import { Button } from "@/components/ui/button";
import { SearchField } from "@/components/ui/input";
import { MenuUsuario } from "./menu-usuario";
import { SinoNotificacoes } from "./sino-notificacoes";
import type { UsuarioShell } from "./tipos";

export function Topbar({
  usuario,
  naoLidas,
  verComo = null,
  aprovadorasVerComo = [],
}: {
  usuario: UsuarioShell;
  naoLidas: number;
  verComo?: { alvoId: string } | null;
  aprovadorasVerComo?: { id: string; nome: string }[];
}) {
  return (
    <header className="surface-glass sticky top-[var(--faixa,0px)] z-20 border-x-0 border-t-0">
      <div className="flex h-16 items-center gap-3 px-4 sm:px-6 lg:px-8">
        <Link href="/" className="rounded-[var(--radius-control)] lg:hidden" aria-label="Painel">
          <Logo tamanho="sm" className="min-w-0" />
        </Link>
        <form action="/busca" className="hidden max-w-md flex-1 md:block" role="search">
          <SearchField name="q" rotulo="Buscar" placeholder="Buscar post, tema, legenda..." />
        </form>
        <div className="ml-auto flex items-center gap-2 sm:gap-3">
          <Link
            href="/busca"
            className="transicao flex size-10 items-center justify-center rounded-[var(--radius-control)] text-text hover:bg-bg-app-from md:hidden"
            aria-label="Buscar"
          >
            <Search className="size-5" />
          </Link>
          {usuario.papel === "admin" && (
            <Button asChild className="hidden sm:inline-flex">
              <Link href="/posts/novo">
                <Plus /> Novo post
              </Link>
            </Button>
          )}
          <SinoNotificacoes usuarioId={usuario.id} naoLidasIniciais={naoLidas} somenteLeitura={Boolean(verComo)} />
          <MenuUsuario usuario={usuario} verComo={Boolean(verComo)} aprovadorasVerComo={aprovadorasVerComo} />
        </div>
      </div>
    </header>
  );
}
