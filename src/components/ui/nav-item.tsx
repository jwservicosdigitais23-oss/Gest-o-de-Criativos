import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

/** Item da sidebar escura: ícone, rótulo, contador e estado ativo. */
export function NavItem({
  href,
  icone: Icone,
  prefixo,
  rotulo,
  contador,
  ativo = false,
}: {
  href: string;
  icone?: LucideIcon;
  /** alternativa ao ícone (ex.: avatar do perfil) */
  prefixo?: React.ReactNode;
  rotulo: string;
  contador?: number;
  ativo?: boolean;
}) {
  return (
    <Link
      href={href}
      aria-current={ativo ? "page" : undefined}
      className={cn(
        "transicao relative flex min-h-10 items-center gap-3 rounded-[var(--radius-control)] px-3 py-2 text-body font-medium",
        ativo ? "bg-white/10 text-cyan-400" : "text-white/80 hover:bg-white/5 hover:text-white",
      )}
    >
      {ativo && <span className="absolute inset-y-1.5 -left-3 w-1 rounded-r bg-cyan-400" aria-hidden />}
      {Icone && <Icone className="size-5 shrink-0" aria-hidden />}
      {prefixo}
      <span className="flex-1 truncate">{rotulo}</span>
      {contador !== undefined && contador > 0 && (
        <span className="rounded-full bg-cyan-400 px-1.5 text-label font-bold text-navy-900" aria-label={`${contador} pendentes`}>
          {contador}
        </span>
      )}
    </Link>
  );
}
