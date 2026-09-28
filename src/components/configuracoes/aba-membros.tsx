"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { MailPlus, MoreHorizontal, Pencil, Power, RotateCw, UserPlus } from "lucide-react";
import { toast } from "sonner";
import { definirAtivo, reenviarConvite } from "@/app/(app)/configuracoes/actions";
import { Avatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { formatarDataHora } from "@/lib/datas";
import { cn } from "@/lib/utils";
import { ModalMembro } from "./modal-membro";
import type { MembroConfig, PerfilConfig } from "./tipos";

export function AbaMembros({
  membros,
  perfis,
  usuarioId,
}: {
  membros: MembroConfig[];
  perfis: PerfilConfig[];
  usuarioId: string;
}) {
  const router = useRouter();
  const [modal, setModal] = useState<{ aberto: boolean; membro: MembroConfig | null }>({ aberto: false, membro: null });
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
        <p className="text-sm text-texto-2">Quem tem acesso ao CRM e quais perfis cada aprovadora decide.</p>
        <Button onClick={() => setModal({ aberto: true, membro: null })}>
          <UserPlus /> Convidar membro
        </Button>
      </div>
      <Card className="overflow-hidden">
        <table className="w-full text-left">
          <thead className="bg-fundo">
            <tr className="rotulo text-texto-2">
              <th className="py-3 pl-4 pr-4">Membro</th>
              <th className="hidden px-4 md:table-cell">Papel</th>
              <th className="hidden px-4 lg:table-cell">Perfis vinculados</th>
              <th className="hidden px-4 sm:table-cell">Situação</th>
              <th className="hidden px-4 xl:table-cell">Último acesso</th>
              <th className="px-3 text-right">Ações</th>
            </tr>
          </thead>
          <tbody>
            {membros.map((m) => (
              <tr key={m.id} className={cn("border-t border-borda", !m.ativo && "bg-fundo/60")}>
                <td className="py-3 pl-4 pr-4">
                  <div className="flex items-center gap-3">
                    <Avatar nome={m.nome} src={m.avatarSrc} tamanho={36} className={cn(!m.ativo && "opacity-50")} />
                    <div className="min-w-0">
                      <p className="truncate font-semibold text-azul-escuro">
                        {m.nome} {m.id === usuarioId && <span className="text-xs font-normal text-texto-2">(você)</span>}
                      </p>
                      <p className="truncate text-xs text-texto-2">{m.email}</p>
                    </div>
                  </div>
                </td>
                <td className="hidden px-4 text-sm md:table-cell">{m.papel === "admin" ? "Administrador" : "Aprovadora"}</td>
                <td className="hidden px-4 text-sm lg:table-cell">
                  {m.papel === "admin" ? (
                    <span className="text-texto-2">Todos</span>
                  ) : m.perfis.length ? (
                    m.perfis.map((p) => nomePerfil.get(p)).filter(Boolean).join(", ")
                  ) : (
                    <span className="text-texto-2">Nenhum</span>
                  )}
                </td>
                <td className="hidden px-4 sm:table-cell">
                  <span
                    className={cn(
                      "rounded-full px-2.5 py-0.5 text-xs font-semibold",
                      m.ativo ? "bg-st-aprovado-bg text-st-aprovado-text" : "bg-st-rascunho-bg text-st-rascunho-text",
                    )}
                  >
                    {m.ativo ? "Ativo" : "Inativo"}
                  </span>
                </td>
                <td className="hidden px-4 text-sm text-texto-2 xl:table-cell">
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
                      <DropdownMenuItem onSelect={() => setModal({ aberto: true, membro: m })}>
                        <Pencil /> Editar papel e perfis
                      </DropdownMenuItem>
                      {!m.ultimo_acesso && (
                        <DropdownMenuItem onSelect={() => acao(() => reenviarConvite(m.id), `Convite reenviado para ${m.email}`)}>
                          <MailPlus /> Reenviar convite
                        </DropdownMenuItem>
                      )}
                      {m.ultimo_acesso && (
                        <DropdownMenuItem onSelect={() => acao(() => reenviarConvite(m.id), `Link de acesso enviado para ${m.email}`)}>
                          <RotateCw /> Enviar link de nova senha
                        </DropdownMenuItem>
                      )}
                      {m.id !== usuarioId && (
                        <DropdownMenuItem
                          onSelect={() =>
                            acao(() => definirAtivo(m.id, !m.ativo), m.ativo ? "Membro desativado" : "Membro reativado")
                          }
                          className={m.ativo ? "text-vermelho" : undefined}
                        >
                          <Power /> {m.ativo ? "Desativar" : "Reativar"}
                        </DropdownMenuItem>
                      )}
                    </DropdownMenuContent>
                  </DropdownMenu>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
      {modal.aberto && (
        <ModalMembro
          key={modal.membro?.id ?? "novo"}
          membro={modal.membro}
          perfis={perfis}
          onOpenChange={(v) => !v && setModal({ aberto: false, membro: null })}
        />
      )}
    </div>
  );
}
