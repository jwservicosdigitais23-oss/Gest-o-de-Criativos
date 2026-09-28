import { cn, iniciais } from "@/lib/utils";

/** Cores de avatar derivadas da marca (texto branco, contraste AA). */
const CORES = ["bg-blue-600", "bg-navy-900", "bg-st-proximos-text", "bg-st-aprovado-text", "bg-st-revisao-text", "bg-navy-700"];

/** Cor estável por perfil/pessoa (mesmo nome → mesma cor). */
export function corDoNome(nome: string) {
  let h = 0;
  for (const c of nome) h = (h * 31 + c.charCodeAt(0)) >>> 0;
  return CORES[h % CORES.length]!;
}

const TAMANHOS = { sm: 24, md: 32, lg: 48 } as const;

export function Avatar({
  nome,
  src,
  size,
  tamanho,
  className,
}: {
  nome: string;
  src?: string | null;
  size?: keyof typeof TAMANHOS;
  /** tamanho em px (v1) */
  tamanho?: number;
  className?: string;
}) {
  const px = size ? TAMANHOS[size] : (tamanho ?? 32);
  const estilo = { width: px, height: px, fontSize: Math.max(12, Math.round(px * 0.38)) };
  if (src) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img src={src} alt={nome} style={estilo} className={cn("shrink-0 rounded-full object-cover ring-2 ring-surface-solid", className)} />
    );
  }
  return (
    <span
      role="img"
      aria-label={nome}
      title={nome}
      style={estilo}
      className={cn(
        "inline-flex shrink-0 items-center justify-center rounded-full font-bold leading-none text-white ring-2 ring-surface-solid",
        corDoNome(nome),
        className,
      )}
    >
      {iniciais(nome)}
    </span>
  );
}

export function PilhaAvatares({
  pessoas,
  tamanho = 26,
  max = 4,
}: {
  pessoas: { nome: string; src?: string | null }[];
  tamanho?: number;
  max?: number;
}) {
  if (pessoas.length === 0) return <span className="text-label text-text-muted">—</span>;
  return (
    <div className="flex -space-x-2">
      {pessoas.slice(0, max).map((p) => (
        <Avatar key={p.nome} nome={p.nome} src={p.src} tamanho={tamanho} />
      ))}
      {pessoas.length > max && (
        <span
          className="inline-flex items-center justify-center rounded-full bg-bg-app-to text-label font-bold text-text-muted ring-2 ring-surface-solid"
          style={{ width: tamanho, height: tamanho }}
        >
          +{pessoas.length - max}
        </span>
      )}
    </div>
  );
}
