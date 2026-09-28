import type { LucideIcon } from "lucide-react";
import { KpiCard, type TomKpi } from "@/components/ui/kpi-card";

const MAPA: Record<string, TomKpi> = { azul: "aguardando", claro: "proximos", ambar: "revisao", verde: "aprovado", vermelho: "atrasado" };

/** @deprecated use KpiCard (components/ui/kpi-card). */
export function Kpi(props: {
  icone: LucideIcon;
  rotulo: string;
  valor: React.ReactNode;
  tom?: "azul" | "ambar" | "verde" | "vermelho" | "claro";
  className?: string;
}) {
  return <KpiCard {...props} tom={MAPA[props.tom ?? "azul"]} />;
}
