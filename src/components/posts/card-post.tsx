import Link from "next/link";
import { AlignLeft, FileText, Film, GalleryHorizontal, Image as ImageIcon, Link2, MessageSquareText, Presentation } from "lucide-react";
import { StatusBadge } from "@/components/status-badge";
import { FORMATO_LABEL } from "@/lib/constantes";
import { formatarData, formatarHora } from "@/lib/datas";
import type { Miniatura } from "@/lib/consultas";
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
    <div className={cn("relative flex items-center justify-center overflow-hidden bg-fundo", className)}>
      {miniatura?.src ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={miniatura.src} alt="" className="size-full object-cover" loading="lazy" />
      ) : (
        <Icone className="size-7 text-texto-2" aria-hidden />
      )}
      {miniatura && miniatura.total > 1 && (
        <span className="absolute right-1.5 top-1.5 rounded-full bg-azul-escuro/80 px-1.5 text-[10px] font-bold text-white">
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
}

export function CardPost({ post }: { post: PostCardDados }) {
  const Icone = ICONE_FORMATO[post.formato];
  return (
    <Link
      href={`/posts/${post.id}`}
      className="group block overflow-hidden rounded-[10px] border border-borda bg-white shadow-card transition hover:border-azul-claro hover:shadow-md"
    >
      <Thumb miniatura={post.miniatura} formato={post.formato} className="aspect-[16/10]" />
      <div className="flex flex-col gap-2 p-3">
        <p className="text-xs font-semibold text-texto-2">
          {formatarData(post.data_publicacao)}
          {post.hora_publicacao && ` · ${formatarHora(post.hora_publicacao)}`}
          {post.perfilNome && ` · ${post.perfilNome}`}
        </p>
        <p className="line-clamp-2 text-sm font-bold text-azul-escuro group-hover:text-azul-medio">{post.tema}</p>
        <div className="flex flex-wrap items-center gap-2">
          <StatusBadge status={post.status} />
        </div>
        <div className="flex items-center gap-3 text-xs text-texto-2">
          <span className="inline-flex items-center gap-1" title={FORMATO_LABEL[post.formato]}>
            <Icone className="size-3.5" aria-hidden /> {FORMATO_LABEL[post.formato]}
          </span>
          <span className="font-semibold">v{post.versao}</span>
          {post.observacoes > 0 && (
            <span className="inline-flex items-center gap-1" title="Observações">
              <MessageSquareText className="size-3.5" aria-hidden /> {post.observacoes}
            </span>
          )}
          {post.extra}
        </div>
      </div>
    </Link>
  );
}

export function LinhaPost({ post }: { post: PostCardDados }) {
  const Icone = ICONE_FORMATO[post.formato];
  return (
    <Link
      href={`/posts/${post.id}`}
      className="flex items-center gap-3 border-t border-borda px-3 py-3 first:border-t-0 hover:bg-fundo sm:px-4"
    >
      <Thumb miniatura={post.miniatura} formato={post.formato} className="size-14 shrink-0 rounded-md" />
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-bold text-azul-escuro">{post.tema}</p>
        <p className="mt-0.5 flex flex-wrap items-center gap-x-2 text-xs text-texto-2">
          <span>
            {formatarData(post.data_publicacao)}
            {post.hora_publicacao && ` · ${formatarHora(post.hora_publicacao)}`}
          </span>
          {post.perfilNome && <span>{post.perfilNome}</span>}
          <span className="inline-flex items-center gap-1">
            <Icone className="size-3.5" aria-hidden /> {FORMATO_LABEL[post.formato]}
          </span>
          <span className="font-semibold">v{post.versao}</span>
          {post.observacoes > 0 && (
            <span className="inline-flex items-center gap-1">
              <MessageSquareText className="size-3.5" aria-hidden /> {post.observacoes}
            </span>
          )}
          {post.extra}
        </p>
      </div>
      <StatusBadge status={post.status} className="hidden sm:inline-flex" />
    </Link>
  );
}
