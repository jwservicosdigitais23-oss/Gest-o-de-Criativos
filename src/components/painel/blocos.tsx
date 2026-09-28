import Image from "next/image";
import Link from "next/link";
import { ArrowRight, CalendarDays, FileText, PenLine } from "lucide-react";
import { Avatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { GlassCard } from "@/components/ui/card";
import { SectionHeader } from "@/components/ui/page-header";
import { StatusPill } from "@/components/ui/status-pill";
import { StatusTile } from "@/components/ui/status-tile";
import { formatarDiaCurto, formatarHora } from "@/lib/datas";
import type { StatusVisual } from "@/lib/status";
import type { StatusPost } from "@/lib/types";
import { cn, trecho } from "@/lib/utils";

/** Banner do topo do painel: saudação + KPIs de vidro sobre a arte da marca. */
export function BannerPainel({
  titulo,
  subtitulo,
  children,
}: {
  titulo: string;
  subtitulo: string;
  children?: React.ReactNode;
}) {
  return (
    <section className="relative isolate overflow-hidden rounded-[var(--radius-card)] shadow-card">
      <Image
        src="/imagens/banner-painel.webp"
        alt=""
        fill
        priority
        sizes="(min-width: 1024px) 80vw, 100vw"
        className="-z-20 object-cover object-right"
      />
      {/* Véu claro à esquerda: garante leitura do título sobre a arte */}
      <div
        className="absolute inset-0 -z-10 bg-[linear-gradient(90deg,rgb(255_255_255/0.9)_0%,rgb(255_255_255/0.6)_45%,rgb(255_255_255/0)_75%)] max-sm:bg-[linear-gradient(180deg,rgb(255_255_255/0.92)_0%,rgb(255_255_255/0.7)_100%)]"
        aria-hidden
      />
      <div className="px-5 pb-5 pt-7 sm:px-8 sm:pt-9">
        <h1 className="text-page-title text-navy-900">{titulo}</h1>
        <p className="mt-1 text-body text-text">{subtitulo}</p>
        {children && <div className="mt-6 sm:mt-10">{children}</div>}
      </div>
    </section>
  );
}

export interface ItemRevisao {
  id: string;
  tema: string;
  perfil: string;
  versao: number;
  observacao: string | null;
}

export function BlocoPrecisaAcao({ itens }: { itens: ItemRevisao[] }) {
  return (
    <GlassCard className="flex min-w-0 flex-col gap-4 p-5">
      <SectionHeader titulo="Precisa da sua ação" contador={itens.length} rotuloContador="posts em revisão" />
      {itens.length === 0 ? (
        <div className="flex flex-1 flex-col items-center justify-center gap-2 py-8 text-center">
          <span className="flex size-12 items-center justify-center rounded-[var(--radius-control)] bg-st-aguardando-bg text-blue-600">
            <FileText className="size-6" aria-hidden />
          </span>
          <p className="text-body font-semibold text-navy-900">Nenhum post em revisão. 🎉</p>
          <p className="text-label text-text-muted">Tudo em dia por aqui!</p>
        </div>
      ) : (
        <ul className="flex flex-col gap-3">
          {itens.map((p) => (
            <li key={p.id} className="flex flex-col gap-3 rounded-[var(--radius-control)] border border-st-revisao/30 bg-st-revisao-bg/60 p-3 sm:flex-row sm:items-center">
              <div className="min-w-0 flex-1">
                <p className="truncate text-body font-bold text-navy-900">{p.tema}</p>
                <p className="text-label text-text-muted">
                  {p.perfil} · v{p.versao}
                </p>
                {p.observacao && <p className="mt-1 line-clamp-2 text-body text-st-revisao-text">“{trecho(p.observacao, 160)}”</p>}
              </div>
              <Button asChild size="sm" variant="revisar">
                <Link href={`/posts/${p.id}/editar`}>
                  <PenLine /> Ajustar
                </Link>
              </Button>
            </li>
          ))}
        </ul>
      )}
    </GlassCard>
  );
}

export interface ItemProximo {
  id: string;
  tema: string;
  perfil: string;
  data: string;
  hora: string | null;
  status: StatusPost;
  urgente: boolean;
}

export function BlocoProximos({ dias, hoje }: { dias: [string, ItemProximo[]][]; hoje: string }) {
  return (
    <GlassCard className="flex min-w-0 flex-col gap-4 p-5">
      <SectionHeader
        titulo="Próximos 7 dias"
        link={
          <Link href="/calendario" className="inline-flex items-center gap-1 hover:underline">
            Ver calendário <ArrowRight className="size-3.5" aria-hidden />
          </Link>
        }
      />
      {dias.length === 0 ? (
        <div className="flex flex-1 flex-col items-center justify-center gap-2 py-8 text-center">
          <span className="flex size-12 items-center justify-center rounded-[var(--radius-control)] bg-st-proximos-bg text-st-proximos-text">
            <CalendarDays className="size-6" aria-hidden />
          </span>
          <p className="text-body font-semibold text-navy-900">Nada programado para esta semana.</p>
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          {dias.map(([dia, lista]) => (
            <div key={dia}>
              <p className="rotulo mb-2 text-text-muted">
                {dia === hoje ? "Hoje" : formatarDiaCurto(dia)}
              </p>
              <ul className="flex flex-col gap-2">
                {lista.map((p) => (
                  <li key={p.id}>
                    <Link
                      href={`/posts/${p.id}`}
                      className={cn(
                        "transicao flex items-center gap-3 rounded-[var(--radius-control)] border bg-surface-solid px-3 py-2.5 hover:border-blue-600/40 hover:shadow-card",
                        p.urgente ? "border-st-atrasado/40 bg-st-atrasado-bg/50" : "border-border",
                      )}
                    >
                      <span className="flex h-10 w-12 shrink-0 items-center justify-center rounded-[var(--radius-control)] bg-bg-app-from text-label font-bold text-navy-900">
                        {formatarHora(p.hora) || "—"}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-body font-semibold text-navy-900">{p.tema}</span>
                        <span className="block truncate text-label text-text-muted">
                          {p.perfil}
                          {p.urgente && <strong className="text-st-atrasado-text"> · vai ao ar em até 24h sem aprovação</strong>}
                        </span>
                      </span>
                      <StatusPill status={p.status} className="hidden sm:inline-flex" />
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      )}
    </GlassCard>
  );
}

export interface ResumoPerfil {
  id: string;
  nome: string;
  tipo: string;
  avatarSrc: string | null;
  contagens: Record<"rascunho" | "aguardando" | "em_revisao" | "aprovado" | "publicado" | "reprovado", number>;
}

const TILES: StatusVisual[] = ["rascunho", "aguardando", "em_revisao", "aprovado", "publicado", "reprovado"];

export function CartaoPerfil({ perfil }: { perfil: ResumoPerfil }) {
  return (
    <GlassCard className="flex min-w-0 flex-col gap-4 p-5">
      <div className="flex items-center gap-3">
        <Avatar nome={perfil.nome} src={perfil.avatarSrc} size="lg" />
        <div className="min-w-0">
          <p className="truncate text-card-title text-navy-900">{perfil.nome}</p>
          <p className="text-label text-text-muted">{perfil.tipo === "empresa" ? "Institucional" : "Pessoal"}</p>
        </div>
      </div>
      <div className="grid grid-cols-3 gap-2">
        {TILES.map((s) => (
          <StatusTile key={s} status={s} valor={perfil.contagens[s as keyof ResumoPerfil["contagens"]]} />
        ))}
      </div>
      <Button asChild variant="secondary" size="sm" className="self-center">
        <Link href={`/perfis/${perfil.id}`}>
          Ver posts <ArrowRight />
        </Link>
      </Button>
    </GlassCard>
  );
}
