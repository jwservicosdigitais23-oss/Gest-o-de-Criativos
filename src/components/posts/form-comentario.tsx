"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2, MessageSquare, Send } from "lucide-react";
import { toast } from "sonner";
import { comentar } from "@/app/(app)/posts/decisoes-actions";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/input";

export function FormComentario({
  postId,
  decisaoId,
  compacto = false,
}: {
  postId: string;
  decisaoId: string | null;
  compacto?: boolean;
}) {
  const router = useRouter();
  const [aberto, setAberto] = useState(!compacto);
  const [texto, setTexto] = useState("");
  const [pendente, iniciar] = useTransition();

  if (!aberto) {
    return (
      <button type="button" onClick={() => setAberto(true)} className="mt-2 inline-flex items-center gap-1 text-xs font-semibold text-azul-medio hover:underline">
        <MessageSquare className="size-3.5" /> Responder
      </button>
    );
  }

  return (
    <form
      className="mt-2 flex flex-col gap-2"
      onSubmit={(e) => {
        e.preventDefault();
        if (!texto.trim()) return;
        iniciar(async () => {
          const r = await comentar({ postId, texto, decisaoId });
          if (!r.ok) {
            toast.error(r.erro);
            return;
          }
          setTexto("");
          if (compacto) setAberto(false);
          toast.success("Comentário enviado");
          router.refresh();
        });
      }}
    >
      <label htmlFor={`comentario-${decisaoId ?? "geral"}`} className="sr-only">
        Comentário
      </label>
      <Textarea
        id={`comentario-${decisaoId ?? "geral"}`}
        value={texto}
        onChange={(e) => setTexto(e.target.value)}
        rows={compacto ? 2 : 3}
        placeholder={compacto ? "Responder a esta observação..." : "Escreva um comentário..."}
      />
      <div className="flex justify-end gap-2">
        {compacto && (
          <Button type="button" variant="ghost" size="sm" onClick={() => setAberto(false)}>
            Cancelar
          </Button>
        )}
        <Button type="submit" size="sm" disabled={pendente || !texto.trim()}>
          {pendente ? <Loader2 className="animate-spin" /> : <Send />} Comentar
        </Button>
      </div>
    </form>
  );
}
