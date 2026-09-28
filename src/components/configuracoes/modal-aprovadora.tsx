"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { KeyRound, Mail, Send, UserPlus } from "lucide-react";
import { toast } from "sonner";
import { adicionarAprovadora } from "@/app/(app)/configuracoes/actions";
import { Avatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogFooter } from "@/components/ui/dialog";
import { Campo, Input } from "@/components/ui/input";
import type { FormaAcesso } from "@/lib/acessos";
import { ERRO_SENHA, senhaValida } from "@/lib/senha";
import { cn } from "@/lib/utils";
import { CampoSenhaProvisoria, SenhaUmaVez } from "./senha-provisoria";
import type { PerfilConfig } from "./tipos";

const FORMAS: { valor: FormaAcesso; titulo: string; texto: string; icone: typeof Mail; selo?: string }[] = [
  {
    valor: "convite",
    titulo: "Enviar convite por e-mail",
    texto: "Ela recebe o link, cria a própria senha e entra.",
    icone: Mail,
    selo: "Recomendado",
  },
  {
    valor: "senha",
    titulo: "Definir senha provisória",
    texto: "Você envia a senha por outro canal; ela troca no primeiro acesso.",
    icone: KeyRound,
  },
];

export function ModalAprovadora({ perfis, onOpenChange }: { perfis: PerfilConfig[]; onOpenChange: (v: boolean) => void }) {
  const router = useRouter();
  const [nome, setNome] = useState("");
  const [email, setEmail] = useState("");
  const [selecionados, setSelecionados] = useState<string[]>([]);
  const [forma, setForma] = useState<FormaAcesso>("convite");
  const [senha, setSenha] = useState("");
  const [erro, setErro] = useState<string | null>(null);
  const [senhaCriada, setSenhaCriada] = useState<string | null>(null);
  const [pendente, iniciar] = useTransition();

  function salvar(e: React.FormEvent) {
    e.preventDefault();
    setErro(null);
    if (!selecionados.length) return setErro("Marque pelo menos um perfil.");
    if (forma === "senha" && !senhaValida(senha)) return setErro(ERRO_SENHA);
    iniciar(async () => {
      const r = await adicionarAprovadora({ nome, email, perfis: selecionados, forma, senha: forma === "senha" ? senha : undefined });
      if (!r.ok) return setErro(r.erro);
      router.refresh();
      if (forma === "senha") {
        setSenhaCriada(senha);
        setSenha("");
        return;
      }
      toast.success(`Convite enviado para ${email}`);
      onOpenChange(false);
    });
  }

  function fechar(v: boolean) {
    if (!v) setSenhaCriada(null); // a senha some da memória ao fechar
    onOpenChange(v);
  }

  if (senhaCriada) {
    return (
      <Dialog open onOpenChange={fechar}>
        <DialogContent titulo="Senha provisória" telaCheiaNoCelular>
          <SenhaUmaVez nome={nome} senha={senhaCriada} />
          <DialogFooter>
            <Button onClick={() => fechar(false)}>Concluir</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open onOpenChange={fechar}>
      <DialogContent titulo="Adicionar aprovadora" descricao="Ela verá e decidirá apenas nos perfis marcados." telaCheiaNoCelular>
        <form onSubmit={salvar} className="flex flex-col gap-4" data-testid="form-aprovadora">
          <Campo label="Nome *" htmlFor="apr-nome">
            <Input id="apr-nome" value={nome} onChange={(e) => setNome(e.target.value)} placeholder="Ex.: Edna Queiroz" required />
          </Campo>
          <Campo label="E-mail *" htmlFor="apr-email">
            <Input id="apr-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="nome@empresa.com.br" required />
          </Campo>

          <fieldset className="flex flex-col gap-2">
            <legend className="mb-1.5 text-label font-semibold text-navy-900">Perfis que ela aprova *</legend>
            <div className="grid gap-2 sm:grid-cols-2">
              {perfis
                .filter((p) => !p.arquivado)
                .map((p) => {
                  const marcado = selecionados.includes(p.id);
                  return (
                    <label
                      key={p.id}
                      className={cn(
                        "transicao flex min-h-12 cursor-pointer items-center gap-3 rounded-[var(--radius-control)] border px-3",
                        marcado ? "border-blue-600 bg-st-aguardando-bg/50" : "border-border hover:bg-bg-app-from",
                      )}
                    >
                      <Checkbox
                        checked={marcado}
                        onChange={(e) => setSelecionados((s) => (e.target.checked ? [...s, p.id] : s.filter((x) => x !== p.id)))}
                      />
                      <Avatar nome={p.nome} src={p.avatarSrc} size="sm" />
                      <span className="text-body font-medium text-navy-900">{p.nome}</span>
                    </label>
                  );
                })}
            </div>
          </fieldset>

          <fieldset className="flex flex-col gap-2">
            <legend className="mb-1.5 text-label font-semibold text-navy-900">Forma de acesso</legend>
            <div role="radiogroup" className="grid gap-2 sm:grid-cols-2">
              {FORMAS.map(({ valor, titulo, texto, icone: Icone, selo }) => {
                const ativo = forma === valor;
                return (
                  <button
                    key={valor}
                    type="button"
                    role="radio"
                    aria-checked={ativo}
                    onClick={() => setForma(valor)}
                    className={cn(
                      "transicao relative flex flex-col gap-1.5 rounded-[var(--radius-control)] border p-3 text-left",
                      ativo ? "border-blue-600 bg-st-aguardando-bg/50 shadow-card" : "border-border hover:bg-bg-app-from",
                    )}
                  >
                    <span className="flex items-center gap-2">
                      <span
                        className={cn(
                          "flex size-8 items-center justify-center rounded-lg",
                          ativo ? "bg-gradiente-primario text-white" : "bg-bg-app-from text-blue-600",
                        )}
                      >
                        <Icone className="size-4" aria-hidden />
                      </span>
                      <span className="text-body font-bold text-navy-900">{titulo}</span>
                    </span>
                    <span className="text-label text-text-muted">{texto}</span>
                    {selo && (
                      <span className="absolute right-2 top-2 rounded-full bg-st-aprovado-bg px-2 py-0.5 text-[11px] font-bold text-st-aprovado-text">
                        {selo}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </fieldset>

          {forma === "senha" && <CampoSenhaProvisoria valor={senha} onChange={setSenha} />}

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
              {forma === "convite" ? <Send /> : <UserPlus />}
              {forma === "convite" ? "Enviar convite" : "Criar acesso"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
