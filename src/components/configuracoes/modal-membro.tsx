"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { editarMembro } from "@/app/(app)/configuracoes/actions";
import { Avatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogFooter } from "@/components/ui/dialog";
import { Campo, Input, Select } from "@/components/ui/input";
import type { Papel } from "@/lib/types";
import type { MembroConfig, PerfilConfig } from "./tipos";

export function ModalMembro({
  membro,
  perfis,
  onOpenChange,
}: {
  membro: MembroConfig;
  perfis: PerfilConfig[];
  onOpenChange: (v: boolean) => void;
}) {
  const router = useRouter();
  const [nome, setNome] = useState(membro.nome ?? "");
  const [email, setEmail] = useState(membro.email ?? "");
  const [papel, setPapel] = useState<Papel>(membro.papel ?? "aprovadora");
  const [selecionados, setSelecionados] = useState<string[]>(membro.perfis ?? []);
  const [erro, setErro] = useState<string | null>(null);
  const [pendente, iniciar] = useTransition();

  function salvar(e: React.FormEvent) {
    e.preventDefault();
    setErro(null);
    iniciar(async () => {
      const r = await editarMembro({ id: membro.id, nome, papel, perfis: selecionados });
      if (!r.ok) return setErro(r.erro);
      toast.success("Membro atualizado");
      onOpenChange(false);
      router.refresh();
    });
  }

  return (
    <Dialog open onOpenChange={onOpenChange}>
      <DialogContent
        titulo="Editar membro"
        telaCheiaNoCelular
      >
        <form onSubmit={salvar} className="flex flex-col gap-4">
          <Campo label="Nome *" htmlFor="membro-nome">
            <Input id="membro-nome" value={nome} onChange={(e) => setNome(e.target.value)} required />
          </Campo>
          <Campo label="E-mail *" htmlFor="membro-email">
            <Input
              id="membro-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              disabled
            />
          </Campo>
          <Campo label="Papel" htmlFor="membro-papel">
            <Select id="membro-papel" value={papel} onChange={(e) => setPapel(e.target.value as Papel)}>
              <option value="aprovadora">Aprovadora</option>
              <option value="admin">Administrador</option>
            </Select>
          </Campo>
          {papel === "aprovadora" ? (
            <fieldset className="flex flex-col gap-2">
              <legend className="mb-1.5 text-sm font-semibold text-azul-escuro">Perfis que aprova</legend>
              {perfis
                .filter((p) => !p.arquivado)
                .map((p) => (
                  <label key={p.id} className="flex min-h-11 cursor-pointer items-center gap-3 rounded-[var(--radius-control)] border border-borda px-3 hover:bg-fundo">
                    <Checkbox
                      checked={selecionados.includes(p.id)}
                      onChange={(e) =>
                        setSelecionados((s) => (e.target.checked ? [...s, p.id] : s.filter((x) => x !== p.id)))
                      }
                    />
                    <Avatar nome={p.nome} src={p.avatarSrc} tamanho={26} />
                    <span className="text-sm font-medium">{p.nome}</span>
                  </label>
                ))}
            </fieldset>
          ) : (
            <p className="rounded-[var(--radius-control)] bg-fundo px-3 py-2 text-sm text-texto-2">
              O administrador vê e gerencia todos os perfis.
            </p>
          )}
          {erro && <p role="alert" className="text-sm text-vermelho">{erro}</p>}
          <DialogFooter>
            <Button type="button" variant="secondary" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={pendente}>
              {pendente && <Loader2 className="animate-spin" />}
              Salvar
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
