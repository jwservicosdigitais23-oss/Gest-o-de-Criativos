"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Archive, Loader2, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { arquivarPerfil, excluirPerfil, excluirPerfilDefinitivo } from "@/app/(app)/configuracoes/actions";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter } from "@/components/ui/dialog";
import { Campo, Input } from "@/components/ui/input";
import type { PerfilConfig } from "./tipos";

export function ModalExcluirPerfil({
  perfil,
  onOpenChange,
}: {
  perfil: PerfilConfig | null;
  onOpenChange: (v: boolean) => void;
}) {
  const router = useRouter();
  const [confirmacao, setConfirmacao] = useState("");
  const [pendente, iniciar] = useTransition();
  if (!perfil) return null;
  const temPosts = perfil.totalPosts > 0;

  function executar(fn: () => Promise<{ ok: boolean; erro?: string }>, msg: string) {
    iniciar(async () => {
      const r = await fn();
      if (!r.ok) {
        toast.error(r.erro);
        return;
      }
      toast.success(msg);
      setConfirmacao("");
      onOpenChange(false);
      router.refresh();
    });
  }

  return (
    <Dialog open onOpenChange={onOpenChange}>
      <DialogContent titulo={`Excluir “${perfil.nome}”?`}>
        {!temPosts ? (
          <>
            <p className="text-sm">Este perfil não tem posts. A exclusão não pode ser desfeita.</p>
            <DialogFooter>
              <Button variant="secondary" onClick={() => onOpenChange(false)}>Cancelar</Button>
              <Button variant="reprovar" disabled={pendente} onClick={() => executar(() => excluirPerfil(perfil.id), "Perfil excluído")}>
                {pendente ? <Loader2 className="animate-spin" /> : <Trash2 />} Excluir
              </Button>
            </DialogFooter>
          </>
        ) : (
          <div className="flex flex-col gap-5">
            <div className="rounded-[var(--radius-control)] bg-st-aguardando-bg p-4">
              <p className="text-sm">
                Este perfil tem <strong>{perfil.totalPosts} post(s)</strong>. O recomendado é <strong>arquivar</strong>: ele some da
                sidebar e o histórico fica guardado.
              </p>
              <Button
                className="mt-3"
                disabled={pendente}
                onClick={() => executar(() => arquivarPerfil(perfil.id, true), "Perfil arquivado")}
              >
                <Archive /> Arquivar perfil
              </Button>
            </div>
            <div className="rounded-[var(--radius-control)] border border-[#fecaca] p-4">
              <p className="text-sm font-semibold text-vermelho">Exclusão definitiva</p>
              <p className="mt-1 text-sm text-texto-2">
                Apaga o perfil, todos os posts, mídias, decisões e comentários. Não pode ser desfeita.
              </p>
              <Campo label={<>Digite <strong>{perfil.nome}</strong> para confirmar</>} htmlFor="confirmar-nome" className="mt-3">
                <Input id="confirmar-nome" value={confirmacao} onChange={(e) => setConfirmacao(e.target.value)} autoComplete="off" />
              </Campo>
              <Button
                variant="reprovar"
                className="mt-3"
                disabled={pendente || confirmacao.trim() !== perfil.nome.trim()}
                onClick={() => executar(() => excluirPerfilDefinitivo(perfil.id, confirmacao), "Perfil excluído definitivamente")}
              >
                {pendente ? <Loader2 className="animate-spin" /> : <Trash2 />} Excluir definitivamente
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
