import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

export type TomKpi = "aguardando" | "revisao" | "atrasado" | "aprovado" | "proximos" | "rascunho" | "publicado";

const TONS: Record<TomKpi, { quadrado: string; numero: string }> = {
  aguardando: { quadrado: "bg-st-aguardando-bg text-st-aguardando", numero: "text-navy-900" },
  revisao: { quadrado: "bg-st-revisao-bg text-st-revisao", numero: "text-navy-900" },
  atrasado: { quadrado: "bg-st-atrasado-bg text-st-atrasado", numero: "text-st-atrasado-text" },
  aprovado: { quadrado: "bg-st-aprovado-bg text-st-aprovado", numero: "text-navy-900" },
  proximos: { quadrado: "bg-st-proximos-bg text-st-proximos-text", numero: "text-navy-900" },
  rascunho: { quadrado: "bg-st-rascunho-bg text-st-rascunho", numero: "text-navy-900" },
  publicado: { quadrado: "bg-st-publicado-bg text-st-publicado", numero: "text-navy-900" },
};

/** KPI: ícone em quadrado colorido + número + rótulo. */
export function KpiCard({
  icone: Icone,
  rotulo,
  valor,
  tom = "aguardando",
  variante = "compact",
  className,
}: {
  icone: LucideIcon;
  rotulo: string;
  valor: React.ReactNode;
  tom?: TomKpi;
  variante?: "glass" | "compact";
  className?: string;
}) {
  const t = TONS[tom];
  return (
    <div
      className={cn(
        "flex items-center gap-3 rounded-[var(--radius-card)] p-4",
        variante === "glass" ? "surface-glass shadow-card" : "border border-border bg-surface-solid shadow-card",
        className,
      )}
    >
      <span className={cn("flex size-11 shrink-0 items-center justify-center rounded-[var(--radius-control)]", t.quadrado)}>
        <Icone className="size-5" aria-hidden />
      </span>
      <div className="min-w-0">
        <p className={cn("text-kpi", t.numero)}>{valor}</p>
        <p className="text-label text-text-muted">{rotulo}</p>
      </div>
    </div>
  );
}
