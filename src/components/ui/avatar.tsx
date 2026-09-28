import { cn, iniciais } from "@/lib/utils";

const CORES = ["#004C97", "#001F4D", "#0079C1", "#00AEEF", "#2E3A59"];

function corDoNome(nome: string) {
  let h = 0;
  for (const c of nome) h = (h * 31 + c.charCodeAt(0)) >>> 0;
  return CORES[h % CORES.length];
}

export function Avatar({
  nome,
  src,
  tamanho = 32,
  className,
}: {
  nome: string;
  src?: string | null;
  tamanho?: number;
  className?: string;
}) {
  const estilo = { width: tamanho, height: tamanho, fontSize: Math.max(10, tamanho * 0.38) };
  if (src) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={src}
        alt={nome}
        style={estilo}
        className={cn("shrink-0 rounded-full object-cover ring-2 ring-white", className)}
      />
    );
  }
  return (
    <span
      aria-label={nome}
      title={nome}
      style={{ ...estilo, backgroundColor: corDoNome(nome) }}
      className={cn(
        "inline-flex shrink-0 items-center justify-center rounded-full font-bold text-white ring-2 ring-white",
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
  if (pessoas.length === 0) return <span className="text-xs text-texto-2">—</span>;
  return (
    <div className="flex -space-x-2">
      {pessoas.slice(0, max).map((p) => (
        <Avatar key={p.nome} nome={p.nome} src={p.src} tamanho={tamanho} />
      ))}
      {pessoas.length > max && (
        <span
          className="inline-flex items-center justify-center rounded-full bg-fundo text-[10px] font-bold text-texto-2 ring-2 ring-white"
          style={{ width: tamanho, height: tamanho }}
        >
          +{pessoas.length - max}
        </span>
      )}
    </div>
  );
}
