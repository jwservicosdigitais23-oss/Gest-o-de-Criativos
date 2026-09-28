"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  DndContext,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  arrayMove,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { ArchiveRestore, GripVertical, Pencil, Plus, Trash2, ExternalLink } from "lucide-react";
import { toast } from "sonner";
import { arquivarPerfil, reordenarPerfis } from "@/app/(app)/configuracoes/actions";
import { Avatar, PilhaAvatares } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { GlassCard } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { ModalExcluirPerfil } from "./modal-excluir-perfil";
import { ModalPerfil } from "./modal-perfil";
import type { MembroConfig, PerfilConfig } from "./tipos";

function LinhaPerfil({
  perfil,
  membros,
  onEditar,
  onExcluir,
}: {
  perfil: PerfilConfig;
  membros: Map<string, MembroConfig>;
  onEditar: () => void;
  onExcluir: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: perfil.id });
  const aprovadoras = perfil.aprovadoras.map((id) => membros.get(id)).filter(Boolean) as MembroConfig[];
  return (
    <tr
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={cn("border-t border-borda bg-surface-solid", isDragging && "relative z-10 shadow-lg")}
    >
      <td className="w-10 pl-3">
        <button
          type="button"
          className="flex size-9 cursor-grab items-center justify-center rounded-[calc(var(--radius-control)-4px)] text-texto-2 hover:bg-fundo active:cursor-grabbing"
          aria-label={`Reordenar ${perfil.nome}`}
          {...attributes}
          {...listeners}
        >
          <GripVertical className="size-4" />
        </button>
      </td>
      <td className="py-3 pr-4">
        <div className="flex items-center gap-3">
          <Avatar nome={perfil.nome} src={perfil.avatarSrc} tamanho={36} />
          <div className="min-w-0">
            <p className="truncate font-semibold text-azul-escuro">{perfil.nome}</p>
            {perfil.linkedin_url && (
              <a href={perfil.linkedin_url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-xs text-azul-medio hover:underline">
                <ExternalLink className="size-3" /> LinkedIn
              </a>
            )}
          </div>
        </div>
      </td>
      <td className="hidden px-4 text-sm md:table-cell">{perfil.tipo === "empresa" ? "Empresa" : "Pessoal"}</td>
      <td className="hidden px-4 md:table-cell">
        <PilhaAvatares pessoas={aprovadoras.map((a) => ({ nome: a.nome, src: a.avatarSrc }))} />
      </td>
      <td className="hidden px-4 text-sm lg:table-cell">
        {perfil.modo_aprovacao === "todas" ? "Todas precisam aprovar" : "Qualquer uma aprova"}
      </td>
      <td className="hidden px-4 text-sm sm:table-cell">{perfil.totalPosts}</td>
      <td className="px-3 text-right">
        <div className="flex justify-end gap-1">
          <Button variant="ghost" size="icon" onClick={onEditar} aria-label={`Editar ${perfil.nome}`}>
            <Pencil />
          </Button>
          <Button variant="ghost" size="icon" onClick={onExcluir} aria-label={`Excluir ${perfil.nome}`} className="text-vermelho">
            <Trash2 />
          </Button>
        </div>
      </td>
    </tr>
  );
}

