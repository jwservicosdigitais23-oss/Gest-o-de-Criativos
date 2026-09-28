"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { KeyRound, MailPlus, MoreHorizontal, Pencil, Power, RotateCw, UserPlus } from "lucide-react";
import { toast } from "sonner";
import { definirAtivo, enviarLinkRedefinicao, reenviarConvite } from "@/app/(app)/configuracoes/actions";
import { Avatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { GlassCard } from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ROTULO_STATUS, statusMembro, type StatusMembro } from "@/lib/acessos";
import { formatarDataHora } from "@/lib/datas";
import { cn } from "@/lib/utils";
import { ModalAprovadora } from "./modal-aprovadora";
import { ModalMembro } from "./modal-membro";
import { ModalNovaSenha } from "./modal-nova-senha";
import type { MembroConfig, PerfilConfig } from "./tipos";

const ESTILO_STATUS: Record<StatusMembro, string> = {
  pendente: "bg-st-revisao-bg text-st-revisao-text",
  ativa: "bg-st-aprovado-bg text-st-aprovado-text",
  desativada: "bg-st-rascunho-bg text-st-rascunho-text",
};

function rotuloStatus(m: MembroConfig) {
  const s = statusMembro(m);
  if (m.papel === "admin" && s !== "pendente") return s === "ativa" ? "Ativo" : "Desativado";
  return ROTULO_STATUS[s];
}

type Modal =
  | { tipo: "nova" }
  | { tipo: "editar"; membro: MembroConfig }
  | { tipo: "senha"; membro: MembroConfig }
  | null;

export function AbaMembros({
  membros,
  perfis,
  usuarioId,
  acaoExtra,
}: {
  membros: MembroConfig[];
  perfis: PerfilConfig[];
  usuarioId: string;
  /** Itens extras no menu de cada linha (ex.: "Ver como"). */
  acaoExtra?: (m: MembroConfig) => React.ReactNode;
}) {
  const router = useRouter();
  const [modal, setModal] = useState<Modal>(null);
  const [, iniciar] = useTransition();
  const nomePerfil = new Map(perfis.map((p) => [p.id, p.nome]));

  function acao(fn: () => Promise<{ ok: boolean; erro?: string }>, msg: string) {
    iniciar(async () => {
      const r = await fn();
      if (!r.ok) {
        toast.error(r.erro);
        return;
      }
      toast.success(msg);
      router.refresh();
    });
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-body text-text-muted">Quem tem acesso ao CRM e quais perfis cada aprovadora decide.</p>
        <Button onClick={() => setModal({ tipo: "nova" })}>
          <UserPlus /> Adicionar aprovadora
        </Button>
      </div>
      <GlassCard className="overflow-hidden">
        <table className="w-full text-left">
          <thead className="bg-bg-app-from">
            <tr className="rotulo text-text-muted">
              <th className="py-3 pl-4 pr-4">Membro</th>
              <th className="hidden px-4 lg:table-cell">Perfis vinculados</th>
              <th className="hidden px-4 sm:table-cell">Status</th>
              <th className="hidden px-4 xl:table-cell">Último acesso</th>
              <th className="px-3 text-right">Ações</th>
            </tr>
          </thead>
          <tbody>
            {membros.map((m) => {
              const status = statusMembro(m);
              const eu = m.id === usuarioId;
              return (
                <tr key={m.id} className={cn("border-t border-border", !m.ativo && "bg-bg-app-from/60")} data-testid={`membro-${m.email}`}>
                  <td className="py-3 pl-4 pr-4">
                    <div className="flex items-center gap-3">
                      <Avatar nome={m.nome} src={m.avatarSrc} size="md" className={cn(!m.ativo && "opacity-50")} />
                      <div className="min-w-0">
                        <p className="truncate font-semibold text-navy-900">
                          {m.nome} {eu && <span className="text-label font-normal text-text-muted">(você)</span>}
                        </p>
                        <p className="truncate text-label text-text-muted">
                          {m.papel === "admin" ? "Administrador" : "Aprovadora"} · {m.email}
                        </p>
                        <p className="mt-1 sm:hidden">
                          <span className={cn("rounded-full px-2 py-0.5 text-[11px] font-semibold", ESTILO_STATUS[status])}>{rotuloStatus(m)}</span>
                        </p>
                      </div>
                    </div>
                  </td>
                  <td className="hidden px-4 text-body lg:table-cell">
                    {m.papel === "admin" ? (
                      <span className="text-text-muted">Todos</span>
                    ) : m.perfis.length ? (
                      <div className="flex flex-wrap gap-1">
                        {m.perfis.map((p) => (
                          <span key={p} className="rounded-full bg-bg-app-from px-2 py-0.5 text-label font-medium text-navy-900">
                            {nomePerfil.get(p)}
                          </span>
                        ))}
                      </div>
                    ) : (
                      <span className="text-text-muted">Nenhum</span>
                    )}
                  </td>
                  <td className="hidden px-4 sm:table-cell">
                    <span className={cn("whitespace-nowrap rounded-full px-2.5 py-0.5 text-label font-semibold", ESTILO_STATUS[status])}>
                      {rotuloStatus(m)}
                    </span>
                  </td>
                  <td className="hidden px-4 text-body text-text-muted xl:table-cell">
                    {m.ultimo_acesso ? formatarDataHora(m.ultimo_acesso) : "Nunca acessou"}
                  </td>
                  <td className="px-3 text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" aria-label={`Ações para ${m.nome}`}>
                          <MoreHorizontal />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent>
                        {m.ativo && acaoExtra?.(m)}
                        <DropdownMenuItem onSelect={() => setModal({ tipo: "editar", membro: m })}>
                          <Pencil /> Editar perfis
                        </DropdownMenuItem>
                        {!eu && status === "pendente" && (
                          <DropdownMenuItem onSelect={() => acao(() => reenviarConvite(m.id), `Convite reenviado para ${m.email}`)}>
                            <MailPlus /> Reenviar convite
                          </DropdownMenuItem>
                        )}
                        {!eu && m.ativo && (
                          <DropdownMenuItem onSelect={() => setModal({ tipo: "senha", membro: m })}>
                            <KeyRound /> Gerar nova senha provisória
                          </DropdownMenuItem>
                        )}
                        {m.ativo && (
                          <DropdownMenuItem
                            onSelect={() => acao(() => enviarLinkRedefinicao(m.id), `Link de redefinição enviado para ${m.email}`)}
                          >
                            <RotateCw /> Enviar link de redefinição de senha
                          </DropdownMenuItem>
                        )}
                        {!eu && (
                          <DropdownMenuItem
                            onSelect={() => acao(() => definirAtivo(m.id, !m.ativo), m.ativo ? "Acesso desativado" : "Acesso reativado")}
                            className={m.ativo ? "text-danger" : undefined}
                          >
                            <Power /> {m.ativo ? "Desativar" : "Reativar"}
                          </DropdownMenuItem>
                        )}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </GlassCard>
      {modal?.tipo === "nova" && <ModalAprovadora perfis={perfis} onOpenChange={(v) => !v && setModal(null)} />}
      {modal?.tipo === "editar" && (
        <ModalMembro key={modal.membro.id} membro={modal.membro} perfis={perfis} onOpenChange={(v) => !v && setModal(null)} />
      )}
      {modal?.tipo === "senha" && <ModalNovaSenha membro={modal.membro} onOpenChange={(v) => !v && setModal(null)} />}
    </div>
  );
}
