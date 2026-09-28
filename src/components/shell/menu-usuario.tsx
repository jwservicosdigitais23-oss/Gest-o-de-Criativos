"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { ChevronDown, Eye, EyeOff, LogOut, UserRound } from "lucide-react";
import { iniciarVerComo, sairVerComo } from "@/app/ver-como/actions";
import { Avatar } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { createClient } from "@/lib/supabase/client";
import type { UsuarioShell } from "./tipos";

export function MenuUsuario({
  usuario,
  verComo = false,
  aprovadorasVerComo = [],
}: {
  usuario: UsuarioShell;
  verComo?: boolean;
  /** Preenchido pelo servidor só quando quem está logado é admin. */
  aprovadorasVerComo?: { id: string; nome: string }[];
}) {
  const router = useRouter();
  const papel = usuario.papel === "admin" ? "Administrador" : "Aprovadora";

  async function sair() {
    await createClient().auth.signOut();
    router.replace("/login");
    router.refresh();
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        className="transicao flex items-center gap-2 rounded-full p-1 pr-2 hover:bg-bg-app-from"
        aria-label="Menu do usuário"
      >
        <Avatar nome={usuario.nome} src={usuario.avatarUrl} size="md" className="ring-0" />
        <span className="hidden text-left leading-tight sm:block">
          <span className="block max-w-36 truncate text-body font-semibold text-navy-900">{usuario.nome}</span>
          <span className="block text-label text-text-muted">{papel}</span>
        </span>
        <ChevronDown className="hidden size-4 text-texto-2 sm:block" aria-hidden />
      </DropdownMenuTrigger>
      <DropdownMenuContent>
        <DropdownMenuLabel>
          <span className="block font-semibold text-azul-escuro">{usuario.nome}</span>
          {papel}
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild>
          <Link href="/minha-conta">
            <UserRound /> Minha conta
          </Link>
        </DropdownMenuItem>
        {aprovadorasVerComo.length > 0 && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuLabel>Ver o CRM como…</DropdownMenuLabel>
            {aprovadorasVerComo.map((a) => (
              <DropdownMenuItem key={a.id} onSelect={() => void iniciarVerComo(a.id)} data-testid="item-ver-como">
                <Eye /> Ver como {a.nome}
              </DropdownMenuItem>
            ))}
          </>
        )}
        <DropdownMenuSeparator />
        {verComo ? (
          <DropdownMenuItem onSelect={() => void sairVerComo("/configuracoes?aba=membros")}>
            <EyeOff /> Sair da visualização
          </DropdownMenuItem>
        ) : (
          <DropdownMenuItem onSelect={sair}>
            <LogOut /> Sair
          </DropdownMenuItem>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
