import { Check, Circle } from "lucide-react";
import { forcaSenha, regrasSenha } from "@/lib/senha";
import { cn } from "@/lib/utils";

const CORES = ["bg-border", "bg-danger", "bg-st-revisao", "bg-blue-500", "bg-st-aprovado"];

/** Barra de força + regras visíveis, atualizadas enquanto a pessoa digita. */
export function RegrasSenha({ senha, className, claro = false }: { senha: string; className?: string; claro?: boolean }) {
  const forca = forcaSenha(senha);
  return (
    <div className={cn("flex flex-col gap-2", className)}>
      <div className="flex items-center gap-3">
        <div className="grid flex-1 grid-cols-4 gap-1" aria-hidden>
          {[1, 2, 3, 4].map((i) => (
            <span key={i} className={cn("transicao h-1.5 rounded-full", i <= forca.nivel ? CORES[forca.nivel] : claro ? "bg-white/25" : "bg-border")} />
          ))}
        </div>
        <span className={cn("w-16 text-right text-label font-semibold", claro ? "text-white/90" : "text-text-muted")} aria-live="polite">
          {forca.rotulo}
        </span>
      </div>
      <ul className="flex flex-col gap-1">
        {regrasSenha(senha).map((r) => (
          <li
            key={r.id}
            className={cn(
              "transicao flex items-center gap-2 text-label",
              r.ok ? (claro ? "text-white" : "text-st-aprovado-text") : claro ? "text-white/70" : "text-text-muted",
            )}
          >
            {r.ok ? <Check className="size-3.5" aria-hidden /> : <Circle className="size-3" aria-hidden />}
            {r.rotulo}
            <span className="sr-only">{r.ok ? "(ok)" : "(pendente)"}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
