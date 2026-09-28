"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { BellOff, CheckCheck } from "lucide-react";
import { EmptyState } from "@/components/ui/empty-state";
import { Button } from "@/components/ui/button";
import { GlassCard } from "@/components/ui/card";
import { formatarDataHora } from "@/lib/datas";
import { createClient } from "@/lib/supabase/client";
import type { Notificacao } from "@/lib/types";
import { cn } from "@/lib/utils";

export function ListaNotificacoes({ itens, usuarioId }: { itens: Notificacao[]; usuarioId: string }) {
  const router = useRouter();
  const [, iniciar] = useTransition();

  function marcar(ids: string[] | "todas") {
    iniciar(async () => {
      const q = createClient().from("notificacoes").update({ lida: true }).eq("destinatario_id", usuarioId);
      await (ids === "todas" ? q.eq("lida", false) : q.in("id", ids));
      router.refresh();
    });
  }

  if (itens.length === 0) return <EmptyState icone={BellOff} titulo="Nenhuma notificação" descricao="Quando algo acontecer nos seus posts, aparece aqui." />;

  return (
    <div className="flex flex-col gap-3">
      {itens.some((n) => !n.lida) && (
        <Button variant="secondary" className="self-end" onClick={() => marcar("todas")}>
          <CheckCheck /> Marcar todas como lidas
        </Button>
      )}
      <GlassCard className="divide-y divide-borda overflow-hidden">
        {itens.map((n) => (
          <div key={n.id} className={cn("flex gap-3 px-4 py-3", !n.lida && "bg-st-aguardando-bg/40")}>
            <span className={cn("mt-2 size-2 shrink-0 rounded-full", n.lida ? "bg-transparent" : "bg-azul-claro")} aria-hidden />
            <button
              type="button"
              className="min-w-0 flex-1 text-left"
              onClick={() => {
                if (!n.lida) marcar([n.id]);
                if (n.post_id) router.push(`/posts/${n.post_id}`);
              }}
            >
              <span className={cn("block text-sm", n.lida ? "text-texto" : "font-semibold text-azul-escuro")}>{n.titulo}</span>
              {n.corpo && <span className="block text-sm text-texto-2">{n.corpo}</span>}
              <span className="block text-xs text-texto-2">{formatarDataHora(n.created_at)}</span>
            </button>
            {!n.lida && (
              <Button variant="ghost" size="sm" onClick={() => marcar([n.id])}>
                Marcar como lida
              </Button>
            )}
          </div>
        ))}
      </GlassCard>
    </div>
  );
}
