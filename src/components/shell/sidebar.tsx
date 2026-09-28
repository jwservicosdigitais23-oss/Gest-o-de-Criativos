"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { CalendarDays, FileSpreadsheet, LayoutDashboard, Settings } from "lucide-react";
import { Logo } from "@/components/brand/logo";
import { Avatar } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";
import type { PerfilMenu, UsuarioShell } from "./tipos";

function ItemMenu({
  href,
  ativo,
  children,
}: {
  href: string;
  ativo: boolean;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      aria-current={ativo ? "page" : undefined}
      className={cn(
        "relative flex items-center gap-3 rounded-[var(--radius-control)] px-3 py-2 text-sm font-medium transition-colors [&>svg]:size-5",
        ativo ? "bg-white/10 text-azul-claro" : "text-white/80 hover:bg-white/5 hover:text-white",
      )}
    >
      {ativo && <span className="absolute inset-y-1.5 -left-3 w-1 rounded-r bg-azul-claro" aria-hidden />}
      {children}
    </Link>
  );
}

function Secao({ titulo, children }: { titulo: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1">
      <p className="rotulo px-3 pb-1 text-white/45">{titulo}</p>
      {children}
    </div>
  );
}

export function Sidebar({ perfis, usuario }: { perfis: PerfilMenu[]; usuario: UsuarioShell }) {
  const pathname = usePathname();
  const admin = usuario.papel === "admin";
  const ativo = (href: string) => (href === "/" ? pathname === "/" : pathname.startsWith(href));

  return (
    <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 flex-col bg-gradiente-sidebar lg:flex">
      <div className="px-6 pb-6 pt-7">
        <Link href="/" aria-label="Painel">
          <Logo variante="branco" />
        </Link>
      </div>
      <nav className="flex flex-1 flex-col gap-6 overflow-y-auto px-3 pb-6" aria-label="Menu principal">
        <Secao titulo="Principal">
          <ItemMenu href="/" ativo={ativo("/")}>
            <LayoutDashboard aria-hidden /> Painel
          </ItemMenu>
        </Secao>
        <Secao titulo="Perfis">
          {perfis.length === 0 && <p className="px-3 text-xs text-white/50">Nenhum perfil liberado.</p>}
          {perfis.map((p) => (
            <ItemMenu key={p.id} href={`/perfis/${p.id}`} ativo={ativo(`/perfis/${p.id}`)}>
              <Avatar nome={p.nome} src={p.avatarUrl} tamanho={24} className="ring-0" />
              <span className="flex-1 truncate">{p.nome}</span>
              {p.aguardando > 0 && (
                <span
                  className="rounded-full bg-azul-claro px-1.5 text-xs font-bold text-azul-escuro"
                  aria-label={`${p.aguardando} aguardando aprovação`}
                >
                  {p.aguardando}
                </span>
              )}
            </ItemMenu>
          ))}
        </Secao>
        <Secao titulo="Planejamento">
          <ItemMenu href="/calendario" ativo={ativo("/calendario")}>
            <CalendarDays aria-hidden /> Calendário
          </ItemMenu>
          {admin && (
            <ItemMenu href="/importar" ativo={ativo("/importar")}>
              <FileSpreadsheet aria-hidden /> Importar cronograma
            </ItemMenu>
          )}
        </Secao>
        {admin && (
          <Secao titulo="Sistema">
            <ItemMenu href="/configuracoes" ativo={ativo("/configuracoes")}>
              <Settings aria-hidden /> Configurações
            </ItemMenu>
          </Secao>
        )}
      </nav>
    </aside>
  );
}
