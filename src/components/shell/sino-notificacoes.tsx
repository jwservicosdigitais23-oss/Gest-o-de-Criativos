"use client";

import Link from "next/link";
import { Bell } from "lucide-react";

/** Sino da topbar. A lista em tempo real chega no Prompt 5. */
export function SinoNotificacoes({ naoLidasIniciais }: { usuarioId: string; naoLidasIniciais: number }) {
  return (
    <Link
      href="/notificacoes"
      className="relative flex size-10 items-center justify-center rounded-[10px] text-texto hover:bg-fundo"
      aria-label={`Notificações${naoLidasIniciais ? ` (${naoLidasIniciais} não lidas)` : ""}`}
    >
      <Bell className="size-5" />
      {naoLidasIniciais > 0 && (
        <span className="absolute right-1.5 top-1.5 min-w-4 rounded-full bg-vermelho px-1 text-center text-[10px] font-bold leading-4 text-white">
          {naoLidasIniciais > 99 ? "99+" : naoLidasIniciais}
        </span>
      )}
    </Link>
  );
}
