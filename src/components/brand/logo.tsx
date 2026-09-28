import { cn } from "@/lib/utils";

/**
 * Logo do Grupo Adere. Enquanto o arquivo oficial (public/logo-adere.svg) não
 * for enviado, usa o texto "ADERE" + "Gestão de Negócios" (Montserrat).
 */
export function Logo({
  variante = "cor",
  className,
}: {
  variante?: "cor" | "branco";
  className?: string;
}) {
  const branco = variante === "branco";
  return (
    <div className={cn("flex min-w-[150px] flex-col leading-none", className)} aria-label="Adere · Gestão de Negócios">
      <span
        className={cn(
          "text-2xl font-bold uppercase tracking-[0.18em]",
          branco ? "text-white" : "text-azul-escuro",
        )}
      >
        Adere
      </span>
      <span
        className={cn(
          "mt-1 text-xs font-normal tracking-[0.04em]",
          branco ? "text-white/80" : "text-texto",
        )}
      >
        Gestão de Negócios
      </span>
    </div>
  );
}
