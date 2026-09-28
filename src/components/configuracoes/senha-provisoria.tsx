"use client";

import { useState } from "react";
import { Check, Copy, KeyRound, MessageCircleWarning, Wand2 } from "lucide-react";
import { toast } from "sonner";
import { RegrasSenha } from "@/components/auth/regras-senha";
import { Button } from "@/components/ui/button";
import { Campo, PasswordInput } from "@/components/ui/input";
import { gerarSenha } from "@/lib/senha";

/** Campo da senha provisória com o botão "Gerar senha". */
export function CampoSenhaProvisoria({ valor, onChange, id = "senha-provisoria" }: { valor: string; onChange: (v: string) => void; id?: string }) {
  return (
    <Campo label="Senha provisória" htmlFor={id}>
      <div className="flex gap-2">
        <PasswordInput
          id={id}
          value={valor}
          onChange={(e) => onChange(e.target.value)}
          autoComplete="new-password"
          className="flex-1"
          required
        />
        <Button type="button" variant="secondary" onClick={() => onChange(gerarSenha())}>
          <Wand2 /> Gerar senha
        </Button>
      </div>
      <RegrasSenha senha={valor} className="mt-1" />
    </Campo>
  );
}

/**
 * Mostra a senha provisória UMA única vez (fica só na memória desta tela).
 * Ao fechar o modal, ela some e não pode ser recuperada.
 */
export function SenhaUmaVez({ nome, senha }: { nome: string; senha: string }) {
  const [copiada, setCopiada] = useState(false);
  async function copiar() {
    try {
      await navigator.clipboard.writeText(senha);
      setCopiada(true);
      toast.success("Senha copiada");
    } catch {
      toast.error("Não foi possível copiar. Selecione e copie manualmente.");
    }
  }
  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center gap-3">
        <span className="flex size-11 items-center justify-center rounded-[var(--radius-control)] bg-gradiente-primario text-white shadow-card">
          <KeyRound className="size-5" aria-hidden />
        </span>
        <div>
          <p className="text-card-title text-navy-900">Acesso de {nome.split(" ")[0]} criado</p>
          <p className="text-label text-text-muted">Esta senha aparece só agora. Depois de fechar, ninguém consegue vê-la de novo.</p>
        </div>
      </div>
      <div className="flex items-center gap-2 rounded-[var(--radius-control)] border border-blue-600/30 bg-st-aguardando-bg/60 p-2 pl-4">
        <code className="flex-1 select-all break-all font-mono text-lg font-bold tracking-wider text-navy-900" data-testid="senha-provisoria">
          {senha}
        </code>
        <Button type="button" onClick={copiar} size="sm">
          {copiada ? <Check /> : <Copy />} {copiada ? "Copiada" : "Copiar"}
        </Button>
      </div>
      <p className="flex gap-2 rounded-[var(--radius-control)] bg-st-revisao-bg px-3 py-2.5 text-body text-st-revisao-text">
        <MessageCircleWarning className="mt-0.5 size-4 shrink-0" aria-hidden />
        Envie por um canal separado (ex.: WhatsApp). Ela será obrigada a trocar no primeiro acesso.
      </p>
    </div>
  );
}
