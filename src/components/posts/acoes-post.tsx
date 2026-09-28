"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Archive, Check, Copy, CopyPlus, Download, Globe, Loader2, Pencil, Send, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { arquivarPost, duplicarPost, enviarParaAprovacao, excluirPost, marcarPublicado } from "@/app/(app)/posts/actions";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter } from "@/components/ui/dialog";
import { Campo, Input } from "@/components/ui/input";
import { podeEditar } from "@/lib/posts";
import type { StatusPost } from "@/lib/types";

export function BotaoCopiarLegenda({ legenda }: { legenda: string }) {
  const [copiado, setCopiado] = useState(false);
  return (
    <Button
      variant="secondary"
      className="w-full"
      onClick={async () => {
        await navigator.clipboard.writeText(legenda);
        setCopiado(true);
        toast.success("Legenda copiada");
        setTimeout(() => setCopiado(false), 2000);
      }}
      disabled={!legenda}
    >
      {copiado ? <Check /> : <Copy />} Copiar legenda
    </Button>
  );
}

export function ListaDownloads({ midias }: { midias: { id: string; nome: string; download: string | null }[] }) {
  const baixaveis = midias.filter((m) => m.download);
  if (baixaveis.length === 0) return null;
  if (baixaveis.length === 1) {
    return (
      <Button asChild variant="secondary" className="w-full">
        <a href={baixaveis[0]!.download!} download={baixaveis[0]!.nome}>
          <Download /> Baixar mídia
        </a>
      </Button>
    );
  }
  return (
    <details className="rounded-[10px] border border-borda">
      <summary className="flex h-10 cursor-pointer list-none items-center justify-center gap-2 text-sm font-semibold text-azul-escuro">
        <Download className="size-4" /> Baixar mídia ({baixaveis.length})
      </summary>
      <ul className="border-t border-borda p-2">
        {baixaveis.map((m) => (
          <li key={m.id}>
            <a href={m.download!} download={m.nome} className="block truncate rounded-md px-2 py-1.5 text-sm text-azul-medio hover:bg-fundo">
              {m.nome}
            </a>
          </li>
        ))}
      </ul>
    </details>
  );
}

export function AcoesAdmin({
  postId,
  status,
  temDecisoes,
  versao,
}: {
  postId: string;
  status: StatusPost;
  temDecisoes: boolean;
  versao: number;
}) {
  const router = useRouter();
  const [pendente, iniciar] = useTransition();
  const [publicarAberto, setPublicarAberto] = useState(false);
  const [excluirAberto, setExcluirAberto] = useState(false);
  const [link, setLink] = useState("");

  function executar(fn: () => Promise<{ ok: boolean; erro?: string }>, msg: string, depois?: () => void) {
    iniciar(async () => {
      const r = await fn();
      if (!r.ok) {
        toast.error(r.erro);
        return;
      }
      toast.success(msg);
      depois?.();
      router.refresh();
    });
  }

  return (
    <div className="flex flex-col gap-2">
      {status === "rascunho" && (
        <Button onClick={() => executar(() => enviarParaAprovacao(postId), "Post enviado para aprovação")} disabled={pendente}>
          {pendente ? <Loader2 className="animate-spin" /> : <Send />} Enviar para aprovação
        </Button>
      )}
      {status === "em_revisao" && (
        <>
          <Button asChild>
            <Link href={`/posts/${postId}/editar`}>
              <Pencil /> Ajustar
            </Link>
          </Button>
          <Button
            variant="secondary"
            onClick={() => executar(() => enviarParaAprovacao(postId), `Nova versão (v${versao + 1}) enviada para aprovação`)}
            disabled={pendente}
          >
            <Send /> Reenviar (v{versao + 1})
          </Button>
        </>
      )}
      {status === "aprovado" && (
        <Button onClick={() => setPublicarAberto(true)}>
          <Globe /> Marcar como publicado
        </Button>
      )}
      <div className="grid grid-cols-2 gap-2">
        {podeEditar(status) && status !== "em_revisao" && (
          <Button asChild variant="secondary">
            <Link href={`/posts/${postId}/editar`}>
              <Pencil /> Editar
            </Link>
          </Button>
        )}
        <Button
          variant="secondary"
          disabled={pendente}
          onClick={() =>
            executar(
              () => duplicarPost(postId),
              "Post duplicado como rascunho",
            )
          }
        >
          <CopyPlus /> Duplicar
        </Button>
        <Button variant="danger" onClick={() => setExcluirAberto(true)} disabled={pendente}>
          {temDecisoes ? <Archive /> : <Trash2 />} {temDecisoes ? "Arquivar" : "Excluir"}
        </Button>
      </div>

      <Dialog open={publicarAberto} onOpenChange={setPublicarAberto}>
        <DialogContent titulo="Marcar como publicado" descricao="Cole o link do post no LinkedIn.">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              executar(() => marcarPublicado(postId, link), "Post marcado como publicado", () => setPublicarAberto(false));
            }}
          >
            <Campo label="Link do post" htmlFor="link-publicado">
              <Input
                id="link-publicado"
                type="url"
                required
                placeholder="https://www.linkedin.com/feed/update/..."
                value={link}
                onChange={(e) => setLink(e.target.value)}
              />
            </Campo>
            <DialogFooter>
              <Button type="button" variant="secondary" onClick={() => setPublicarAberto(false)}>Cancelar</Button>
              <Button type="submit" disabled={pendente}>
                {pendente && <Loader2 className="animate-spin" />} Confirmar publicação
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={excluirAberto} onOpenChange={setExcluirAberto}>
        <DialogContent titulo={temDecisoes ? "Arquivar post?" : "Excluir post?"}>
          <p className="text-sm">
            {temDecisoes
              ? "Este post já tem decisões registradas, que não podem ser apagadas. Ele será arquivado: sai das listas, mas o histórico fica guardado."
              : "O post e suas mídias serão apagados. Esta ação não pode ser desfeita."}
          </p>
          <DialogFooter>
            <Button variant="secondary" onClick={() => setExcluirAberto(false)}>Cancelar</Button>
            <Button
              variant="reprovar"
              disabled={pendente}
              onClick={() =>
                executar(
                  () => (temDecisoes ? arquivarPost(postId) : excluirPost(postId)),
                  temDecisoes ? "Post arquivado" : "Post excluído",
                  () => {
                    setExcluirAberto(false);
                    if (!temDecisoes) router.push("/");
                  },
                )
              }
            >
              {pendente && <Loader2 className="animate-spin" />} {temDecisoes ? "Arquivar" : "Excluir"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
