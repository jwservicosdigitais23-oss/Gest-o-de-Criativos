import { useId } from "react";
import { cn } from "@/lib/utils";

/**
 * Logo do Grupo Adere no estilo das referências: o "A" é um triângulo com o
 * gradiente da marca, seguido de "DERE" e "Gestão de Negócios".
 * Quando o arquivo oficial for enviado (public/logo-adere.svg), troque aqui.
 */
export function Logo({
  variante = "cor",
  tamanho = "md",
  className,
}: {
  variante?: "cor" | "branco";
  tamanho?: "sm" | "md" | "lg";
  className?: string;
}) {
  const id = useId();
  const branco = variante === "branco";
  const altura = { sm: 22, md: 28, lg: 36 }[tamanho];
  return (
    <div className={cn("flex min-w-[150px] flex-col leading-none", className)} aria-label="Adere · Gestão de Negócios" role="img">
      <div className="flex items-end" style={{ height: altura }}>
        <svg viewBox="0 0 32 28" style={{ height: altura, width: altura * (32 / 28) }} aria-hidden>
          <defs>
            <linearGradient id={`${id}-g`} x1="0" y1="1" x2="1" y2="0">
              <stop offset="0%" stopColor={branco ? "#ffffff" : "var(--color-blue-600)"} />
              <stop offset="100%" stopColor="var(--color-cyan-400)" />
            </linearGradient>
          </defs>
          <path d="M16 1 L31 27 H1 Z" fill={`url(#${id}-g)`} />
          <path d="M16 11 L23.5 24 H8.5 Z" fill={branco ? "var(--color-navy-900)" : "var(--color-surface-solid)"} />
        </svg>
        <span
          className={cn("font-bold uppercase leading-none tracking-[0.14em]", branco ? "text-white" : "text-navy-900")}
          style={{ fontSize: altura * 0.95, marginLeft: -altura * 0.04 }}
        >
          Dere
        </span>
      </div>
      <span className={cn("mt-1.5 text-xs tracking-[0.02em]", branco ? "text-white/80" : "text-text")}>Gestão de Negócios</span>
    </div>
  );
}
