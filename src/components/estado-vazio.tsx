import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

export function EstadoVazio({
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
        "flex flex-col items-center justify-center rounded-[10px] border border-dashed border-borda bg-white px-6 py-14 text-center",
        className,
      )}
    >
      <div className="mb-4 flex size-14 items-center justify-center rounded-2xl bg-st-aguardando-bg text-azul-medio">
        <Icone className="size-7" aria-hidden />
      </div>
      <h2 className="text-lg font-bold text-azul-escuro">{titulo}</h2>
      {descricao && <p className="mt-1 max-w-md text-sm text-texto-2">{descricao}</p>}
      {acao && <div className="mt-5">{acao}</div>}
    </div>
  );
}
