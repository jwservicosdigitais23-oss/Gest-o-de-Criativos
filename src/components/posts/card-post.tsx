import Link from "next/link";
import { AlignLeft, FileText, Film, GalleryHorizontal, Image as ImageIcon, Link2, MessageSquareText, Presentation } from "lucide-react";
import { StatusPill } from "@/components/ui/status-pill";
import { FORMATO_LABEL } from "@/lib/constantes";
import { formatarData, formatarHora } from "@/lib/datas";
import type { Miniatura } from "@/lib/consultas";
import { STATUS, type StatusVisual } from "@/lib/status";
import type { Formato, Post } from "@/lib/types";
import { cn } from "@/lib/utils";

export const ICONE_FORMATO: Record<Formato, typeof ImageIcon> = {
  imagem: ImageIcon,
  carrossel: GalleryHorizontal,
  video: Film,
  texto: AlignLeft,
  documento: Presentation,
};

function Thumb({ miniatura, formato, className }: { miniatura?: Miniatura; formato: Formato; className?: string }) {
  const Icone = miniatura?.tipo === "pdf" ? FileText : miniatura?.tipo === "link" ? Link2 : ICONE_FORMATO[formato];
  return (
    <div className={cn("relative flex items-center justify-center overflow-hidden bg-bg-app-to", className)}>
      {miniatura?.src ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={miniatura.src} alt="" className="size-full object-cover" loading="lazy" />
      ) : (
        <Icone className="size-7 text-text-muted" aria-hidden />
      )}
      {miniatura && miniatura.total > 1 && (
        <span className="absolute right-2 top-2 rounded-full bg-navy-900/80 px-2 text-label font-bold text-white">
          +{miniatura.total - 1}
        </span>
      )}
    </div>
  );
}

export interface PostCardDados extends Pick<Post, "id" | "tema" | "status" | "formato" | "data_publicacao" | "hora_publicacao" | "versao"> {
  miniatura?: Miniatura;
  observacoes: number;
  perfilNome?: string;
  extra?: React.ReactNode;
  /** status visual (ex.: atrasado); padrão = status do post */
  statusVisual?: StatusVisual;
  /** Quem aprovou/reprovou a versão atual ("Aprovado por …") */
  decididoPor?: string | null;
}

function Rodape({ post }: { post: PostCardDados }) {
  const Icone = ICONE_FORMATO[post.formato];
  return (
    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-label text-text-muted">
      <span className="inline-flex items-center gap-1" title={FORMATO_LABEL[post.formato]}>
        <Icone className="size-3.5" aria-hidden /> {FORMATO_LABEL[post.formato]}
      </span>
      <span className="font-semibold">v{post.versao}</span>
      {post.observacoes > 0 && (
        <span className="inline-flex items-center gap-1" title={`${post.observacoes} observação(ões)`}>
          <MessageSquareText className="size-3.5" aria-hidden /> {post.observacoes}
        </span>
      )}
      {post.extra}
    </div>
  );
}

/** Cartão do Kanban: miniatura, data · hora, tema, selo, formato e versão. */
export function CardPost({ post }: { post: PostCardDados }) {
  return (
    <Link
      href={`/posts/${post.id}`}
      className="transicao group block overflow-hidden rounded-[var(--radius-control)] border border-border bg-surface-solid shadow-card hover:-translate-y-0.5 hover:border-blue-600/40 hover:shadow-elevated"
    >
      <Thumb miniatura={post.miniatura} formato={post.formato} className="aspect-[16/10]" />
      <div className="flex flex-col gap-2 p-3">
        <p className="text-label font-semibold text-text-muted">
          {formatarData(post.data_publicacao)}
          {post.hora_publicacao && ` · ${formatarHora(post.hora_publicacao)}`}
          {post.perfilNome && ` · ${post.perfilNome}`}
        </p>
        <p className="line-clamp-2 text-body font-bold text-navy-900 group-hover:text-blue-600">{post.tema}</p>
        <StatusPill status={post.statusVisual ?? post.status} por={post.decididoPor} className="self-start whitespace-normal" />
        <Rodape post={post} />
      </div>
    </Link>
  );
}

/** Linha da visão Lista (e do celular). */
export function LinhaPost({ post }: { post: PostCardDados }) {
  return (
    <Link
      href={`/posts/${post.id}`}
      className="transicao flex items-center gap-3 border-t border-border px-3 py-3 first:border-t-0 hover:bg-bg-app-from sm:px-4"
    >
      <Thumb miniatura={post.miniatura} formato={post.formato} className="size-14 shrink-0 rounded-[var(--radius-control)]" />
      <div className="flex min-w-0 flex-1 flex-col gap-1">
        <p className="truncate text-body font-bold text-navy-900">{post.tema}</p>
        <p className="text-label text-text-muted">
          {formatarData(post.data_publicacao)}
          {post.hora_publicacao && ` · ${formatarHora(post.hora_publicacao)}`}
          {post.perfilNome && ` · ${post.perfilNome}`}
        </p>
        <div className="sm:hidden">
          <StatusPill status={post.statusVisual ?? post.status} por={post.decididoPor} />
        </div>
        <Rodape post={post} />
      </div>
      <StatusPill status={post.statusVisual ?? post.status} por={post.decididoPor} className="hidden sm:inline-flex" />
    </Link>
  );
}

/** Coluna do Kanban (vidro), com rótulo do status e contagem. */
export function ColunaKanban({ status, posts }: { status: StatusVisual; posts: PostCardDados[] }) {
  const s = STATUS[status];
  const Icone = s.icone;
  return (
    <section className="surface-glass flex w-72 shrink-0 flex-col gap-3 rounded-[var(--radius-card)] p-3 shadow-card" aria-label={`${s.rotulo}: ${posts.length}`}>
      <header className="flex items-center justify-between gap-2 px-1">
        <span className={cn("inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-label font-semibold", s.texto, s.fundo)}>
          <Icone className={cn("size-3.5", s.corIcone)} aria-hidden /> {s.rotulo}
        </span>
        <span className="min-w-6 rounded-full bg-surface-solid px-2 text-center text-label font-bold text-navy-900">{posts.length}</span>
      </header>
      {posts.map((p) => (
        <CardPost key={p.id} post={p} />
      ))}
      {posts.length === 0 && <p className="px-1 py-10 text-center text-label text-text-muted">Nada aqui.</p>}
    </section>
  );
}
