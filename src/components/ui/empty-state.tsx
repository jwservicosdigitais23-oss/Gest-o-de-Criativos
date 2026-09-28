import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

export function EmptyState({
  icone: Icone,
  titulo,
  descricao,
  acao,
  className,
}: {
  icone: LucideIcon;
  titulo: string;
  descricao?: React.ReactNode;
  acao?: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "surface-glass flex flex-col items-center justify-center rounded-[var(--radius-card)] border-dashed px-6 py-14 text-center",
        className,
      )}
    >
      <div className="mb-4 flex size-14 items-center justify-center rounded-[var(--radius-card)] bg-st-aguardando-bg text-blue-600">
        <Icone className="size-7" aria-hidden />
      </div>
      <h2 className="text-card-title text-navy-900">{titulo}</h2>
      {descricao && <p className="mt-1 max-w-md text-body text-text-muted">{descricao}</p>}
      {acao && <div className="mt-5">{acao}</div>}
    </div>
  );
}
