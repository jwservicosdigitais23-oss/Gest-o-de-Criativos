import { cn } from "@/lib/utils";

export function CabecalhoPagina({
  titulo,
  subtitulo,
  acoes,
  className,
}: {
  titulo: React.ReactNode;
  subtitulo?: React.ReactNode;
  acoes?: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between", className)}>
      <div className="min-w-0">
        <h1 className="text-2xl font-bold text-azul-escuro sm:text-[28px]">{titulo}</h1>
        {subtitulo && <p className="mt-1 text-sm text-texto-2">{subtitulo}</p>}
      </div>
      {acoes && <div className="flex flex-wrap gap-2">{acoes}</div>}
    </div>
  );
}
