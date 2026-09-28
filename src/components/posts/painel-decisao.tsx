"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Check, Loader2, RotateCcw, X } from "lucide-react";
import { toast } from "sonner";
import { registrarDecisao } from "@/app/(app)/posts/decisoes-actions";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogFooter } from "@/components/ui/dialog";
import { Campo, Textarea } from "@/components/ui/input";
import { ITENS_REVISAO } from "@/lib/constantes";
import { cn } from "@/lib/utils";

type Tipo = "aprovado" | "revisar" | "reprovado";

const TITULOS: Record<Tipo, string> = {
  aprovado: "Aprovar este post?",
  revisar: "Pedir revisão",
  reprovado: "Reprovar este post?",
};

/** Botões Aprovar / Revisar / Reprovar da aprovadora. */
export function PainelDecisao({ postId, versao, fixoNoCelular = true }: { postId: string; versao: number; fixoNoCelular?: boolean }) {
  const router = useRouter();
  const [aberto, setAberto] = useState<Tipo | null>(null);
  const [observacao, setObservacao] = useState("");
  const [itens, setItens] = useState<string[]>([]);
  const [erro, setErro] = useState<string | null>(null);
  const [pendente, iniciar] = useTransition();

  function abrir(t: Tipo) {
    setObservacao("");
    setItens([]);
    setErro(null);
    setAberto(t);
  }

  function enviar() {
    if (!aberto) return;
    const obs = observacao.trim();
    if (aberto === "revisar" && obs.length < 10) return setErro("Descreva o que precisa mudar (mínimo de 10 caracteres).");
    if (aberto === "reprovado" && obs.length < 3) return setErro("Informe o motivo da reprovação.");
    iniciar(async () => {
      const r = await registrarDecisao({
        postId,
        decisao: aberto,
        observacao: obs,
        itens: itens as ("legenda" | "arte" | "cta" | "data" | "outro")[],
      });
      if (!r.ok) {
        setErro(r.erro);
        return;
      }
      toast.success(
        aberto === "aprovado" ? "Post aprovado" : aberto === "revisar" ? "Revisão enviada ao Jonathan" : "Post reprovado",
      );
      setAberto(null);
      router.refresh();
    });
  }

  const tamanho = observacao.trim().length;

  return (
    <>
      <div
        className={cn(
          "flex flex-col gap-2 sm:flex-row",
          fixoNoCelular &&
            "fixed inset-x-0 bottom-[calc(64px+env(safe-area-inset-bottom))] z-20 border-t border-borda bg-surface-solid p-3 shadow-[0_-4px_12px_rgb(0_31_77/0.08)] sm:static sm:border-0 sm:bg-transparent sm:p-0 sm:shadow-none lg:bottom-0",
        )}
      >
        <Button variant="aprovar" size="decisao" className="flex-1" onClick={() => abrir("aprovado")}>
          <Check /> Aprovar
        </Button>
        <div className="grid grid-cols-2 gap-2 sm:contents">
          <Button variant="revisar" size="decisao" className="flex-1" onClick={() => abrir("revisar")}>
            <RotateCcw /> Revisar
          </Button>
          <Button variant="reprovar" size="decisao" className="flex-1" onClick={() => abrir("reprovado")}>
            <X /> Reprovar
          </Button>
        </div>
      </div>

      <Dialog open={aberto !== null} onOpenChange={(v) => !v && setAberto(null)}>
        {aberto && (
          <DialogContent
            titulo={TITULOS[aberto]}
            descricao={
              aberto === "aprovado"
                ? `Sua aprovação fica registrada na versão v${versao}.`
                : aberto === "revisar"
                  ? `O post volta para o Jonathan ajustar. Sua observação fica registrada na v${versao}.`
                  : "A reprovação encerra o post. O Jonathan pode duplicá-lo como novo rascunho."
            }
            telaCheiaNoCelular={aberto === "revisar"}
          >
            <form
              onSubmit={(e) => {
                e.preventDefault();
                enviar();
              }}
              className="flex flex-col gap-4"
            >
              {aberto === "revisar" && (
                <fieldset>
                  <legend className="mb-2 text-sm font-semibold text-azul-escuro">O que precisa mudar? (opcional)</legend>
                  <div className="flex flex-wrap gap-2">
                    {ITENS_REVISAO.map((i) => (
                      <label
                        key={i.valor}
                        className={cn(
                          "flex min-h-11 cursor-pointer items-center gap-2 rounded-full border px-4 text-sm font-medium",
                          itens.includes(i.valor) ? "border-ambar bg-st-revisao-bg text-st-revisao-text" : "border-borda",
                        )}
                      >
                        <Checkbox
                          className="sr-only"
                          checked={itens.includes(i.valor)}
                          onChange={(e) =>
                            setItens((a) => (e.target.checked ? [...a, i.valor] : a.filter((x) => x !== i.valor)))
                          }
                        />
                        {i.label}
                      </label>
                    ))}
                  </div>
                </fieldset>
              )}
              <Campo
                label={
                  aberto === "aprovado" ? "Observação (opcional)" : aberto === "revisar" ? "Observação *" : "Motivo *"
                }
                htmlFor="observacao-decisao"
                erro={erro ?? undefined}
                ajuda={aberto === "revisar" ? `${tamanho} caractere(s) · mínimo de 10` : undefined}
              >
                <Textarea
                  id="observacao-decisao"
                  value={observacao}
                  onChange={(e) => setObservacao(e.target.value)}
                  rows={aberto === "revisar" ? 6 : 3}
                  autoFocus={aberto !== "aprovado"}
                  placeholder={
                    aberto === "revisar"
                      ? "Ex.: Trocar a foto por uma mais recente e encurtar o primeiro parágrafo."
                      : aberto === "reprovado"
                        ? "Por que este post não deve ir ao ar?"
                        : ""
                  }
                  aria-invalid={Boolean(erro)}
                />
              </Campo>
              <DialogFooter>
                <Button type="button" variant="secondary" onClick={() => setAberto(null)}>
                  Cancelar
                </Button>
                <Button
                  type="submit"
                  size="decisao"
                  variant={aberto === "aprovado" ? "aprovar" : aberto === "revisar" ? "revisar" : "reprovar"}
                  disabled={pendente || (aberto === "revisar" && tamanho < 10)}
                >
                  {pendente && <Loader2 className="animate-spin" />}
                  {aberto === "aprovado" ? "Confirmar aprovação" : aberto === "revisar" ? "Enviar pedido de revisão" : "Reprovar"}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        )}
      </Dialog>
    </>
  );
}
