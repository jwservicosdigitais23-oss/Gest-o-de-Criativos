"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { ChevronDown, LogOut, UserRound } from "lucide-react";
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

export function MenuUsuario({ usuario }: { usuario: UsuarioShell }) {
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
        <DropdownMenuSeparator />
        <DropdownMenuItem onSelect={sair}>
          <LogOut /> Sair
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
