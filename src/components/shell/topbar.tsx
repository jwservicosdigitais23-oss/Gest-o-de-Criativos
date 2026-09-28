import Link from "next/link";
import { Plus, Search } from "lucide-react";
import { Logo } from "@/components/brand/logo";
import { Button } from "@/components/ui/button";
import { MenuUsuario } from "./menu-usuario";
import { SinoNotificacoes } from "./sino-notificacoes";
import type { UsuarioShell } from "./tipos";

export function Topbar({ usuario, naoLidas }: { usuario: UsuarioShell; naoLidas: number }) {
  return (
    <header className="sticky top-0 z-20 border-b border-borda bg-white/95 backdrop-blur">
      <div className="flex h-16 items-center gap-3 px-4 sm:px-6">
        <Link href="/" className="lg:hidden" aria-label="Painel">
          <Logo className="min-w-0 scale-90 origin-left [&>span:first-child]:text-xl" />
        </Link>
        <form action="/busca" className="relative hidden max-w-md flex-1 md:block" role="search">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-texto-2" aria-hidden />
          <label htmlFor="busca-global" className="sr-only">Buscar</label>
          <input
            id="busca-global"
            name="q"
            type="search"
            placeholder="Buscar post, tema, legenda..."
            className="h-10 w-full rounded-[var(--radius-control)] border border-borda bg-fundo pl-9 pr-3 text-sm placeholder:text-texto-2 focus-visible:border-azul-claro focus-visible:bg-white"
          />
        </form>
        <div className="ml-auto flex items-center gap-2">
          <Link
            href="/busca"
            className="flex size-10 items-center justify-center rounded-[var(--radius-control)] text-texto hover:bg-fundo md:hidden"
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
          <SinoNotificacoes usuarioId={usuario.id} naoLidasIniciais={naoLidas} />
          <MenuUsuario usuario={usuario} />
        </div>
      </div>
    </header>
  );
}
