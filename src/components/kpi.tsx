import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

export function Kpi({
  icone: Icone,
  rotulo,
  valor,
  tom = "azul",
  className,
}: {
  icone: LucideIcon;
  rotulo: string;
  valor: React.ReactNode;
  tom?: "azul" | "ambar" | "verde" | "vermelho" | "claro";
  className?: string;
}) {
  const tons = {
    azul: "bg-st-aguardando-bg text-azul-medio",
    claro: "bg-[#e0f6fd] text-[#00709a]",
    ambar: "bg-st-revisao-bg text-st-revisao",
    verde: "bg-st-aprovado-bg text-st-aprovado",
    vermelho: "bg-st-reprovado-bg text-st-reprovado",
  } as const;
  return (
    <div className={cn("flex items-center gap-4 rounded-[10px] border border-borda bg-white p-4 shadow-card", className)}>
      <span className={cn("flex size-11 shrink-0 items-center justify-center rounded-[10px]", tons[tom])}>
        <Icone className="size-5" aria-hidden />
      </span>
      <div className="min-w-0">
        <p className={cn("text-2xl font-bold leading-tight", tom === "vermelho" ? "text-vermelho" : "text-azul-escuro")}>{valor}</p>
        <p className="text-xs font-medium text-texto-2">{rotulo}</p>
      </div>
    </div>
  );
}
