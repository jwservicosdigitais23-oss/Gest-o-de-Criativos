"use client";

import { useState, useTransition } from "react";
import { KeyRound } from "lucide-react";
import { gerarNovaSenhaProvisoria } from "@/app/(app)/configuracoes/actions";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter } from "@/components/ui/dialog";
import { ERRO_SENHA, gerarSenha, senhaValida } from "@/lib/senha";
import { CampoSenhaProvisoria, SenhaUmaVez } from "./senha-provisoria";
import type { MembroConfig } from "./tipos";

/** Gera uma nova senha provisória. A senha atual nunca é mostrada. */
export function ModalNovaSenha({ membro, onOpenChange }: { membro: MembroConfig; onOpenChange: (v: boolean) => void }) {
  const [senha, setSenha] = useState(() => gerarSenha());
  const [criada, setCriada] = useState<string | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [pendente, iniciar] = useTransition();

  function salvar(e: React.FormEvent) {
    e.preventDefault();
    setErro(null);
    if (!senhaValida(senha)) return setErro(ERRO_SENHA);
    iniciar(async () => {
      const r = await gerarNovaSenhaProvisoria(membro.id, senha);
      if (!r.ok) return setErro(r.erro);
      setCriada(senha);
      setSenha("");
    });
  }

  function fechar(v: boolean) {
    if (!v) setCriada(null);
    onOpenChange(v);
  }

  return (
    <Dialog open onOpenChange={fechar}>
      <DialogContent
        titulo={criada ? "Nova senha provisória" : `Nova senha provisória para ${membro.nome.split(" ")[0]}`}
        descricao={criada ? undefined : "A senha atual deixa de valer. Ela será obrigada a trocar ao entrar."}
      >
        {criada ? (
          <>
            <SenhaUmaVez nome={membro.nome} senha={criada} />
            <DialogFooter>
              <Button onClick={() => fechar(false)}>Concluir</Button>
            </DialogFooter>
          </>
        ) : (
          <form onSubmit={salvar} className="flex flex-col gap-4">
            <CampoSenhaProvisoria valor={senha} onChange={setSenha} id="nova-senha-provisoria" />
            {erro && (
              <p role="alert" className="text-body text-danger">
                {erro}
              </p>
            )}
            <DialogFooter>
              <Button type="button" variant="secondary" onClick={() => fechar(false)}>
                Cancelar
              </Button>
              <Button type="submit" carregando={pendente}>
                <KeyRound /> Definir senha
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
