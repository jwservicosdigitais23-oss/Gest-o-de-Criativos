import { STATUS, type StatusVisual } from "@/lib/status";
import { cn } from "@/lib/utils";

/** Mini-cartão de contagem por status (bloco "Por perfil"). */
export function StatusTile({ status, valor, className }: { status: StatusVisual; valor: number; className?: string }) {
  const s = STATUS[status];
  return (
    <div className={cn("flex flex-col gap-1 rounded-[var(--radius-control)] px-3 py-2", s.fundo, className)}>
      <span className={cn("truncate text-label", s.texto)}>{s.rotulo}</span>
      <span className="text-card-title text-navy-900">{valor}</span>
    </div>
  );
}
