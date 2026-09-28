import { STATUS, type StatusVisual } from "@/lib/status";
import { cn } from "@/lib/utils";

/** Selo de status (pílula) com ícone — cores do mapa único em lib/status.ts. */
export function StatusPill({
  status,
  semIcone = false,
  className,
}: {
  status: StatusVisual;
  semIcone?: boolean;
  className?: string;
}) {
  const s = STATUS[status];
  const Icone = s.icone;
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 whitespace-nowrap rounded-full px-2.5 py-0.5 text-label font-semibold",
        s.texto,
        s.fundo,
        className,
      )}
    >
      {!semIcone && <Icone className={cn("size-3.5 shrink-0", s.corIcone)} aria-hidden />}
      {s.rotulo}
    </span>
  );
}
