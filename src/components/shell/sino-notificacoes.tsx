"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Bell, CheckCheck } from "lucide-react";
import { toast } from "sonner";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { tempoRelativo } from "@/lib/datas";
import { createClient } from "@/lib/supabase/client";
import type { Notificacao } from "@/lib/types";
import { cn } from "@/lib/utils";

/** Sino da topbar: contador e lista atualizam em tempo real (Supabase Realtime). */
export function SinoNotificacoes({ usuarioId, naoLidasIniciais }: { usuarioId: string; naoLidasIniciais: number }) {
  const router = useRouter();
  const [lista, setLista] = useState<Notificacao[]>([]);
  const [naoLidas, setNaoLidas] = useState(naoLidasIniciais);

  const carregar = useCallback(async () => {
    const supabase = createClient();
    const [{ data }, { count }] = await Promise.all([
      supabase.from("notificacoes").select("*").order("created_at", { ascending: false }).limit(15),
      supabase.from("notificacoes").select("id", { count: "exact", head: true }).eq("lida", false),
    ]);
    setLista((data as Notificacao[]) ?? []);
    setNaoLidas(count ?? 0);
  }, []);

  useEffect(() => {
    const supabase = createClient();
    // eslint-disable-next-line react-hooks/set-state-in-effect -- carga inicial vinda do Supabase
    void carregar();
    const canal = supabase
      .channel(`notificacoes:${usuarioId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "notificacoes", filter: `destinatario_id=eq.${usuarioId}` },
        (payload) => {
          if (payload.eventType === "INSERT") {
            const n = payload.new as Notificacao;
            toast(n.titulo, { description: n.corpo ?? undefined });
            router.refresh();
          }
          void carregar();
        },
      )
      .subscribe();
    return () => {
      void supabase.removeChannel(canal);
    };
  }, [usuarioId, carregar, router]);

  async function abrir(n: Notificacao) {
    if (!n.lida) {
      await createClient().from("notificacoes").update({ lida: true }).eq("id", n.id);
      void carregar();
    }
    if (n.post_id) router.push(`/posts/${n.post_id}`);
  }

  async function marcarTodas() {
    await createClient().from("notificacoes").update({ lida: true }).eq("lida", false).eq("destinatario_id", usuarioId);
    void carregar();
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        className="relative flex size-10 items-center justify-center rounded-[10px] text-texto hover:bg-fundo"
        aria-label={`Notificações${naoLidas ? ` (${naoLidas} não lidas)` : ""}`}
      >
        <Bell className="size-5" />
        {naoLidas > 0 && (
          <span className="absolute right-1.5 top-1.5 min-w-4 rounded-full bg-vermelho px-1 text-center text-[10px] font-bold leading-4 text-white">
            {naoLidas > 99 ? "99+" : naoLidas}
          </span>
        )}
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-[min(380px,calc(100vw-1rem))] p-0">
        <div className="flex items-center justify-between border-b border-borda px-4 py-3">
          <p className="font-bold text-azul-escuro">Notificações</p>
          {naoLidas > 0 && (
            <button type="button" onClick={marcarTodas} className="inline-flex items-center gap-1 text-xs font-semibold text-azul-medio hover:underline">
              <CheckCheck className="size-3.5" /> Marcar todas como lidas
            </button>
          )}
        </div>
        <div className="max-h-[60vh] overflow-y-auto p-1">
          {lista.length === 0 && <p className="px-4 py-8 text-center text-sm text-texto-2">Nenhuma notificação.</p>}
          {lista.map((n) => (
            <DropdownMenuItem key={n.id} onSelect={() => abrir(n)} className="items-start gap-3 py-2.5">
              <span className={cn("mt-1.5 size-2 shrink-0 rounded-full", n.lida ? "bg-transparent" : "bg-azul-claro")} aria-hidden />
              <span className="min-w-0 flex-1">
                <span className={cn("block text-sm", n.lida ? "text-texto" : "font-semibold text-azul-escuro")}>{n.titulo}</span>
                {n.corpo && <span className="line-clamp-2 block text-xs text-texto-2">{n.corpo}</span>}
                <span className="block text-[11px] text-texto-2">{tempoRelativo(n.created_at)}</span>
              </span>
            </DropdownMenuItem>
          ))}
        </div>
        <Link href="/notificacoes" className="block border-t border-borda px-4 py-2.5 text-center text-sm font-semibold text-azul-medio hover:bg-fundo">
          Ver todas
        </Link>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
