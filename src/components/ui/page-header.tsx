import { cn } from "@/lib/utils";

export function PageHeader({
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
        <h1 className="text-page-title text-navy-900">{titulo}</h1>
        {subtitulo && <p className="mt-1 text-body text-text-muted">{subtitulo}</p>}
      </div>
      {acoes && <div className="flex flex-wrap gap-2">{acoes}</div>}
    </div>
  );
}

/** Título de seção + contador rotulado + link opcional. */
export function SectionHeader({
  titulo,
  contador,
  rotuloContador,
  link,
  className,
}: {
  titulo: React.ReactNode;
  contador?: number;
  /** ex.: "posts" → "3 posts" (lido pelo leitor de tela) */
  rotuloContador?: string;
  link?: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("flex items-center justify-between gap-3", className)}>
      <div className="flex items-center gap-2">
        <h2 className="text-card-title text-navy-900">{titulo}</h2>
        {contador !== undefined && (
          <span className="rounded-full bg-st-aguardando-bg px-2 text-label font-semibold text-st-aguardando-text">
            {contador}
            {rotuloContador && <span className="sr-only"> {rotuloContador}</span>}
          </span>
        )}
      </div>
      {link && <div className="text-label font-semibold text-blue-600">{link}</div>}
    </div>
  );
}
