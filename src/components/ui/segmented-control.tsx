"use client";

import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

export interface OpcaoSegmento<T extends string> {
  valor: T;
  rotulo: string;
  icone?: LucideIcon;
}

/** Alternância entre opções (ex.: Kanban/Lista, Mês/Semana). */
export function SegmentedControl<T extends string>({
  opcoes,
  valor,
  onChange,
  rotulo,
  className,
}: {
  opcoes: OpcaoSegmento<T>[];
  valor: T;
  onChange: (v: T) => void;
  rotulo: string;
  className?: string;
}) {
  return (
    <div role="radiogroup" aria-label={rotulo} className={cn("inline-flex gap-1 rounded-[var(--radius-control)] border border-border bg-surface-solid p-1", className)}>
      {opcoes.map(({ valor: v, rotulo: r, icone: Icone }) => {
        const ativo = v === valor;
        return (
          <button
            key={v}
            type="button"
            role="radio"
            aria-checked={ativo}
            onClick={() => onChange(v)}
            className={cn(
              "transicao inline-flex h-8 items-center gap-2 rounded-[calc(var(--radius-control)-4px)] px-3 text-body font-semibold",
              ativo ? "bg-gradiente-primario text-white" : "text-text-muted hover:text-navy-900",
            )}
          >
            {Icone && <Icone className="size-4" aria-hidden />}
            {r}
          </button>
        );
      })}
    </div>
  );
}
