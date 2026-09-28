"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ArrowRight, CalendarDays, CheckCheck, FileSpreadsheet, Hourglass, LayoutGrid, Settings } from "lucide-react";
import { Logo } from "@/components/brand/logo";
import { Avatar } from "@/components/ui/avatar";
import { NavItem } from "@/components/ui/nav-item";
import type { PerfilMenu, UsuarioShell } from "./tipos";

function Secao({ titulo, children }: { titulo: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1">
      <p className="rotulo px-3 pb-1 text-white/60">{titulo}</p>
      {children}
    </div>
  );
}

/** Cartão do rodapé: resumo do que espera aprovação. */
function CartaoResumo({ aguardando }: { aguardando: number }) {
  const emDia = aguardando === 0;
  const Icone = emDia ? CheckCheck : Hourglass;
  return (
    <Link
      href="/"
      className="transicao group relative mx-3 mb-4 block overflow-hidden rounded-[var(--radius-card)] border border-white/15 bg-white/10 p-4 hover:bg-white/15"
    >
      <span
        className="absolute -right-6 -top-6 size-24 rounded-full bg-cyan-400/25 blur-2xl"
        aria-hidden
      />
      <span className="relative flex size-10 items-center justify-center rounded-[var(--radius-control)] bg-gradiente-primario text-white shadow-card">
        <Icone className="size-5" aria-hidden />
      </span>
      <span className="relative mt-3 flex items-center justify-between gap-2 text-body font-bold text-white">
        {emDia ? "Criativos em dia" : `${aguardando} aguardando aprovação`}
        <ArrowRight className="transicao size-4 text-cyan-400 group-hover:translate-x-0.5" aria-hidden />
      </span>
      <span className="relative mt-0.5 block text-label text-white/70">
        {emDia ? "Nada esperando decisão agora." : "Veja o que precisa de atenção."}
      </span>
    </Link>
  );
}

export function Sidebar({ perfis, usuario }: { perfis: PerfilMenu[]; usuario: UsuarioShell }) {
  const pathname = usePathname();
  const admin = usuario.papel === "admin";
  const ativo = (href: string) => (href === "/" ? pathname === "/" : pathname.startsWith(href));
  const aguardandoTotal = perfis.reduce((s, p) => s + p.aguardando, 0);

  return (
    <aside className="bg-gradiente-sidebar fixed bottom-0 left-0 top-[var(--faixa,0px)] z-30 hidden w-64 flex-col shadow-elevated lg:flex">
      <div className="px-6 pb-6 pt-7">
        <Link href="/" aria-label="Painel" className="inline-block rounded-[var(--radius-control)]">
          <Logo variante="branco" />
        </Link>
      </div>
      <nav className="flex flex-1 flex-col gap-6 overflow-y-auto px-3 pb-6" aria-label="Menu principal">
        <Secao titulo="Principal">
          <NavItem href="/" icone={LayoutGrid} rotulo="Painel" ativo={ativo("/")} />
        </Secao>
        <Secao titulo="Perfis">
          {perfis.length === 0 && <p className="px-3 text-label text-white/60">Nenhum perfil liberado.</p>}
          {perfis.map((p) => (
            <NavItem
              key={p.id}
              href={`/perfis/${p.id}`}
              prefixo={<Avatar nome={p.nome} src={p.avatarUrl} size="sm" className="ring-1 ring-white/30" />}
              rotulo={p.nome}
              contador={p.aguardando}
              ativo={ativo(`/perfis/${p.id}`)}
            />
          ))}
        </Secao>
        <Secao titulo="Planejamento">
          <NavItem href="/calendario" icone={CalendarDays} rotulo="Calendário" ativo={ativo("/calendario")} />
          {admin && <NavItem href="/importar" icone={FileSpreadsheet} rotulo="Importar cronograma" ativo={ativo("/importar")} />}
        </Secao>
        {admin && (
          <Secao titulo="Sistema">
            <NavItem href="/configuracoes" icone={Settings} rotulo="Configurações" ativo={ativo("/configuracoes")} />
          </Secao>
        )}
      </nav>
      <CartaoResumo aguardando={aguardandoTotal} />
    </aside>
  );
}