export function AbaPerfis({ perfis, membros }: { perfis: PerfilConfig[]; membros: MembroConfig[] }) {
  const router = useRouter();
  const ativos = perfis.filter((p) => !p.arquivado);
  const arquivados = perfis.filter((p) => p.arquivado);
  const [ordem, setOrdem] = useState(ativos);
  const [modal, setModal] = useState<{ aberto: boolean; perfil: PerfilConfig | null }>({ aberto: false, perfil: null });
  const [excluindo, setExcluindo] = useState<PerfilConfig | null>(null);
  const [, iniciar] = useTransition();
  const mapaMembros = new Map(membros.map((m) => [m.id, m]));
  const aprovadorasDisponiveis = membros.filter((m) => m.papel === "aprovadora");

  // eslint-disable-next-line react-hooks/set-state-in-effect -- sincroniza após router.refresh()
  useEffect(() => setOrdem(perfis.filter((p) => !p.arquivado)), [perfis]);

  const sensores = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  function aoSoltar(e: DragEndEvent) {
    if (!e.over || e.active.id === e.over.id) return;
    const de = ordem.findIndex((p) => p.id === e.active.id);
    const para = ordem.findIndex((p) => p.id === e.over!.id);
    const nova = arrayMove(ordem, de, para);
    setOrdem(nova);
    iniciar(async () => {
      const r = await reordenarPerfis(nova.map((p) => p.id));
      if (!r.ok) {
        toast.error(r.erro);
        setOrdem(ordem);
      } else {
        toast.success("Ordem da sidebar atualizada");
        router.refresh();
      }
    });
  }

  function reativar(p: PerfilConfig) {
    iniciar(async () => {
      const r = await arquivarPerfil(p.id, false);
      if (!r.ok) {
        toast.error(r.erro);
        return;
      }
      toast.success("Perfil reativado");
      router.refresh();
    });
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm text-texto-2">Arraste para definir a ordem dos perfis na sidebar.</p>
        <Button onClick={() => setModal({ aberto: true, perfil: null })}>
          <Plus /> Novo perfil
        </Button>
      </div>
      <GlassCard className="overflow-hidden">
        <table className="w-full text-left">
          <thead className="bg-fundo">
            <tr className="rotulo text-texto-2">
              <th className="w-10" aria-label="Ordem" />
              <th className="py-3 pr-4">Perfil</th>
              <th className="hidden px-4 md:table-cell">Tipo</th>
              <th className="hidden px-4 md:table-cell">Aprovadoras</th>
              <th className="hidden px-4 lg:table-cell">Modo</th>
              <th className="hidden px-4 sm:table-cell">Posts</th>
              <th className="px-3 text-right">Ações</th>
            </tr>
          </thead>
          <DndContext sensors={sensores} collisionDetection={closestCenter} onDragEnd={aoSoltar}>
            <SortableContext items={ordem.map((p) => p.id)} strategy={verticalListSortingStrategy}>
              <tbody>
                {ordem.map((p) => (
                  <LinhaPerfil
                    key={p.id}
                    perfil={p}
                    membros={mapaMembros}
                    onEditar={() => setModal({ aberto: true, perfil: p })}
                    onExcluir={() => setExcluindo(p)}
                  />
                ))}
                {ordem.length === 0 && (
                  <tr>
                    <td colSpan={7} className="px-4 py-10 text-center text-sm text-texto-2">
                      Nenhum perfil ativo.
                    </td>
                  </tr>
                )}
              </tbody>
            </SortableContext>
          </DndContext>
        </table>
      </GlassCard>

      {arquivados.length > 0 && (
        <div className="flex flex-col gap-2">
          <h3 className="rotulo text-texto-2">Arquivados</h3>
          <GlassCard className="divide-y divide-borda">
            {arquivados.map((p) => (
              <div key={p.id} className="flex items-center gap-3 px-4 py-3">
                <Avatar nome={p.nome} src={p.avatarSrc} tamanho={30} className="opacity-60" />
                <span className="flex-1 text-sm text-texto-2">
                  {p.nome} · {p.totalPosts} post(s)
                </span>
                <Button variant="secondary" size="sm" onClick={() => reativar(p)}>
                  <ArchiveRestore /> Reativar
                </Button>
                <Button variant="ghost" size="icon" className="text-vermelho" onClick={() => setExcluindo(p)} aria-label={`Excluir ${p.nome}`}>
                  <Trash2 />
                </Button>
              </div>
            ))}
          </GlassCard>
        </div>
      )}

      {modal.aberto && (
        <ModalPerfil
          key={modal.perfil?.id ?? "novo"}
          aberto
          onOpenChange={(v) => setModal((m) => ({ ...m, aberto: v }))}
          perfil={modal.perfil}
          aprovadorasDisponiveis={aprovadorasDisponiveis}
        />
      )}
      <ModalExcluirPerfil perfil={excluindo} onOpenChange={(v) => !v && setExcluindo(null)} />
    </div>
  );
}
